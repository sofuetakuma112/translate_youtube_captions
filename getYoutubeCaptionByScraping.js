import puppeteer from "puppeteer";

const sleep = (ms) => {
  return new Promise((resolve) => setTimeout(resolve, ms));
};

const options = {
  headless: false,
};
const browser = await puppeteer.launch(options);
const page = await browser.newPage();
await Promise.all([
  page.goto(process.argv[2]),
  page.waitForNavigation({ waitUntil: ["load", "networkidle2"] }),
]);

const menuIcon = await page.$(
  "#menu-container .dropdown-trigger.style-scope.ytd-menu-renderer button"
);
await menuIcon.click();
await sleep(1000);

const openTranscription = await page.$(
  "tp-yt-iron-dropdown.style-scope.ytd-popup-container .style-scope.ytd-menu-service-item-renderer"
);
await openTranscription.click();
await sleep(1000);

const selectLang = await page.$(
  "#footer tp-yt-paper-button.dropdown-trigger.style-scope.yt-dropdown-menu"
);
await selectLang.click();
await sleep(1000);

const getTextContentFromElemHandler = async (elementHandle) => {
  const textContentProperty = await elementHandle.getProperty("textContent");
  return textContentProperty.jsonValue();
};

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
    console.log(`langText: ${langText}`);
    return {
      elem: langAnchorElem,
      lang: langText,
    };
  })
);

const elemOfEnCaption = langAnchorElemsWithLangText.find(
  ({ lang }) => lang === "英語"
);
const elemOfAutoEnCaption = langAnchorElemsWithLangText.find(
  ({ lang }) => lang === "英語 (自動生成)"
);

if (elemOfEnCaption || elemOfAutoEnCaption) {
  const elementsOfTheLanguageOfChoice =
    elemOfEnCaption?.elem || elemOfAutoEnCaption.elem;
  await elementsOfTheLanguageOfChoice.click();
  // 字幕データ全体の読み込み
  await sleep(2000);
  const captionAndTimestampElems = await page.$$(
    "#body ytd-transcript-body-renderer > div"
  );
  console.log(`captionAndTimestampElems.length: ${captionAndTimestampElems.length}`)
  const captionAndTimestamp = await Promise.all(
    captionAndTimestampElems.map(async (captionAndTimestampElem) => {
      const timestampElem = await captionAndTimestampElem.$(
        ".cue-group-start-offset.style-scope.ytd-transcript-body-renderer"
      );
      const captionElem = await captionAndTimestampElem.$(
        ".cue.style-scope.ytd-transcript-body-renderer"
      );
      const timestamp = await getTextContentFromElemHandler(timestampElem);
      const caption = await getTextContentFromElemHandler(captionElem);
      return {
        timestamp,
        caption,
      };
    })
  );

  console.log(captionAndTimestamp);
  await browser.close();
} else {
  throw Error("字幕がない");
}
