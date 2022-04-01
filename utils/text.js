export const removeTag = (text) => {
  return text.replace(/<("[^"]*"|'[^']*'|[^'">])*>/g, "");
};

export const escapeDot = (word) => word.replaceAll(".", "[dot]");

export const unescapeDot = (word) => word.replaceAll("[dot]", ".");

// text => Text
export const capitalizeFirstLetter = (text) => {
  return text.charAt(0).toUpperCase() + text.slice(1);
};

// " line 15%"を取り除く
export const removeLineChar = (time) => {
  try {
    return time.replace(" line:15%", "");
  } catch (error) {
    console.log(time);
    throw Error(error);
  }
};

// vttファイルをsrtファイルに変換する
export const vtt2srt = (vtt) => {
  const splitByLine = vtt.split("\n").filter((line) => line);
  let currentIndex = 0;
  let transcript_srt = "";
  const removedWebVttText = splitByLine.splice(1, splitByLine.length);
  [...Array(Math.floor(removedWebVttText.length / 2))].forEach((_, index) => {
    transcript_srt += `${index + 1}
  ${removedWebVttText[currentIndex].replaceAll(".", ",")}
  ${removedWebVttText[currentIndex + 1]}\n\n`
      .split("\n")
      .map((line) => line.trim())
      .join("\n");
    currentIndex += 2;
  });
  return transcript_srt;
};
