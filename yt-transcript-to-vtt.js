import fetch from "node-fetch";
import moment from "moment";
import { ms2likeISOFormat } from "./utils/time.js";

// non-atob base64 encoder from https://gist.github.com/jonleighton/958841
const toBase64 = (arrayBuffer) => {
  var base64 = "";
  var encodings =
    "ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789+/";

  var bytes = new Uint8Array(arrayBuffer);
  var byteLength = bytes.byteLength;
  var byteRemainder = byteLength % 3;
  var mainLength = byteLength - byteRemainder;

  var a, b, c, d;
  var chunk;

  // Main loop deals with bytes in chunks of 3
  for (var i = 0; i < mainLength; i = i + 3) {
    // Combine the three bytes into a single integer
    chunk = (bytes[i] << 16) | (bytes[i + 1] << 8) | bytes[i + 2];

    // Use bitmasks to extract 6-bit segments from the triplet
    a = (chunk & 16515072) >> 18; // 16515072 = (2^6 - 1) << 18
    b = (chunk & 258048) >> 12; // 258048   = (2^6 - 1) << 12
    c = (chunk & 4032) >> 6; // 4032     = (2^6 - 1) << 6
    d = chunk & 63; // 63       = 2^6 - 1

    // Convert the raw binary segments to the appropriate ASCII encoding
    base64 += encodings[a] + encodings[b] + encodings[c] + encodings[d];
  }

  // Deal with the remaining bytes and padding
  if (byteRemainder == 1) {
    chunk = bytes[mainLength];

    a = (chunk & 252) >> 2; // 252 = (2^6 - 1) << 2

    // Set the 4 least significant bits to zero
    b = (chunk & 3) << 4; // 3   = 2^2 - 1

    base64 += encodings[a] + encodings[b] + "==";
  } else if (byteRemainder == 2) {
    chunk = (bytes[mainLength] << 8) | bytes[mainLength + 1];

    a = (chunk & 64512) >> 10; // 64512 = (2^6 - 1) << 10
    b = (chunk & 1008) >> 4; // 1008  = (2^6 - 1) << 4

    // Set the 2 least significant bits to zero
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
        0x0a,
        sub_type.length,
        ...encoder.encode(sub_type),
        0x12,
        lang.length,
        ...encoder.encode(lang),
        0x1a,
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
        params: params,
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
  return captions
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
    .filter(({ text }) => text !== "[Music]");
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
