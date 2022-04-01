import puppeteer from "puppeteer";
import fs from "fs";
import fetch from "node-fetch";
import moment from "moment";
import "dotenv/config";
import { sleep } from "./utils/util.js";
import { formatWebVttTimestamp, formatDuration } from "./utils/time.js";
import { getTextContentFromElemHandler } from "./utils/puppeteer.js";

export const getCaptionByVideoId = async (url, directoryPath) => {
  const options = {
    headless: true,
  };
  const browser = await puppeteer.launch(options);
  const page = await browser.newPage();
  await Promise.all([
    page.goto(url),
    page.waitForNavigation({ waitUntil: ["load", "networkidle2"] }),
  ]);

  await page.waitForSelector(
    "#menu-container .dropdown-trigger.style-scope.ytd-menu-renderer button",
    { timeout: 100000 }
  );
  const menuIcon = await page.$(
    "#menu-container .dropdown-trigger.style-scope.ytd-menu-renderer button"
  );
  await menuIcon.click();
  await sleep(2000);

  const openTranscription = await page.$(
    "tp-yt-iron-dropdown.style-scope.ytd-popup-container .style-scope.ytd-menu-service-item-renderer"
  );
  await openTranscription.click();
  await sleep(2000);

  const selectLangElem = await page.$(
    "#footer tp-yt-paper-button.dropdown-trigger.style-scope.yt-dropdown-menu"
  );

  await selectLangElem.click();
  await sleep(2000);
  const langAnchorElems = await page.$$(
    "#footer tp-yt-paper-listbox.dropdown-content.style-scope.yt-dropdown-menu a"
  );
  const langAnchorElemsWithLangText = await Promise.all(
    langAnchorElems.map(async (langAnchorElem) => {
      const textDivElem = await langAnchorElem.$(
        ".item.style-scope.yt-dropdown-menu"
      );
      const textContentProperty = await textDivElem.getProperty("textContent");
      const langText = await textContentProperty.jsonValue();
      // console.log(`langText: ${langText}`);
      return {
        elem: langAnchorElem,
        lang: langText,
      };
    })
  );

  // 要素数でセレクトボックスか判断する
  if (langAnchorElemsWithLangText.length === 1) {
    // lengthが1の場合、セレクトボックスではない
    // 現在表示しているのが英語 (自動生成)かチェックする
    if (langAnchorElemsWithLangText[0].lang !== "英語 (自動生成)")
      throw Error("英語 (自動生成)以外の字幕は未対応");
  } else {
    const elemOfEnCaption = langAnchorElemsWithLangText.find(
      ({ lang }) => lang === "英語"
    );
    const elemOfAutoEnCaption = langAnchorElemsWithLangText.find(
      ({ lang }) => lang === "英語 (自動生成)"
    );

    // TODO: ユーザーが生成した字幕のテキスト処理に対応する
    if (elemOfAutoEnCaption) {
      // セレクトボックスから英語 (自動生成)をクリックする
      const elementsOfTheLanguageOfChoice = elemOfAutoEnCaption.elem;
      await elementsOfTheLanguageOfChoice.click();
    } else throw Error("英語 (自動生成)以外の字幕は未対応");
  }

  // 字幕データ全体の読み込み
  const getAllCaptions = async () => {
    const captionAndTimestampElems = await page.$$(
      "ytd-transcript-segment-list-renderer.style-scope.ytd-transcript-search-panel-renderer ytd-transcript-segment-renderer > div"
    );
    const removeNewLineAndTrimText = (text) => text.replaceAll("\n", "").trim();
    const captionAndTimestamp = await Promise.all(
      captionAndTimestampElems.map(async (captionAndTimestampElem) => {
        const timestampElem = await captionAndTimestampElem.$(
          ".segment-timestamp.style-scope.ytd-transcript-segment-renderer"
        );
        const captionElem = await captionAndTimestampElem.$(
          "yt-formatted-string"
        );
        const timestamp = await getTextContentFromElemHandler(timestampElem);
        const caption = await getTextContentFromElemHandler(captionElem);
        return {
          timestamp: formatWebVttTimestamp(removeNewLineAndTrimText(timestamp), 2, false),
          caption: removeNewLineAndTrimText(caption),
        };
      })
    );
    if (captionAndTimestamp.length <= 1) {
      console.log("字幕データの取得に失敗したのでリトライする");
      await sleep(5000);
      return getAllCaptions();
    } else {
      return captionAndTimestamp;
    }
  };

  const captionAndTimestamp = await getAllCaptions();

  // 動画の長さを取得する
  const videoId = new URL(url).searchParams.get("v");
  const data = await fetch(
    `https://www.googleapis.com/youtube/v3/videos?id=${videoId}&key=${process.env.YOUTUBE_DATA_API_KEY}&part=contentDetails`
  ).then((res) => res.json());

  // from toの作成のために動画のdurationを最後に追加する
  const d = moment.duration(data.items[0].contentDetails.duration);
  const timestamp = formatDuration(d);

  captionAndTimestamp.push({
    timestamp,
    caption: "",
  });

  fs.writeFileSync(
    `${directoryPath}/captions_en.json`,
    JSON.stringify(captionAndTimestamp, null, "  ")
  );
  await browser.close();
  return captionAndTimestamp;
};
