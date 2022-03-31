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

// 不完全なWEBVTTタイムスタンプを完全なものに整形する
export const formatWebVttTimestamp = (timestamp_webvtt) => {
  let fullTimestamp_webvtt = timestamp_webvtt
  const count = ( fullTimestamp_webvtt.match( /:/g ) || [] ).length;
  console.log([...Array(3 - count)]);
  [...Array(3 - count)].forEach((_, i) => fullTimestamp_webvtt = `00:${fullTimestamp_webvtt}`);
  if (fullTimestamp_webvtt.indexOf('.') === -1) {
    fullTimestamp_webvtt = `${fullTimestamp_webvtt}.000`
  }
  return fullTimestamp_webvtt;
}

// 1982:40の形式のみ対応する
export const stringTimeToNumber = (stringTime) => {
  let [minutes, seconds] = stringTime.split(":");
  let hours = Math.floor(minutes / 60);
  minutes = minutes - hours * 60; // minutesからhoursに移した分減らす
  let day = Math.floor(hours / 24);
  hours = hours - day * 24; // hoursからdayに移した分減らす
  return (
    Number(day) * 24 * 60 * 60 +
    Number(hours) * 60 * 60 +
    Number(minutes) * 60 +
    Number(seconds)
  );
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
    padZero(h) + ":" + padZero(m) + ":" + String(padZero(s)).slice(0, 6);
  const [hms, millisecond] = timestamp_stirng.split(".");
  if (!millisecond) { // tが整数の場合、millisecondがundefinedになる
    return hms + ".000";
  } else if (millisecond.length !== 3) { // millisecondを3桁に合わせる
    return hms + '.' + millisecond.padEnd(3, "0");
  }
  return timestamp_stirng;
};

export const sliceByNumber = (array, number) => {
  const length = Math.ceil(array.length / number)
  return new Array(length).fill().map((_, i) =>
    array.slice(i * number, (i + 1) * number)
  )
}

export const sleep = (ms) => {
  return new Promise((resolve) => setTimeout(resolve, ms));
};
