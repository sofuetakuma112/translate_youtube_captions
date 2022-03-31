import { getCaptionByVideoId } from "./getYoutubeCaptionByScraping.js";
import { escapeDot, stringTimeToNumber } from "./util.js";
import fs from "fs";

const url = process.argv[2];

const caption = await getCaptionByVideoId(url);

// { timestamp, caption } => { from, to, caption }
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

// 英単語ごとにタイムスタンプを割り振る
const wordWithTimestamps = [];
captionWithFromto.forEach(({ caption, from, to }) => {
  const words = caption.split(" ");
  const countOfWords = words.length;
  const NumberOfSecondsHaveSpoken = to - from;
  const NumberOfSecondsBetweenWords = NumberOfSecondsHaveSpoken / countOfWords;
  wordWithTimestamps.push(
    ...words.map((word, index) => ({
      word: escapeDot(word),
      timestamp: from + index * NumberOfSecondsBetweenWords,
    }))
  );
});

fs.writeFileSync(
  `captions/timestamp_words.json`,
  JSON.stringify(wordWithTimestamps, null, "  ")
);
console.log(wordWithTimestamps);
