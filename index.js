import fs from "fs";
import axios from "axios";
import { getCaptionByVideoId } from "./getYoutubeCaptionByScraping.js";
import { sliceByNumber } from "./utils/util.js";
import { escapeDot, capitalizeFirstLetter, unescapeDot } from "./utils/text.js";
import { stringTimeToNumber, toHms } from "./utils/time.js";
import { translate } from "./translate.js";

const url = process.argv[2];

(async () => {
  // YoutubeURLから字幕データを{ timestamp, caption }[]で取得する
  console.log("YoutubeURLから字幕データを{ timestamp, caption }[]で取得する");
  const caption = await getCaptionByVideoId(url);

  // { timestamp, caption }[] => { from, to, caption }[]
  console.log("{ timestamp, caption }[] => { from, to, caption }[]");
  const captionWithFromto = caption.reduce((array, _, i) => {
    if (caption.length - 1 === i) return array; // captionの末尾は動画の長さ情報のみを持つのでスキップする
    const currentCaption = caption[i];
    const nextCaption = caption[i + 1];
    array.push({
      from: stringTimeToNumber(currentCaption.timestamp),
      to: stringTimeToNumber(nextCaption.timestamp),
      caption: currentCaption.caption,
    });
    return array;
  }, []);

  // 英単語ごとにタイムスタンプを割り振る: { word, timestamp }[]
  console.log("英単語ごとにタイムスタンプを割り振る");
  const dict = [];
  captionWithFromto.forEach(({ caption, from, to }) => {
    const words = caption.split(" ");
    const countOfWords = words.length;
    const NumberOfSecondsHaveSpoken = to - from;
    const NumberOfSecondsBetweenWords =
      NumberOfSecondsHaveSpoken / countOfWords;
    dict.push(
      ...words.map((word, index) => ({
        word: escapeDot(word),
        timestamp: from + index * NumberOfSecondsBetweenWords,
      }))
    );
  });

  fs.writeFileSync(`captions/dict.json`, JSON.stringify(dict, null, "  "));

  // 文末のピリオド以外のピリオドをエスケープする
  console.log("文末のピリオド以外のピリオドをエスケープする");
  const textPuncEscaped = caption
    .reduce(
      (allTranscript, { caption }) => (allTranscript += `${caption} `),
      ""
    )
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
    "captions/textPuncEscapedAndPredicted",
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
        throw Error();
      }
    });

  // 単語をsentenceごとにグルーピングする
  console.log("単語をsentenceごとにグルーピングする");
  let wordTimestampBySentenceList = [];
  let wordTimestampBySentence = [];
  wordEscapedAndPredictedWithTimestamp.forEach(({ word, timestamp }) => {
    if (word.indexOf(".") === word.length - 1) {
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
    fs.writeFileSync(
      "chat/structuredVtt_ja.json",
      JSON.stringify(structuredVtt_ja, null, "  ")
    );
    count += 1;
  }

  let text = "WEBVTT\n\n";
  structuredVtt_ja.forEach(
    ({ sentence_ja, from, to }) =>
      (text += `${from} --> ${to}\n${sentence_ja}\n\n`)
  );
  fs.writeFileSync("captions/transcript_ja.vtt", text);
})();
