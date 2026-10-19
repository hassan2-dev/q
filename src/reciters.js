/** Full mushaf recordings on the Al Quran Cloud CDN at 128 kbps. */
export const BITRATE = 128;

/** The voice kept on the device. Any other voice is downloaded only if they ask. */
export const HOUSE_VOICE_ID = "ar.abdulbasitmujawwad";

export const RECITERS = [
  { id: "ar.abdulbasitmujawwad", name: "عبد الباسط عبد الصمد", style: "مجوّد" },
  { id: "ar.abdulbasitmurattal", name: "عبد الباسط عبد الصمد", style: "مرتل" },
  { id: "ar.muhammadsiddiqalminshawimujawwad", name: "محمد صديق المنشاوي", style: "مجوّد" },
  { id: "ar.alafasy", name: "مشاري راشد العفاسي", style: "مرتل" },
  { id: "ar.saudalshuraim", name: "سعود الشريم", style: "مرتل" },
  { id: "ar.sudaisshuraymnaeemsultan", name: "السديس والشريم", style: "مشترك" },
  { id: "ar.ahmedalajmi", name: "أحمد العجمي", style: "مرتل" },
  { id: "ar.mohamedtablawi", name: "محمد الطبلاوي", style: "مرتل" },
  { id: "ar.mahmoudalialbanna", name: "محمود علي البنا", style: "مرتل" },
  { id: "ar.aliabdurrahmanalhuthaify", name: "علي الحذيفي", style: "مرتل" },
  { id: "ar.muhammadayyub", name: "محمد أيوب", style: "مرتل" },
  { id: "ar.yasseraldossari", name: "ياسر الدوسري", style: "مرتل" },
  { id: "ar.salahalbudair", name: "صلاح البدير", style: "مرتل" },
  { id: "ar.abdulmuhsinalqasim", name: "عبد المحسن القاسم", style: "مرتل" },
  { id: "ar.haniarrifai", name: "هاني الرفاعي", style: "مرتل" },
  { id: "ar.nabilarrifai", name: "نبيل الرفاعي", style: "مرتل" },
  { id: "ar.bandarbalila", name: "بندر بليلة", style: "مرتل" },
  { id: "ar.khalifaaltunaiji", name: "خليفة الطنيجي", style: "مرتل" },
  { id: "ar.faresabbad", name: "فارس عباد", style: "مرتل" },
  { id: "ar.abdullahbasfar", name: "عبد الله بصفر", style: "مرتل" },
  { id: "ar.ibrahimalakhdar", name: "إبراهيم الأخضر", style: "مرتل" },
  { id: "ar.tawfeeqassayegh", name: "توفيق الصايغ", style: "مرتل" },
];

export function reciterById(id) {
  return RECITERS.find((item) => item.id === id) || RECITERS[0];
}

export function surahAudioUrl(reciterId, surahNumber) {
  return `https://cdn.islamic.network/quran/audio-surah/${BITRATE}/${reciterId}/${surahNumber}.mp3`;
}
