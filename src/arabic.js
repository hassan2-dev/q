const MARKS = /[\u0610-\u061A\u064B-\u065F\u0670\u06D6-\u06DC\u06DF-\u06E4\u06E7\u06E8\u06EA-\u06ED]/g;
const DIGITS = "٠١٢٣٤٥٦٧٨٩";

export function strip(text) {
  return String(text || "")
    .replace(MARKS, "")
    .replace(/\u0640/g, "")
    .replace(/[أإآٱ]/g, "ا")
    .replace(/ؤ/g, "و")
    .replace(/ئ/g, "ي")
    .replace(/ة/g, "ه")
    .replace(/ى/g, "ي")
    .replace(/\s+/g, " ")
    .trim();
}

export function ar(value) {
  return String(value).replace(/\d/g, (digit) => DIGITS[digit]);
}

export function westernDigits(value) {
  return String(value).replace(/[٠-٩]/g, (digit) => String(DIGITS.indexOf(digit)));
}

export function clock(seconds, withHours = false) {
  const safe = Number.isFinite(seconds) && seconds > 0 ? Math.floor(seconds) : 0;
  const hours = Math.floor(safe / 3600);
  const minutes = Math.floor((safe % 3600) / 60);
  const remain = String(safe % 60).padStart(2, "0");
  if (withHours || hours > 0) {
    const mins = String(minutes).padStart(2, "0");
    return `${ar(hours)}:${ar(mins)}:${ar(remain)}`;
  }
  return `${ar(minutes)}:${ar(remain)}`;
}
