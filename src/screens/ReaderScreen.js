import React, { useEffect, useState } from "react";
import { FlatList, Pressable, StyleSheet, Text, View } from "react-native";
import { useFrameInsets } from "../insets";
import { ar } from "../arabic";
import { useMushaf } from "../MushafContext";
import { BISMILLAH, getSurah } from "../quran";
import { colors, fonts, LAYOUTS, SCALES } from "../theme";
import { Star } from "../components/Ornament";
import SwipeBack from "../components/SwipeBack";

export default function ReaderScreen({ route, navigation }) {
  const n = route.params.n;
  const surah = getSurah(n);
  const insets = useFrameInsets();
  const {
    night,
    toggleNight,
    scaleIndex,
    bumpScale,
    layout,
    setLayout,
    openReading,
    sealSurah,
    setReciterOpen,
    reciter,
    notice,
    audio,
    readingSurah,
  } = useMushaf();
  const size = SCALES[scaleIndex];
  const line = Math.round(size * (layout === "wide" ? 2.55 : 2));
  const ink = night ? styles.nightText : null;
  const showBismillah = n !== 1 && n !== 9;
  const dock = readingSurah || audio ? 168 + insets.bottom : 24 + insets.bottom;
  const [toolsOpen, setToolsOpen] = useState(false);

  useEffect(() => {
    openReading(n);
  }, [n, openReading]);

  return (
    <SwipeBack onBack={() => navigation.goBack()}>
    <View style={[styles.screen, night && styles.screenNight]}>
      <View style={[styles.header, !night && styles.headerDay, { paddingTop: insets.top + 6 }]}>
        <View style={styles.headerRow}>
          <Pressable onPress={() => navigation.goBack()} style={styles.headerBtn} accessibilityRole="button">
            <Text style={[styles.headerBtnText, !night && styles.headerBtnDay]}>رجوع</Text>
          </Pressable>
          <View style={styles.headerTitles}>
            <Text style={[styles.headerName, !night && styles.dayInk]} numberOfLines={1}>{surah.name}</Text>
            <Text style={[styles.headerMeta, !night && styles.daySoft]}>
              {surah.place} · {ar(surah.ayahs.length)} آيات
            </Text>
          </View>
          <Pressable onPress={() => setToolsOpen((open) => !open)} style={styles.headerBtn} accessibilityRole="button">
            <Text style={[styles.headerBtnText, !night && styles.headerBtnDay]}>{toolsOpen ? "إخفاء" : "عرض"}</Text>
          </Pressable>
        </View>
        {toolsOpen ? (
          <View style={styles.panel}>
            <View style={styles.tools}>
              <Pressable style={[styles.tool, !night && styles.toolDay]} onPress={() => bumpScale(-1)} accessibilityRole="button">
                <Text style={[styles.toolText, !night && styles.dayInk]}>أصغر</Text>
              </Pressable>
              <Pressable style={[styles.tool, !night && styles.toolDay]} onPress={() => bumpScale(1)} accessibilityRole="button">
                <Text style={[styles.toolText, !night && styles.dayInk]}>أكبر</Text>
              </Pressable>
              <Pressable style={[styles.tool, !night && styles.toolDay]} onPress={toggleNight} accessibilityRole="button">
                <Text style={[styles.toolText, !night && styles.dayInk]}>{night ? "نهاري" : "ليلي"}</Text>
              </Pressable>
            </View>
            <View style={styles.layouts}>
              {LAYOUTS.map((item) => {
                const on = layout === item.id;
                return (
                  <Pressable
                    key={item.id}
                    onPress={() => setLayout(item.id)}
                    style={[styles.layoutChip, !night && styles.toolDay, on && styles.layoutOn]}
                    accessibilityRole="button"
                  >
                    <Text style={[styles.toolText, !night && !on && styles.dayInk, on && styles.layoutOnText]}>{item.label}</Text>
                  </Pressable>
                );
              })}
            </View>
            <View style={styles.tools}>
              <Pressable style={[styles.tool, !night && styles.toolDay]} onPress={() => setReciterOpen(true)} accessibilityRole="button">
                <Text style={[styles.toolText, !night && styles.dayInk]} numberOfLines={1}>{reciter.name}</Text>
              </Pressable>
              <Pressable
                style={[styles.tool, !night && styles.toolDay]}
                onPress={() => navigation.navigate("Downloads")}
                accessibilityRole="button"
              >
                <Text style={[styles.toolText, !night && styles.dayInk]}>التنزيل</Text>
              </Pressable>
            </View>
          </View>
        ) : null}
        {notice ? <Text style={styles.notice}>{notice}</Text> : null}
      </View>

      <FlatList
        key={`${n}-${layout}`}
        keyExtractor={(_, index) => `${n}-${index}`}
        contentContainerStyle={[styles.page, { paddingBottom: dock + 28 }]}
        ListHeaderComponent={
          <View>
            <View style={styles.surahHead}>
              <View style={styles.surahStar}>
                <Star size={18} color={night ? colors.gold : colors.goldDim} />
              </View>
              <View style={[styles.surahFrame, night && styles.surahFrameNight]}>
                <Text style={[styles.surahTitle, night && styles.nightText]}>{surah.name}</Text>
                <Text style={[styles.surahMeta, !night && styles.daySoft]}>
                  {surah.place} · {ar(surah.ayahs.length)} آيات
                </Text>
              </View>
            </View>
            {showBismillah ? (
              <Text style={[styles.bismillah, ink, { fontSize: size, lineHeight: size * 1.8 }]}>
                {BISMILLAH}
              </Text>
            ) : null}
            {layout === "flow" ? (
              <Text selectable style={[styles.words, styles.flow, ink, { fontSize: size, lineHeight: line }]}>
                {surah.ayahs.map((ayah, index) => (
                  <Text key={index}>
                    {ayah}
                    <Text style={styles.mark}>{` ﴿${ar(index + 1)}﴾ `}</Text>
                  </Text>
                ))}
              </Text>
            ) : null}
          </View>
        }
        data={layout === "flow" ? [] : surah.ayahs}
        renderItem={({ item, index }) => (
          <View style={[styles.ayah, layout === "wide" && styles.ayahWide, night && styles.ayahNight]}>
            <View style={styles.badge}>
              <Text style={styles.badgeText}>{ar(index + 1)}</Text>
            </View>
            <Text
              selectable
              style={[
                styles.words,
                ink,
                { fontSize: size, lineHeight: line },
              ]}
            >
              {item}
            </Text>
          </View>
        )}
        ListFooterComponent={
          <Pressable style={styles.seal} onPress={sealSurah} accessibilityRole="button">
            <Text style={styles.sealTitle}>ختم السورة</Text>
            <Text style={styles.sealSub}>ميعاد كاظم وعدنان لطيف</Text>
          </Pressable>
        }
      />
    </View>
    </SwipeBack>
  );
}

const styles = StyleSheet.create({
  screen: {
    flex: 1,
    backgroundColor: colors.parchment,
  },
  screenNight: {
    backgroundColor: colors.inkSoft,
  },
  header: {
    backgroundColor: colors.ink,
    paddingHorizontal: 16,
    paddingBottom: 8,
    borderBottomWidth: 1,
    borderBottomColor: colors.line,
  },
  panel: {
    marginTop: 8,
    gap: 8,
  },
  headerDay: {
    backgroundColor: colors.parchment,
    borderBottomColor: "rgba(140, 106, 56, 0.28)",
  },
  headerBtnDay: {
    color: colors.goldDim,
  },
  dayInk: {
    color: colors.text,
  },
  daySoft: {
    color: colors.textSoft,
  },
  toolDay: {
    borderColor: colors.goldDim,
    backgroundColor: "#fffdf8",
  },
  headerRow: {
    flexDirection: "row-reverse",
    alignItems: "center",
    gap: 8,
  },
  headerBtn: {
    minWidth: 64,
    minHeight: 46,
    alignItems: "center",
    justifyContent: "center",
    paddingHorizontal: 6,
  },
  headerBtnText: {
    fontFamily: fonts.uiBold,
    color: colors.gold,
    fontSize: 16,
  },
  headerTitles: {
    flex: 1,
    alignItems: "center",
  },
  headerName: {
    fontFamily: fonts.display,
    color: colors.goldSoft,
    fontSize: 28,
  },
  headerMeta: {
    fontFamily: fonts.ui,
    color: colors.nightSoft,
    fontSize: 13,
  },
  tools: {
    flexDirection: "row-reverse",
    gap: 8,
    marginTop: 4,
  },
  layouts: {
    flexDirection: "row-reverse",
    gap: 8,
    marginTop: 8,
  },
  layoutChip: {
    flex: 1,
    minHeight: 40,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: colors.line,
    alignItems: "center",
    justifyContent: "center",
  },
  layoutOn: {
    backgroundColor: colors.gold,
    borderColor: colors.gold,
  },
  layoutOnText: {
    color: colors.ink,
  },
  tool: {
    flex: 1,
    minHeight: 42,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: colors.line,
    alignItems: "center",
    justifyContent: "center",
    paddingHorizontal: 4,
  },
  toolText: {
    fontFamily: fonts.uiBold,
    color: colors.goldSoft,
    fontSize: 14,
  },
  notice: {
    fontFamily: fonts.ui,
    color: colors.danger,
    textAlign: "center",
    marginTop: 8,
  },
  page: {
    paddingHorizontal: 16,
  },
  surahHead: {
    alignItems: "center",
    marginTop: 16,
    marginBottom: 8,
  },
  surahStar: {
    marginBottom: -9,
    zIndex: 1,
  },
  surahFrame: {
    alignSelf: "stretch",
    marginHorizontal: 24,
    borderWidth: 1,
    borderColor: colors.goldDim,
    borderRadius: 22,
    paddingTop: 16,
    paddingBottom: 12,
    paddingHorizontal: 12,
    alignItems: "center",
    backgroundColor: "rgba(198, 161, 91, 0.07)",
  },
  surahFrameNight: {
    borderColor: colors.gold,
    backgroundColor: "rgba(198, 161, 91, 0.08)",
  },
  surahTitle: {
    fontFamily: fonts.display,
    fontSize: 34,
    color: colors.goldDim,
    textAlign: "center",
  },
  surahMeta: {
    fontFamily: fonts.ui,
    color: colors.nightSoft,
    fontSize: 14,
    marginTop: 2,
    textAlign: "center",
  },
  bismillah: {
    fontFamily: fonts.quran,
    color: colors.text,
    textAlign: "center",
    marginBottom: 12,
  },
  ayah: {
    flexDirection: "row-reverse",
    alignItems: "flex-start",
    gap: 10,
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: "rgba(140, 106, 56, 0.18)",
  },
  ayahNight: {
    borderBottomColor: "rgba(198, 161, 91, 0.16)",
  },
  ayahWide: {
    paddingVertical: 22,
  },
  flow: {
    marginTop: 8,
  },
  mark: {
    color: colors.goldDim,
  },
  badge: {
    width: 36,
    height: 36,
    borderRadius: 18,
    borderWidth: 1,
    borderColor: colors.goldDim,
    alignItems: "center",
    justifyContent: "center",
    marginTop: 6,
  },
  badgeText: {
    fontFamily: fonts.uiBold,
    color: colors.goldDim,
    fontSize: 12,
  },
  words: {
    flex: 1,
    fontFamily: fonts.quran,
    color: colors.text,
    textAlign: "right",
    writingDirection: "rtl",
  },
  nightText: {
    color: colors.nightText,
  },
  seal: {
    marginTop: 22,
    marginBottom: 8,
    backgroundColor: colors.ink,
    borderRadius: 22,
    borderWidth: 1,
    borderColor: colors.gold,
    paddingVertical: 18,
    paddingHorizontal: 16,
    alignItems: "center",
  },
  sealTitle: {
    fontFamily: fonts.display,
    color: colors.gold,
    fontSize: 30,
  },
  sealSub: {
    fontFamily: fonts.ui,
    color: colors.goldSoft,
    fontSize: 15,
    marginTop: 4,
    textAlign: "center",
  },
});
