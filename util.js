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

// 0:00:00.140の形式に対応
export const timeToNumber = (time) => {
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

export const toHms = (t) => {
  const padZero = (v) => {
    if (v < 10) {
      return "0" + v;
    } else {
      return v;
    }
  };
  let h = t / 3600 >= 1 ? parseInt(t / 3600) : 0; // h:mm:ss.msmsmsのhを秒数から構築
  let m = (t - h * 3600) / 60 >= 1 ? parseInt((t - h * 3600) / 60) : 0; // h:mm:ss.msmsmsのmmを秒数から構築
  let s = t - h * 3600 - m * 60; // h:mm:ss.msmsmsのss.msmsmsを秒数から構築(ssのみのケースもある)
  const timestamp_stirng =
    h + ":" + padZero(m) + ":" + String(padZero(s)).slice(0, 6);
  const [hms, millisecond] = timestamp_stirng.split(".");
  if (!millisecond) { // tが整数の場合、millisecondがundefinedになる
    return hms + ".000";
  } else if (millisecond.length !== 3) { // millisecondを3桁に合わせる
    return hms + '.' + millisecond.padEnd(3, "0");
  }
  return timestamp_stirng;
};
