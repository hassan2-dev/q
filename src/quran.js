import raw from "../data/quran.json";
import { strip } from "./arabic";

function titleOf(name) {
  return strip(name).replace(/^سورة\s+/, "");
}

export const SURAHS = raw.map((surah) => ({
  n: surah.n,
  name: titleOf(surah.name),
  place: surah.type === "Medinan" ? "مدنية" : "مكية",
  ayahs: surah.ayahs,
}));

export const BISMILLAH = SURAHS[0].ayahs[0];
export const FATIHA_AYAHS = SURAHS[0].ayahs;

export function getSurah(number) {
  return SURAHS[number - 1];
}
