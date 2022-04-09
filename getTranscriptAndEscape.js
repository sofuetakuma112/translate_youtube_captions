import fs from "fs";
import { escapeDot } from "./utils/text.js";
import { stringTimeToNumber } from "./utils/time.js";
import { fileURLToPath } from "url";
import { dirname } from "path";
import {
  fetchTranscription,
  videoTranscriptionToJson,
  generateTranscriptParams,
  generateLangParams,
} from "./getYtTranscript.js";

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

    fs.writeFileSync(`${directoryPath}/textPuncEscaped.txt`, textPuncEscaped);
})();
