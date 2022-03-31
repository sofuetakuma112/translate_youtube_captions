export const removeTag = (text) => {
  return text.replace(/<("[^"]*"|'[^']*'|[^'">])*>/g, "");
};

export const escapeDot = (word) => {
  if (word.indexOf(".") !== -1) {
    const escaped = word.replace(".", "[dot]");
    if (escaped.indexOf(".") !== -1) {
      return escapeDot(escaped);
    } else return escaped;
  } else return word;
};

export const unescapeDot = (word) => {
  if (word.indexOf("[dot]") !== -1) {
    const unescaped = word.replace("[dot]", ".");
    if (unescaped.indexOf("[dot]") !== -1) {
      return unescapeDot(unescaped);
    } else return unescaped;
  } else return word;
};

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