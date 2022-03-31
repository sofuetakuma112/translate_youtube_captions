import puppeteer from "puppeteer";
import { sleep } from "./utils/util.js";

const removeIndexFromText = (text, threshold) => {
  const removedText = text.slice(text.indexOf(".") + 1, text.length).trim();
  const index = Number(removedText.slice(0, removedText.indexOf(".")));
  if (!isNaN(index) && index < threshold) {
    // まだindexがtextにある
    return removeIndexFromText(removedText);
  } else return removedText;
};

export const translate = async (structuredVtt) => {
  const options = {
    headless: true,
  };
  const browser = await puppeteer.launch(options);
  const page = await browser.newPage();
  await page.goto("https://www.deepl.com/translator");
  console.log("loading page ...");
  await sleep(5000);

  // Sentence[]からsentenceのみを取り出し配列に格納する
  const sentences_with_index = structuredVtt.map(
    (sentenceAndFromTo, index) => `${index}. ${sentenceAndFromTo.sentence}`
  );

  // 一括翻訳用のテキストと一つずつ翻訳するテキストに分ける
  let textBeTranslatedInBulk = [];
  let textBeTranslatedOneByOne = [];
  sentences_with_index.forEach((sentence_with_index) => {
    if (sentence_with_index.length > 80) {
      textBeTranslatedOneByOne.push(sentence_with_index);
    } else {
      textBeTranslatedInBulk.push(sentence_with_index);
    }
  });

  // console.log("textBeTranslatedInBulk", textBeTranslatedInBulk);
  // console.log("textBeTranslatedOneByOne", textBeTranslatedOneByOne);

  // 3000文字ごとに区切る
  const LIMIT = 3000;
  let batchText_en = "";
  const batchTexts_en = [];
  textBeTranslatedInBulk.forEach((sentence, index) => {
    const nextTotalLength = batchText_en.length + sentence.length;
    if (nextTotalLength < LIMIT) {
      // まだ現在のbatchText_enに追加できる
      if (index === textBeTranslatedInBulk.length - 1) {
        // textBeTranslatedInBulkの末尾要素
        batchText_en += `${sentence}\n\n`;
        batchTexts_en.push(batchText_en);
        batchText_en = "";
      } else {
        batchText_en += `${sentence}\n\n`;
      }
    } else {
      batchTexts_en.push(batchText_en);
      batchText_en = `${sentence}\n\n`;
      if (index === textBeTranslatedInBulk.length - 1) {
        // textBeTranslatedInBulkの末尾要素
        batchTexts_en.push(batchText_en);
        batchText_en = "";
      }
    }
  });

  // バッチテキストの末尾から\n\nを取り除く
  const batchTextsRemovedEndNewlineChar_en = batchTexts_en.map((batchText) =>
    batchText.slice(0, batchText.length - 2)
  );

  // 一括翻訳用のテキストと単テキストを合成する
  const batchTextAndOneTextList = [
    ...batchTextsRemovedEndNewlineChar_en,
    ...textBeTranslatedOneByOne,
  ];

  let batchText_ja = "";
  const startTime = performance.now(); // 開始時間
  for await (const sentence_en of batchTextAndOneTextList) {
    await sleep(500);
    // 入力領域にテキストを入力
    console.log("typing ...");
    await page.type('textarea[dl-test="translator-source-input"]', sentence_en);
    console.log("translating ...");

    await sleep(5000);

    // 出力されたテキストを取得
    const elem = await page.$('[id="target-dummydiv"]');
    const jsHandle = await elem.getProperty("textContent");
    const text = await jsHandle.jsonValue();

    // 翻訳されたテキストの末尾に付く/rを取り除く
    // 末尾が\r\nになっている？
    const textRemovedCarriageReturn = text.slice(0, text.length - 2);
    batchText_ja += `${textRemovedCarriageReturn}\n\n`;
    // sentences_ja.push(textRemovedCarriageReturn);

    console.log("press delete button");
    // await page.click('button[dl-test="translator-source-clear-button"]');
    await page.click('button[aria-describedby="clearTextButton"]');
  }
  const endTime = performance.now(); // 終了時間
  console.log((endTime - startTime) / 1000, " [s]"); // 何ミリ秒かかったかを表示する

  const sentences_ja_with_index = batchText_ja
    .split("\n")
    .filter((line) => line);

  const sentences_ja_with = new Array(sentences_with_index.length).fill(0);
  sentences_ja_with_index.forEach((text) => {
    const index = Number(text.slice(0, text.indexOf(".")));
    sentences_ja_with[index] = removeIndexFromText(
      text,
      sentences_ja_with_index.length
    );
  });

  const structuredVtt_ja = structuredVtt.map((sentenceAndFromTo, index) => ({
    from: sentenceAndFromTo.from,
    to: sentenceAndFromTo.to,
    sentence_en: sentenceAndFromTo.sentence,
    sentence_ja: sentences_ja_with[index],
  }));

  await browser.close();

  return structuredVtt_ja;
};
