import fs from "fs";
import {
  escapeDot,
  unescapeDot,
  removeTag,
  capitalizeFirstLetter,
} from "./util.js";

const buffer = fs.readFileSync("chat/captions.sbv");
const sbv = buffer.toString();

// " line 15%"を取り除く
const removeLineChar = (time) => {
  try {
    return time.replace(" line:15%", "");
  } catch (error) {
    console.log(time);
    throw Error(error);
  }
};

// 0:00:00.140の形式に対応
const timeToNumber = (time) => {
  const hour = time.split(":")[0];
  const minute = time.split(":")[1];
  const second = time.split(":")[2].split(".")[0];
  const millisecond = time.split(":")[2].split(".")[1];
  return {
    hour: Number(hour),
    minute: Number(minute),
    second: Number(second),
    millisecond: Number(millisecond),
    time_number:
      Number(hour) * 60 * 60 +
      Number(minute) * 60 +
      Number(second) +
      0.001 * Number(millisecond),
    time_string: time,
  };
};

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

  const wordWithTimestamps = [];
  subtitles_array
    .filter(({ subtitle }) => subtitle !== "[Music]")
    .map((subtitle_array, index) => {
      if (subtitles_array.length - 1 === index) {
        // subtitles_array末尾の要素
        return subtitle_array;
      } else {
        return {
          from: timeToNumber(subtitle_array.from),
          to: timeToNumber(subtitles_array[index + 1].from),
          subtitle: subtitle_array.subtitle,
        };
      }
    })
    .forEach(({ subtitle, from, to }) => {
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

const text_with_punc2 = text_with_punc_escaped // . => [dot]に前処理したテキストをbert modelで句読点つけたもの
  .split(".")
  .map((sentence) => unescapeDot(sentence)) // [dot] => . に変換する
  .filter((text) => text);
// .map((text) => text + ".")
// .map((text) => text.trim())
// .join("\n\n")
// .split("?")
// .map((text) => text + "?")
// .map((text) => text.trim())
// .join("\n\n")

const word_with_punc_timestamp = text_with_punc_escaped
  .split(" ")
  .map((word, index) => {
    const { word: dictWord, timestamp } = dict[0];
    if (
      word.indexOf(dictWord) !== -1 ||
      word.indexOf(capitalizeFirstLetter(dictWord)) !== -1
    ) {
      // ok
      dict.shift();
      return {
        word,
        timestamp,
      };
    } else {
      throw Error();
    }
  });

let wordTimestampBySentenceList = [];
let wordTimestampBySentence = [];
word_with_punc_timestamp.forEach(({ word, timestamp }) => {
  // 文末のピリオド以外のピリオドに反応する可能性がある
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
