import fs from "fs";

const vtt_ja = JSON.parse(fs.readFileSync("chat/structuredVtt_ja.json", "utf8"));

let text = "WEBVTT\n\n";
vtt_ja.forEach(
  ({ sentence_ja, from, to }) =>
    (text += `${from} --> ${to}\n${sentence_ja}\n\n`)
);
fs.writeFileSync("chat/text_with_punc_timestamp_ja.vtt", text);

