import React, { useMemo, useState } from "react";
import { FlatList, Pressable, StyleSheet, Text, TextInput, View } from "react-native";
import { useFrameInsets } from "../insets";
import { ar, strip, westernDigits } from "../arabic";
import { useMushaf } from "../MushafContext";
import { BISMILLAH, getSurah, SURAHS } from "../quran";
import { colors, fonts } from "../theme";
import { GoldRule, Sky, Star } from "../components/Ornament";

function matches(surah, query) {
  const raw = query.trim();
  if (!raw) return true;
  const digits = westernDigits(raw);
  if (/^\d+$/.test(digits) && surah.n === Number(digits)) return true;
  const needle = strip(raw);
  return strip(surah.name).includes(needle);
}

export default function HomeScreen({ navigation }) {
  const insets = useFrameInsets();
  const {
    reciter,
    setReciterOpen,
    lastSurah,
    saved,
    offline,
    notice,
    clearNotice,
    downloading,
    percent,
    paused,
    readingSurah,
    audio,
    night,
    toggleNight,
  } = useMushaf();
  const [query, setQuery] = useState("");
  const dock = readingSurah || audio ? 168 + insets.bottom : 18 + insets.bottom;

  const data = useMemo(() => SURAHS.filter((surah) => matches(surah, query)), [query]);
  const resume = getSurah(lastSurah || 1);
  const activeSurah = downloading ? getSurah(downloading) : null;

  return (
    <View style={[styles.screen, !night && styles.screenDay]}>
      {night ? <Sky /> : null}
      <FlatList
        data={data}
        keyExtractor={(item) => String(item.n)}
        contentContainerStyle={{ paddingTop: insets.top + 12, paddingBottom: dock + 24, paddingHorizontal: 16 }}
        keyboardShouldPersistTaps="handled"
        ListHeaderComponent={
          <View>
            <View style={styles.brand}>
              <Star size={30} />
              <Text style={[styles.bismillah, !night && styles.inkText]}>{BISMILLAH}</Text>
              <Text style={[styles.title, !night && styles.titleDay]}>مصحف البيت</Text>
              <Text style={[styles.subtitle, !night && styles.softText]}>قراءة هادئة · مهداة للوالد والوالدة</Text>
              <Pressable onPress={toggleNight} style={[styles.mode, !night && styles.modeDay]} accessibilityRole="button">
                <Text style={[styles.modeText, !night && styles.inkText]}>{night ? "نهاري" : "ليلي"}</Text>
              </Pressable>
            </View>
            <GoldRule />

            <View style={[styles.dedication, !night && styles.dedicationDay]} accessibilityRole="text">
              <Text style={styles.dedicationLabel}>إهداء</Text>
              <Text style={[styles.dedicationTo, !night && styles.inkText]}>إلى الوالد والوالدة</Text>
              <Text style={[styles.dedicationBody, !night && styles.softText]}>
                جعل الله قراءة هذا المصحف نورًا في بيوتكم، وذخرًا في ميزان حسناتكم
              </Text>
            </View>

            {offline ? <Text style={styles.banner}>بدون إنترنت · القراءة وما حُفظ من التلاوة يعملان</Text> : null}
            {notice ? (
              <Pressable onPress={clearNotice}>
                <Text style={styles.notice}>{notice}</Text>
              </Pressable>
            ) : null}

            <Pressable
              style={[styles.continue, !night && styles.continueDay]}
              onPress={() => navigation.navigate("Reader", { n: resume.n })}
              accessibilityRole="button"
            >
              <Text style={[styles.kicker, !night && styles.softText]}>{lastSurah ? "تابع من حيث وقفت" : "ابدأ التلاوة"}</Text>
              <Text style={[styles.continueName, !night && styles.inkText]}>{resume.name}</Text>
              <Text style={styles.continueMeta}>{resume.place} · {ar(resume.ayahs.length)} آيات</Text>
            </Pressable>

            <TextInput
              value={query}
              onChangeText={setQuery}
              placeholder="ابحث باسم السورة أو رقمها"
              placeholderTextColor={night ? colors.goldDim : colors.textSoft}
              style={[styles.search, !night && styles.searchDay]}
              textAlign="right"
            />

            <Pressable style={[styles.voice, !night && styles.voiceDay]} onPress={() => setReciterOpen(true)} accessibilityRole="button">
              <Text style={styles.voiceLabel}>القارئ</Text>
              <Text style={[styles.voiceName, !night && styles.inkText]}>{reciter.name}</Text>
              <Text style={[styles.voiceStyle, !night && styles.softText]}>
                {saved.size >= 114 ? "هذا الصوت محفوظ كاملًا" : `${reciter.style} · اضغط للتغيير`}
              </Text>
            </Pressable>

            <Pressable style={styles.juz} onPress={() => navigation.navigate("Downloads")} accessibilityRole="button">
              <Text style={styles.juzTitle}>التنزيل</Text>
              <Text style={styles.juzSub}>
                {activeSurah
                  ? `ينزّل ${activeSurah.name} · ${ar(percent)}٪`
                  : paused
                    ? `متوقف · ${ar(saved.size)} من ${ar(114)}`
                    : saved.size >= 114
                      ? "صوت هذا القارئ محفوظ كاملًا"
                      : `${ar(saved.size)} من ${ar(114)} سورة`}
              </Text>
            </Pressable>

            <Text style={[styles.section, !night && styles.inkText]}>السور كما في المصحف</Text>
          </View>
        }
        ListEmptyComponent={<Text style={[styles.empty, !night && styles.softText]}>لا توجد سورة بهذا الاسم</Text>}
        renderItem={({ item }) => {
          const current = item.n === (lastSurah || 0);
          return (
            <Pressable
              style={[styles.row, !night && styles.rowDay, current && styles.rowOn]}
              onPress={() => navigation.navigate("Reader", { n: item.n })}
              accessibilityRole="button"
            >
              <View style={styles.num}>
                <Text style={styles.numText}>{ar(item.n)}</Text>
              </View>
              <View style={styles.meta}>
                <Text style={[styles.name, !night && styles.inkText]}>{item.name}</Text>
                <Text style={[styles.metaText, !night && styles.softText]}>{item.place} · {ar(item.ayahs.length)} آيات</Text>
              </View>
            </Pressable>
          );
        }}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  screen: {
    flex: 1,
    backgroundColor: colors.ink,
  },
  screenDay: {
    backgroundColor: colors.parchment,
  },
  inkText: {
    color: colors.text,
  },
  softText: {
    color: colors.textSoft,
  },
  titleDay: {
    color: colors.goldDim,
  },
  mode: {
    marginTop: 10,
    borderWidth: 1,
    borderColor: colors.line,
    borderRadius: 16,
    paddingVertical: 8,
    paddingHorizontal: 18,
  },
  modeDay: {
    borderColor: colors.goldDim,
    backgroundColor: colors.parchmentDeep,
  },
  modeText: {
    fontFamily: fonts.uiBold,
    color: colors.goldSoft,
    fontSize: 16,
  },
  continueDay: {
    backgroundColor: colors.parchmentDeep,
  },
  searchDay: {
    color: colors.text,
    backgroundColor: "#fffdf8",
    borderColor: colors.goldDim,
  },
  voiceDay: {
    backgroundColor: "#fffdf8",
  },
  rowDay: {
    backgroundColor: "#fffdf8",
  },
  dedication: {
    marginTop: 4,
    marginBottom: 10,
    borderRadius: 20,
    borderWidth: 1,
    borderColor: colors.gold,
    backgroundColor: "rgba(18, 48, 39, 0.72)",
    paddingVertical: 16,
    paddingHorizontal: 18,
    alignItems: "center",
  },
  dedicationDay: {
    backgroundColor: colors.parchmentDeep,
    borderColor: colors.goldDim,
  },
  dedicationLabel: {
    fontFamily: fonts.ui,
    color: colors.gold,
    fontSize: 13,
    letterSpacing: 1,
  },
  dedicationTo: {
    fontFamily: fonts.display,
    color: colors.goldSoft,
    fontSize: 28,
    marginTop: 4,
    textAlign: "center",
  },
  dedicationBody: {
    fontFamily: fonts.ui,
    color: colors.nightSoft,
    fontSize: 15,
    lineHeight: 24,
    marginTop: 6,
    textAlign: "center",
  },
  brand: {
    alignItems: "center",
    paddingTop: 8,
  },
  bismillah: {
    fontFamily: fonts.quran,
    color: colors.goldSoft,
    fontSize: 22,
    textAlign: "center",
    lineHeight: 42,
    marginTop: 8,
  },
  title: {
    fontFamily: fonts.display,
    color: colors.gold,
    fontSize: 46,
    marginTop: 2,
  },
  subtitle: {
    fontFamily: fonts.ui,
    color: colors.mist,
    fontSize: 16,
    marginTop: 2,
  },
  banner: {
    fontFamily: fonts.ui,
    color: colors.goldSoft,
    backgroundColor: "rgba(198, 161, 91, 0.12)",
    borderRadius: 14,
    padding: 12,
    textAlign: "center",
    overflow: "hidden",
    marginBottom: 8,
  },
  notice: {
    fontFamily: fonts.ui,
    color: colors.danger,
    textAlign: "center",
    marginBottom: 8,
    fontSize: 15,
  },
  continue: {
    backgroundColor: colors.emerald,
    borderRadius: 22,
    borderWidth: 1,
    borderColor: colors.gold,
    paddingVertical: 18,
    paddingHorizontal: 18,
    alignItems: "center",
    marginTop: 8,
  },
  kicker: {
    fontFamily: fonts.ui,
    color: colors.nightSoft,
    fontSize: 15,
  },
  continueName: {
    fontFamily: fonts.display,
    color: colors.goldSoft,
    fontSize: 36,
    marginTop: 2,
  },
  continueMeta: {
    fontFamily: fonts.ui,
    color: colors.gold,
    fontSize: 15,
    marginTop: 2,
  },
  search: {
    marginTop: 14,
    borderWidth: 1,
    borderColor: colors.line,
    borderRadius: 18,
    paddingHorizontal: 16,
    paddingVertical: 14,
    color: colors.goldSoft,
    fontFamily: fonts.ui,
    fontSize: 18,
    backgroundColor: "rgba(18, 48, 39, 0.55)",
  },
  voice: {
    marginTop: 12,
    borderRadius: 18,
    borderWidth: 1,
    borderColor: colors.line,
    paddingVertical: 14,
    paddingHorizontal: 16,
    alignItems: "center",
  },
  voiceLabel: {
    fontFamily: fonts.ui,
    color: colors.goldDim,
    fontSize: 13,
  },
  voiceName: {
    fontFamily: fonts.uiBold,
    color: colors.goldSoft,
    fontSize: 20,
    marginTop: 2,
  },
  voiceStyle: {
    fontFamily: fonts.ui,
    color: colors.nightSoft,
    fontSize: 14,
    marginTop: 2,
  },
  juz: {
    marginTop: 10,
    backgroundColor: colors.gold,
    borderRadius: 18,
    minHeight: 64,
    alignItems: "center",
    justifyContent: "center",
    paddingVertical: 12,
    paddingHorizontal: 12,
  },
  juzTitle: {
    fontFamily: fonts.uiBold,
    color: colors.ink,
    fontSize: 18,
  },
  juzSub: {
    fontFamily: fonts.ui,
    color: "#3d3018",
    fontSize: 13,
    marginTop: 2,
    textAlign: "center",
  },
  keptCard: {
    marginTop: 10,
    borderRadius: 18,
    borderWidth: 1,
    borderColor: colors.gold,
    paddingVertical: 14,
    paddingHorizontal: 16,
    alignItems: "center",
  },
  keptTitle: {
    fontFamily: fonts.uiBold,
    color: colors.goldSoft,
    fontSize: 18,
    textAlign: "center",
  },
  keptBody: {
    fontFamily: fonts.ui,
    color: colors.nightSoft,
    fontSize: 14,
    marginTop: 4,
    textAlign: "center",
  },
  section: {
    fontFamily: fonts.display,
    color: colors.goldSoft,
    fontSize: 26,
    textAlign: "right",
    marginTop: 18,
    marginBottom: 8,
  },
  empty: {
    fontFamily: fonts.ui,
    color: colors.mist,
    textAlign: "center",
    marginTop: 20,
    fontSize: 16,
  },
  row: {
    flexDirection: "row-reverse",
    alignItems: "center",
    gap: 12,
    paddingVertical: 12,
    paddingHorizontal: 10,
    borderRadius: 18,
    marginBottom: 8,
    backgroundColor: "rgba(18, 48, 39, 0.72)",
    borderWidth: 1,
    borderColor: "transparent",
    minHeight: 74,
  },
  rowOn: {
    borderColor: colors.gold,
  },
  rowMain: {
    flex: 1,
    flexDirection: "row-reverse",
    alignItems: "center",
    gap: 12,
  },
  sideCol: {
    alignItems: "center",
    gap: 2,
  },
  action: {
    fontFamily: fonts.uiBold,
    color: colors.gold,
    fontSize: 15,
  },
  num: {
    width: 48,
    height: 48,
    borderRadius: 24,
    borderWidth: 1,
    borderColor: colors.gold,
    alignItems: "center",
    justifyContent: "center",
  },
  numText: {
    fontFamily: fonts.uiBold,
    color: colors.gold,
    fontSize: 16,
  },
  meta: {
    flex: 1,
    alignItems: "flex-end",
  },
  name: {
    fontFamily: fonts.display,
    color: colors.goldSoft,
    fontSize: 26,
  },
  metaText: {
    fontFamily: fonts.ui,
    color: colors.nightSoft,
    fontSize: 14,
    marginTop: 2,
  },
  kept: {
    fontFamily: fonts.uiBold,
    color: colors.gold,
    fontSize: 12,
  },
});
