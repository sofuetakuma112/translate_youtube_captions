import fetch from "node-fetch";
import moment from "moment";
import { ms2likeISOFormat } from "./utils/time.js";
import 'dotenv/config';

// non-atob base64 encoder from https://gist.github.com/jonleighton/958841
const toBase64 = (arrayBuffer) => {
  // arrayBufferはUint8Array(型付(0 ~ 255)の整数の配列)
  var base64 = "";
  var encodings =
    "ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789+/";

  var bytes = new Uint8Array(arrayBuffer); // バイナリを8bit毎にわける(バイト列？？)、Uint8Array は型付き配列で、 8 ビット符号なし整数値の配列を表す
  var byteLength = bytes.byteLength;
  var byteRemainder = byteLength % 3;
  var mainLength = byteLength - byteRemainder;

  var a, b, c, d;
  var chunk;

  // メインループはバイト(= 8bit)を3つのチャンクで処理する
  for (var i = 0; i < mainLength; i = i + 3) {
    // 3バイトを1つの整数にまとめる
    chunk = (bytes[i] << 16) | (bytes[i + 1] << 8) | bytes[i + 2];

    // ビットマスクを用いてトリプレットから6ビットセグメントを抽出する
    a = (chunk & 16515072) >> 18; // 16515072 = (2^6 - 1) << 18
    b = (chunk & 258048) >> 12; // 258048   = (2^6 - 1) << 12
    c = (chunk & 4032) >> 6; // 4032     = (2^6 - 1) << 6
    d = chunk & 63; // 63       = 2^6 - 1

    // 生のバイナリセグメントを適切なASCIIエンコーディングに変換する。
    base64 += encodings[a] + encodings[b] + encodings[c] + encodings[d];
  }

  // 残りのバイトとパディングを処理する
  if (byteRemainder == 1) {
    chunk = bytes[mainLength];

    a = (chunk & 252) >> 2; // 252 = (2^6 - 1) << 2

    // 最下位4ビットを0にする
    b = (chunk & 3) << 4; // 3   = 2^2 - 1

    base64 += encodings[a] + encodings[b] + "==";
  } else if (byteRemainder == 2) {
    chunk = (bytes[mainLength] << 8) | bytes[mainLength + 1];

    a = (chunk & 64512) >> 10; // 64512 = (2^6 - 1) << 10
    b = (chunk & 1008) >> 4; // 1008  = (2^6 - 1) << 4

    // 最下位2ビットを0にする
    c = (chunk & 15) << 2; // 15    = 2^4 - 1

    base64 += encodings[a] + encodings[b] + encodings[c] + "=";
  }

  return base64;
};

const encoder = new TextEncoder();
export const generateLangParams = (lang, sub_type = "", sub_variant = "") => {
  return encodeURIComponent(
    toBase64(
      new Uint8Array([
        0x0a, // LF（改行）
        sub_type.length,
        ...encoder.encode(sub_type),
        0x12, // DC2（装置制御２）
        lang.length,
        ...encoder.encode(lang),
        0x1a, // SUB（置換）
        sub_variant.length,
        ...encoder.encode(sub_variant),
      ])
    )
  );
};
export const generateTranscriptParams = (video_id, lang_params) => {
  return typeof lang_params === "undefined"
    ? encodeURIComponent(
        toBase64(new Uint8Array([0x0a, 0x0b, ...encoder.encode(video_id)]))
      )
    : encodeURIComponent(
        toBase64(
          new Uint8Array([
            0x0a,
            0x0b,
            ...encoder.encode(video_id),
            0x12,
            lang_params.length,
            ...encoder.encode(lang_params),
          ])
        )
      );
};
export const fetchTranscription = (params) => {
  return fetch(
    "https://www.youtube.com/youtubei/v1/get_transcript?key=AIzaSyAO_FJ2SlqU8Q4STEHLGCilw_Y9_11qcW8",
    {
      method: "POST",
      body: JSON.stringify({
        context: {
          client: {
            hl: "en",
            gl: "US",
            clientName: "WEB",
            clientVersion: "2.20210101",
          },
        },
        params: params, // videoId, lang, sub_type等を 文字列 => UTF-8 バイト => base64 => URLエンコード文字列のフローで変換したもの
      }),
    }
  ).then((res) => res.json());
};
export const videoTranscriptionToJson = async (transcript_json, videoId) => {
  const transcript_renderer = transcript_json.actions.find(
    (action) =>
      action.updateEngagementPanelAction?.targetId ===
      "engagement-panel-transcript"
  ).updateEngagementPanelAction.content.transcriptRenderer;
  const transcript_cue_groups =
    transcript_renderer.body.transcriptBodyRenderer.cueGroups;
  const captions = [];
  transcript_cue_groups.forEach((cue_group) => {
    cue_group.transcriptCueGroupRenderer.cues.forEach((cue) => {
      const cue_renderer = cue.transcriptCueRenderer;
      const start_ts = parseInt(cue_renderer.startOffsetMs); // [ms]
      const end_ts = start_ts + parseInt(cue_renderer.durationMs);
      const text = cue_renderer.cue.simpleText;
      if (!text) return; // Hacky fix for hidden transcripts with mismatched timestamps
      captions.push({
        from: ms2likeISOFormat(start_ts),
        to: ms2likeISOFormat(end_ts),
        text: text.trim(), // 稀に謎の空白がテキストの先頭に入るのでtrimする
      });
    });
  });
  // 動画の長さを取得する
  const data = await fetch(
    `https://www.googleapis.com/youtube/v3/videos?id=${videoId}&key=${process.env.YOUTUBE_DATA_API_KEY}&part=contentDetails`
  ).then((res) => res.json());
  const d = moment.duration(data.items[0].contentDetails.duration);
  const videoDuration_ms = d.asMilliseconds();
  return (
    captions
      .map((caption, i) => {
        if (captions.length - 1 === i) {
          return {
            ...caption,
            to: ms2likeISOFormat(videoDuration_ms),
          };
        }
        return {
          ...caption,
          to: captions[i + 1].from,
        };
      })
      // [Music]を除外する
      .filter(({ text }) => text !== "[Music]")
  );
};
const listTranscriptionLanguageContinuations = (transcript_json) => {
  const transcript_renderer = transcript_json.actions.find(
    (action) =>
      action.updateEngagementPanelAction?.targetId ===
      "engagement-panel-transcript"
  ).updateEngagementPanelAction.content.transcriptRenderer;
  const transcript_langs =
    transcript_renderer.footer.transcriptFooterRenderer.languageMenu
      .sortFilterSubMenuRenderer.subMenuItems;
  const returned_langs = {};
  for (const lang of transcript_langs) {
    returned_langs[lang.title] =
      lang.continuation.reloadContinuationData.continuation;
  }
  return returned_langs;
};

// Examples
// デフォルトの言語トランスクリプションを取得
// fetchTranscription(generateTranscriptParams("oImkbkxytn8")).then((res) =>
//   console.log(videoTranscriptionToVtt(res))
// );

// リストされた各言語の継続パラメータをリストアップします。
// fetchTranscription(generateTranscriptParams("qY1IFnjM8-Y")).then((res) =>
//   console.log(listTranscriptionLanguageContinuations(res))
// );

// さまざまな言語バリエーションに対応するトランスクリプションを取得
// fetchTranscription(
//   generateTranscriptParams("qY1IFnjM8-Y", generateLangParams("id"))
// ).then((res) => console.log(videoTranscriptionToVtt(res)));
// fetchTranscription(
//   generateTranscriptParams(
//     "qY1IFnjM8-Y",
//     generateLangParams("id", "", "BAHASA MANADO")
//   )
// ).then((res) => console.log(videoTranscriptionToVtt(res)));
