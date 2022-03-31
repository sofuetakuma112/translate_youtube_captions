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
  [...Array(3 - count)].forEach((_, i) => fullTimestamp_webvtt = `00:${fullTimestamp_webvtt}`);
  if (fullTimestamp_webvtt.indexOf('.') === -1) {
    fullTimestamp_webvtt = `${fullTimestamp_webvtt}.000`
  }
  return fullTimestamp_webvtt;
}

// MM:SS => SSに変換する
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