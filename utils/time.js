import moment from "moment";

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

// 不完全なWEBVTTタイムスタンプを完全なものに整形する(0埋め)
// formatWebVttTimestamp("2:01") => 00:02:01
// formatWebVttTimestamp("53:04") => 00:53:04
// formatWebVttTimestamp("6:43:23") => 06:43:23
// formatWebVttTimestamp("28:28:26") => 28:28:26
export const formatWebVttTimestamp = (
  timestamp_webvtt,
  countOfColon,
  withDecimal
) => {
  const count = (timestamp_webvtt.match(/:/g) || []).length;
  let fullTimestamp_webvtt = timestamp_webvtt
    .split(":")
    .map((time) => padZero(time, 2))
    .join(":");
  [...Array(countOfColon - count)].forEach(
    (_, i) => (fullTimestamp_webvtt = `00:${fullTimestamp_webvtt}`)
  );
  if (withDecimal && fullTimestamp_webvtt.indexOf(".") === -1) {
    fullTimestamp_webvtt = `${fullTimestamp_webvtt}.000`;
  }
  return fullTimestamp_webvtt;
};

const padZero = (number, len) => ("0" + number).slice(-1 * len);

// P0DT0H7M30S => 00:07:30
// P1DT7H7M30S => 31:07:30
export const formatDuration = (duration) => {
  const d = moment.duration(duration);
  return `${padZero(Math.floor(d.hours() + d.days() * 24), 2)}:${padZero(
    Math.floor(d.minutes()),
    2
  )}:${padZero(d.seconds(), 2)}`;
};

export const ms2likeISOFormat = (ms) => {
  const slicedISOString = new Date(ms).toISOString().slice(8, -1);
  const day = slicedISOString.slice(0, 2);
  const padZero = (number, len) => ("0" + number).slice(-1 * len);
  return `${padZero(Number(day) - 1, 2)}:${slicedISOString.slice(
    3,
    slicedISOString.length
  )}`;
};

// HH:MM:SS => SSに変換する
// export const stringTimeToNumber = (stringTime) => {
//   let [hours, minutes, seconds] = stringTime.split(":");
//   return Number(hours) * 60 * 60 + Number(minutes) * 60 + Number(seconds);
// };

// DD:HH:MM:SS => SSに変換する
export const stringTimeToNumber = (stringTime) => {
  let [days, hours, minutes, seconds] = stringTime.split(":");
  return (
    Number(days) * 24 * 60 * 60 +
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
  let h = t / 3600 >= 1 ? parseInt(t / 3600) : 0; // HH:MM:SS.fffのhを秒数から構築
  let m = (t - h * 3600) / 60 >= 1 ? parseInt((t - h * 3600) / 60) : 0; // HH:MM:SS.fffのmmを秒数から構築
  let s = t - h * 3600 - m * 60; // HH:MM:SS.fffのSS.fffを秒数から構築(SSのみのケースもある)
  const timestamp_stirng =
    padZero(h) + ":" + padZero(m) + ":" + String(padZero(s)).slice(0, 6);
  const [hms, millisecond] = timestamp_stirng.split(".");
  if (!millisecond) {
    // tが整数の場合、millisecondがundefinedになる
    return hms + ".000";
  } else if (millisecond.length !== 3) {
    // millisecondを3桁に合わせる
    return hms + "." + millisecond.padEnd(3, "0");
  }
  return timestamp_stirng;
};
