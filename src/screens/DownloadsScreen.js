import React from "react";
import { FlatList, Pressable, StyleSheet, Text, View } from "react-native";
import { useFrameInsets } from "../insets";
import { ar } from "../arabic";
import { useMushaf } from "../MushafContext";
import { getSurah, SURAHS } from "../quran";
import { colors, fonts } from "../theme";
import SwipeBack from "../components/SwipeBack";

export default function DownloadsScreen({ navigation }) {
  const insets = useFrameInsets();
  const {
    night,
    reciter,
    setReciterOpen,
    saved,
    downloading,
    percent,
    paused,
    notice,
    clearNotice,
    downloadFull,
    downloadSurah,
    removeDownload,
    cancelBatch,
    audio,
    readingSurah,
  } = useMushaf();
  const dock = readingSurah || audio ? 168 + insets.bottom : 24 + insets.bottom;
  const activeSurah = downloading ? getSurah(downloading) : null;
  const complete = saved.size >= 114;

  const onMain = () => {
    if (downloading) cancelBatch();
    else downloadFull();
  };

  return (
    <SwipeBack onBack={() => navigation.goBack()}>
    <View style={[styles.screen, !night && styles.screenDay]}>
      <FlatList
        data={SURAHS}
        keyExtractor={(item) => String(item.n)}
        contentContainerStyle={{ paddingTop: insets.top + 8, paddingBottom: dock + 24, paddingHorizontal: 16 }}
        ListHeaderComponent={
          <View>
            <View style={styles.top}>
              <Pressable onPress={() => navigation.goBack()} accessibilityRole="button">
                <Text style={[styles.back, !night && styles.dayGold]}>رجوع</Text>
              </Pressable>
              <Text style={[styles.title, !night && styles.dayInk]}>التنزيل</Text>
            </View>

            <Pressable style={[styles.voice, !night && styles.cardDay]} onPress={() => setReciterOpen(true)} accessibilityRole="button">
              <Text style={styles.voiceLabel}>صوت هذا القارئ</Text>
              <Text style={[styles.voiceName, !night && styles.dayInk]}>{reciter.name}</Text>
              <Text style={[styles.voiceStyle, !night && styles.daySoft]}>{reciter.style} · اضغط للتغيير</Text>
            </Pressable>

            <Pressable style={styles.main} onPress={onMain} accessibilityRole="button">
              <Text style={styles.mainTitle}>
                {downloading ? "إيقاف" : paused ? "استئناف" : complete ? "محفوظ كاملًا" : "تنزيل القرآن"}
              </Text>
              <Text style={styles.mainSub}>
                {activeSurah
                  ? `${activeSurah.name} · ${ar(percent)}٪`
                  : `${ar(saved.size)} من ${ar(114)} سورة`}
              </Text>
            </Pressable>

            {notice ? (
              <Pressable onPress={clearNotice}>
                <Text style={styles.notice}>{notice}</Text>
              </Pressable>
            ) : null}

            <Text style={[styles.section, !night && styles.dayInk]}>سور هذا الصوت</Text>
          </View>
        }
        renderItem={({ item }) => {
          const kept = saved.has(item.n);
          const active = downloading === item.n;
          return (
            <View style={[styles.row, !night && styles.cardDay]}>
              <View style={styles.num}>
                <Text style={styles.numText}>{ar(item.n)}</Text>
              </View>
              <View style={styles.meta}>
                <Text style={[styles.name, !night && styles.dayInk]}>{item.name}</Text>
                <Text style={[styles.metaText, !night && styles.daySoft]}>
                  {active ? `${ar(percent)}٪` : kept ? "محفوظة" : "غير محفوظة"}
                </Text>
              </View>
              <Pressable
                onPress={() => {
                  if (active) cancelBatch();
                  else if (kept) removeDownload(item.n);
                  else if (!downloading) downloadSurah(item.n);
                }}
                disabled={!active && !kept && Boolean(downloading)}
                accessibilityRole="button"
              >
                <Text style={styles.action}>
                  {active ? "إيقاف" : kept ? "حذف" : downloading ? "بالدور" : "تنزيل"}
                </Text>
              </Pressable>
            </View>
          );
        }}
      />
    </View>
    </SwipeBack>
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
  top: {
    flexDirection: "row-reverse",
    alignItems: "center",
    justifyContent: "space-between",
    marginBottom: 14,
  },
  back: {
    fontFamily: fonts.uiBold,
    color: colors.gold,
    fontSize: 16,
    minWidth: 64,
    textAlign: "right",
  },
  dayGold: {
    color: colors.goldDim,
  },
  title: {
    fontFamily: fonts.display,
    color: colors.goldSoft,
    fontSize: 34,
  },
  dayInk: {
    color: colors.text,
  },
  daySoft: {
    color: colors.textSoft,
  },
  voice: {
    borderRadius: 18,
    borderWidth: 1,
    borderColor: colors.line,
    paddingVertical: 14,
    paddingHorizontal: 16,
    alignItems: "center",
  },
  cardDay: {
    backgroundColor: "#fffdf8",
    borderColor: "rgba(140, 106, 56, 0.28)",
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
  main: {
    marginTop: 12,
    backgroundColor: colors.gold,
    borderRadius: 18,
    minHeight: 72,
    alignItems: "center",
    justifyContent: "center",
    paddingVertical: 12,
    paddingHorizontal: 12,
  },
  mainTitle: {
    fontFamily: fonts.uiBold,
    color: colors.ink,
    fontSize: 20,
  },
  mainSub: {
    fontFamily: fonts.ui,
    color: "#3d3018",
    fontSize: 14,
    marginTop: 2,
  },
  notice: {
    fontFamily: fonts.ui,
    color: colors.danger,
    textAlign: "center",
    marginTop: 10,
    fontSize: 15,
  },
  section: {
    fontFamily: fonts.display,
    color: colors.goldSoft,
    fontSize: 26,
    textAlign: "right",
    marginTop: 18,
    marginBottom: 8,
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
    minHeight: 70,
  },
  num: {
    width: 42,
    height: 42,
    borderRadius: 21,
    borderWidth: 1,
    borderColor: colors.gold,
    alignItems: "center",
    justifyContent: "center",
  },
  numText: {
    fontFamily: fonts.uiBold,
    color: colors.gold,
    fontSize: 15,
  },
  meta: {
    flex: 1,
    alignItems: "flex-end",
  },
  name: {
    fontFamily: fonts.display,
    color: colors.goldSoft,
    fontSize: 24,
  },
  metaText: {
    fontFamily: fonts.ui,
    color: colors.nightSoft,
    fontSize: 14,
    marginTop: 2,
  },
  action: {
    fontFamily: fonts.uiBold,
    color: colors.gold,
    fontSize: 15,
    minWidth: 64,
    textAlign: "center",
  },
});
