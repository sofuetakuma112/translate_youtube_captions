import fs from "fs";
import axios from "axios";
import { escapeDot, unescapeDot } from "./util";

const buffer = fs.readFileSync("chat/transcript.txt");
const text_original = buffer.toString();

const words = text_original.split(" ");
const wordsWithPeriods = [...new Set(words)].filter(
  (word) => word.indexOf(".") !== -1
);

const text_original_escaped = text_original
  .split(" ") // 単語ごとに区切る
  .map((word) => escapeDot(word))
  .join(" ");

// ここで句読点モデルに渡す？
const text_with_punc_escaped = await axios
  .post("http://localhost:5000/api/restorePunc", {
    text: text_original_escaped,
  })
  .then((res) => res.data.res);

fs.writeFileSync("chat/text_with_punc_escaped.txt", text_with_punc_escaped);

console.log(
  text_with_punc_escaped // . => [dot]に前処理したテキストをbert modelで句読点つけたもの
    .split(".")
    .map((text) => unescapeDot(text)) // [dot] => . に変換する
    .filter((text) => text)
    .map((text) => text + ".")
    .map((text) => text.trim())
    .join("\n\n")
  // .split("?")
  // .map((text) => text + "?")
  // .map((text) => text.trim())
  // .join("\n\n")
);
