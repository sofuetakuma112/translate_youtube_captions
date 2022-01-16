import fs from "fs";
import {
  escapeDot,
  unescapeDot,
  removeTag,
  capitalizeFirstLetter,
  removeLineChar,
  timeToNumber,
  toHms,
} from "./util.js";

// youtubeからDLしたsbvファイルと
// dotをエスケープして句読点予測したテキストファイルを使う

const buffer = fs.readFileSync("chat/captions.sbv");
const sbv = buffer.toString();

const convertToStructuredVtt = (vtt) => {
  const subtitleSplitByNewLine = vtt
    .split("\n")
    .map((line) => line.trim())
    .filter((line) => line);

  // timestamp上にindex番号がある場合、除去する
  let sentenceAndTimestampList = [];
  if (Number.isInteger(Number(subtitleSplitByNewLine[0]))) {
    // timestampの上にindexが存在するタイプのvtt
    sentenceAndTimestampList = subtitleSplitByNewLine.filter(
      (line, index) => index % 3 !== 0
    );
  } else {
    sentenceAndTimestampList = subtitleSplitByNewLine;
  }

  const subtitles_array = [];
  for (let i = 0; i < sentenceAndTimestampList.length / 2; i++) {
    const timeAndSubtitle = sentenceAndTimestampList.slice(i * 2, i * 2 + 2);
    const time = timeAndSubtitle[0];
    const subtitle = removeTag(timeAndSubtitle[1]).replace("\r", "");

    const fromTo = time.split(",");
    const from = fromTo[0];
    const to = removeLineChar(fromTo[1]).replace("\r", "");

    subtitles_array.push({
      from,
      to,
      subtitle,
    });
  }

  fs.writeFileSync(
    "subtitles_array.json",
    JSON.stringify(subtitles_array, null, "  ")
  );

  const wordWithTimestamps = [];
  const subtitlesArrayAdjustedTimestamp = subtitles_array
    .map((subtitle_array, index) => {
      if (subtitles_array.length - 1 === index) {
        // subtitles_array末尾の要素
        return subtitle_array;
      } else {
        if (
          JSON.stringify(subtitle_array.from) ===
          JSON.stringify(subtitles_array[index + 1].from)
        ) {
          console.log(subtitle_array, subtitles_array[index + 1]);
          throw Error();
        }
        return {
          from: timeToNumber(subtitle_array.from),
          to: timeToNumber(subtitles_array[index + 1].from),
          subtitle: subtitle_array.subtitle,
        };
      }
    })
    // [Music]をtimestampの修正後に弾かないと
    // subtitles_arrayとmapのindexにズレが生じる
    .filter(({ subtitle }) => subtitle !== "[Music]");

  fs.writeFileSync(
    "subtitlesArrayAdjustedTimestamp.json",
    JSON.stringify(subtitlesArrayAdjustedTimestamp, null, "  ")
  );
  subtitlesArrayAdjustedTimestamp.forEach(({ subtitle, from, to }) => {
    const words = subtitle.split(" ");
    const countOfWords = words.length;
    const NumberOfSecondsHaveSpoken = to.time_number - from.time_number;
    const NumberOfSecondsBetweenWords =
      NumberOfSecondsHaveSpoken / countOfWords;
    wordWithTimestamps.push(
      ...words.map((word, index) => ({
        word: escapeDot(word),
        timestamp: from.time_number + index * NumberOfSecondsBetweenWords,
      }))
    );
  });

  return wordWithTimestamps;
};

const dict = convertToStructuredVtt(sbv);

const buffer2 = fs.readFileSync("chat/text_with_punc_escaped.txt");
const text_with_punc_escaped = buffer2.toString();

// 単語ごとにtimestampを割り当てる
const word_with_punc_timestamp = text_with_punc_escaped
  .split(" ")
  .map((word, index) => {
    const { word: dictWord, timestamp } = dict[0];
    if (
      word.indexOf(dictWord) !== -1 ||
      word.indexOf(capitalizeFirstLetter(dictWord)) !== -1
    ) {
      dict.shift();
      return {
        word,
        timestamp,
      };
    } else {
      throw Error();
    }
  });

// 単語をsentenceごとにグルーピングする
let wordTimestampBySentenceList = [];
let wordTimestampBySentence = [];
word_with_punc_timestamp.forEach(({ word, timestamp }) => {
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
const sentenceFromTos = wordTimestampBySentenceList.map(
  (sentenceFromTo, index) => {
    const from = sentenceFromTo[0].timestamp;
    const to = sentenceFromTo[sentenceFromTo.length - 1].timestamp;
    const sentence = sentenceFromTo.map(({ word }) => word).join(" ");
    return {
      from,
      to,
      sentence: unescapeDot(sentence),
    };
  }
);

// console.log(
//   sentenceFromTos.slice(sentenceFromTos.length - 5, sentenceFromTos.length)
// );

let text = "";
sentenceFromTos.forEach(
  ({ sentence, from, to }) =>
    (text += `${toHms(from)} --> ${toHms(to)}\n${sentence}\n\n`)
);
fs.writeFileSync("chat/text_with_punc_timestamp.vtt", text);
