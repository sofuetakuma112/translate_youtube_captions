import fs from "fs";
import axios from "axios";
import { getCaptionByVideoId } from "../getYoutubeCaptionByScraping.js";
import { sliceByNumber } from "../utils/util.js";
import { escapeDot, capitalizeFirstLetter, unescapeDot } from "../utils/text.js";
import { stringTimeToNumber, toHms, formatDuration } from "../utils/time.js";
import { translate } from "../translate.js";
import { fileURLToPath } from "url";
import { dirname } from "path";
import {
  fetchTranscription,
  videoTranscriptionToJson,
  generateTranscriptParams,
  generateLangParams,
} from "../getYtTranscript.js";

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

const videoId = process.argv[2];

const directoryPath = `${__dirname}/captions/${videoId}`;

(async () => {
  await fs.promises.mkdir(directoryPath, { recursive: true });
  // YoutubeURLから字幕データを{ from, to, text }[]で取得する
  console.log("YoutubeURLから字幕データを{ timestamp, caption }[]で取得する");
  // const caption = await getCaptionByVideoId(url, directoryPath);
  const captions = await fetchTranscription(
    generateTranscriptParams(videoId, generateLangParams("en", "asr"))
  ).then((res) => videoTranscriptionToJson(res, videoId));

  fs.writeFileSync(
    `${directoryPath}/captions_en.json`,
    JSON.stringify(captions, null, 2)
  );

  // { timestamp, caption }[] => { from, to, caption }[]
  // console.log("{ timestamp, caption }[] => { from, to, caption }[]");
  // const captionWithFromto = captions.reduce((array, _, i) => {
  //   if (captions.length - 1 === i) return array; // captionの末尾は動画の長さ情報のみを持つのでスキップする
  //   const currentCaption = captions[i];
  //   const nextCaption = captions[i + 1];
  //   array.push({
  //     from: stringTimeToNumber(currentCaption.timestamp),
  //     to: stringTimeToNumber(nextCaption.timestamp),
  //     caption: currentCaption.caption,
  //   });
  //   return array;
  // }, []);

  // from, toをNumberに変換する
  const captionsWithNumberTimestamp = captions.map((caption) => ({
    ...caption,
    from: stringTimeToNumber(caption.from),
    to: stringTimeToNumber(caption.to),
  }));

  // 英単語ごとにタイムスタンプを割り振る: { word, timestamp }[]
  console.log("英単語ごとにタイムスタンプを割り振る");
  const dict = [];
  captionsWithNumberTimestamp.forEach(({ text, from, to }) => {
    const words = text.split(" ");
    const countOfWords = words.length;
    if (countOfWords === 1) {
      dict.push({
        word: escapeDot(words[0]),
        timestamp: from,
      });
    } else {
      const NumberOfSecondsHaveSpoken = to - from;
      const secondsOfBetweenWords =
        NumberOfSecondsHaveSpoken / (countOfWords - 1);
      dict.push(
        ...words.map((word, index) => ({
          word: escapeDot(word),
          timestamp: from + index * secondsOfBetweenWords,
        }))
      );
    }
  });

  fs.writeFileSync(`${directoryPath}/dict.json`, JSON.stringify(dict, null, 2));

  // 文末のピリオド以外のピリオドをエスケープする
  console.log("文末のピリオド以外のピリオドをエスケープする");
  const textPuncEscaped = captions
    .reduce((allTranscript, { text }) => (allTranscript += `${text} `), "")
    .split(" ") // 単語ごとに区切る
    .filter((mayWord) => mayWord)
    .map((word) => escapeDot(word))
    .join(" ");

  // 句読点モデルに渡して句読点を予測する
  console.log("句読点モデルに渡して句読点を予測する");
  const textPuncEscapedAndPredicted = await axios
    .post("http://localhost:5000/api/restorePunc", {
      text: textPuncEscaped,
    })
    .then((res) => res.data.res);

  fs.writeFileSync(
    `${directoryPath}/textPuncEscapedAndPredicted.txt`,
    textPuncEscapedAndPredicted
  );

  // エスケープ + 句読点予測した単語にtimestampを割り当てる
  console.log("エスケープ + 句読点予測した単語にtimestampを割り当てる");
  const wordEscapedAndPredictedWithTimestamp = textPuncEscapedAndPredicted
    .split(" ")
    .map((word, index) => {
      const { word: dictWord, timestamp } = dict[0]; // 辞書の単語は句読点をエスケープ済み
      if (
        word.indexOf(dictWord) !== -1 ||
        word.indexOf(capitalizeFirstLetter(dictWord)) !== -1
      ) {
        dict.shift();
        return {
          word, // エスケープ+句読点予測済みの単語
          timestamp,
        };
      } else {
        console.log(word, dictWord, timestamp);
        throw Error();
      }
    });

  // 単語をsentenceごとにグルーピングする
  console.log("単語をsentenceごとにグルーピングする");
  let wordTimestampBySentenceList = []; // sentenceを格納するリスト
  let wordTimestampBySentence = []; // wordを一つのsentenceとして格納するリスト
  wordEscapedAndPredictedWithTimestamp.forEach(({ word, timestamp }) => {
    const indexOfLastLetter = word.length - 1; // 末尾文字のindex番号
    if (
      [".", "?"]
        .map((puncMark) => word.indexOf(puncMark) === indexOfLastLetter)
        .some((bool) => bool)
    ) {
      // wordの末尾にsentenceの区切りとなる文字がある
      wordTimestampBySentence.push({
        word,
        timestamp,
      });
      wordTimestampBySentenceList.push(wordTimestampBySentence);
      wordTimestampBySentence = [];
    } else {
      wordTimestampBySentence.push({
        word,
        timestamp,
      });
    }
  });

  // グループごとに{ from, to, sentence }の形状に変換する
  console.log("グループごとに{ from, to, sentence }の形状に変換する");
  const sentenceFromTos = wordTimestampBySentenceList.map(
    (sentenceFromTo, index) => {
      const from = sentenceFromTo[0].timestamp;
      const to = sentenceFromTo[sentenceFromTo.length - 1].timestamp;
      const sentence = sentenceFromTo.map(({ word }) => word).join(" ");
      return {
        from: toHms(from),
        to: toHms(to),
        sentence: unescapeDot(sentence),
      };
    }
  );

  fs.writeFileSync(
    `${directoryPath}/captions_en_by_sentence.json`,
    JSON.stringify(sentenceFromTos, null, "  ")
  );

  // LENGTH_PER_SLICEの{ from, to, sentence }ごとに区切る
  const LENGTH_PER_SLICE = 30;
  const slicedSenteceFromTosList = sliceByNumber(
    sentenceFromTos,
    LENGTH_PER_SLICE
  );

  let structuredVtt_ja = [];
  let count = 0;
  console.log(`total length: ${slicedSenteceFromTosList.length}`);
  for (const slicedSenteceFromTos of slicedSenteceFromTosList) {
    console.log(`current index: ${count}`);
    const sliced_structuredVtt_ja = await translate(slicedSenteceFromTos);
    structuredVtt_ja = [...structuredVtt_ja, ...sliced_structuredVtt_ja];
    // fromを一つ前のtoにしてみる(字幕が常に表示され続けるということ)
    structuredVtt_ja = structuredVtt_ja.map((caption, i) => {
      if (i === 0) {
        return caption;
      } else {
        return {
          ...caption,
          from: structuredVtt_ja[i - 1].to,
        };
      }
    });
    fs.writeFileSync(
      `${directoryPath}/captions_ja_by_sentence.json`,
      JSON.stringify(structuredVtt_ja, null, "  ")
    );
    count += 1;
  }

  // 指定されたフォーマットで字幕ファイルを出力
  console.log("SRTフォーマットで字幕ファイルを出力");
  const text = structuredVtt_ja.reduce(
    (text, { sentence_ja, from, to }, index) =>
      (text += `${index + 1}\n${from.replace(".", ",")} --> ${to.replace(
        ".",
        ","
      )}\n${sentence_ja}\n\n`),
    ""
  );
  fs.writeFileSync(`${directoryPath}/captions_ja.srt`, text);
  // if (target === "vtt") {
  //   let text = "WEBVTT\n\n";
  //   structuredVtt_ja.forEach(
  //     ({ sentence_ja, from, to }) =>
  //       (text += `${from} --> ${to}\n${sentence_ja}\n\n`)
  //   );
  //   fs.writeFileSync(`${directoryPath}/captions_ja.vtt`, text);
  // } else if (target === "srt") {
  // }
})();
