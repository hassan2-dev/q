import React, { useState } from "react";
import { Pressable, StyleSheet, Text, View } from "react-native";
import { useFrameInsets } from "../insets";
import { clock } from "../arabic";
import { useMushaf } from "../MushafContext";
import { getSurah } from "../quran";
import { colors, fonts } from "../theme";

export default function PlayerDock() {
  const insets = useFrameInsets();
  const { readingSurah, audio, status, loadingAudio, togglePlay, seek, goSurah, reciter, visibleRoute, returnToSurah, night } = useMushaf();
  const [width, setWidth] = useState(1);
  const surahNumber = readingSurah || audio?.surah;
  if (!surahNumber) return null;

  const surah = getSurah(surahNumber);
  const ratio = status.duration ? Math.min(1, status.currentTime / status.duration) : 0;
  const withHours = status.duration >= 3600;
  const onThisSurah = visibleRoute.name === "Reader" && visibleRoute.n === surahNumber;
  const title = audio?.kind === "fatiha" ? "ميعاد كاظم وعدنان لطيف" : surah.name;
  const subtitle = audio?.kind === "fatiha" ? reciter.name : `${reciter.name} · ${reciter.style}`;

  const onJewel = () => {
    if (!onThisSurah) returnToSurah(surahNumber);
    else togglePlay();
  };

  return (
    <View style={[styles.dock, !night && styles.dockDay, { paddingBottom: Math.max(insets.bottom, 10) }]}>
      <View style={styles.top}>
        <Pressable style={styles.side} onPress={() => goSurah(surahNumber + 1)} accessibilityRole="button">
          <Text style={[styles.sideText, !night && styles.dayInk]}>التالية</Text>
        </Pressable>
        <Pressable style={[styles.play, !night && styles.playDay]} onPress={onJewel} accessibilityRole="button" accessibilityLabel={onThisSurah ? "تشغيل" : "الرجوع إلى السورة"}>
          <Text style={[styles.playIcon, !onThisSurah && styles.jewelWord]}>{onThisSurah ? (status.playing ? "❚❚" : "▶") : "السورة"}</Text>
        </Pressable>
        <Pressable style={styles.side} onPress={() => goSurah(surahNumber - 1)} accessibilityRole="button">
          <Text style={[styles.sideText, !night && styles.dayInk]}>السابقة</Text>
        </Pressable>
      </View>
      <Pressable onPress={() => returnToSurah(surahNumber)} accessibilityRole="button">
        <Text style={[styles.title, !night && styles.dayInk]} numberOfLines={1}>{title}</Text>
        <Text style={[styles.sub, !night && styles.daySoft]} numberOfLines={2}>
          {onThisSurah ? (loadingAudio ? "جاري التحميل" : subtitle) : "اضغط الجوهرة للرجوع إلى السورة"}
          {onThisSurah && audio?.local ? " · محفوظة" : ""}
        </Text>
      </Pressable>
      <Pressable
        onLayout={(event) => setWidth(event.nativeEvent.layout.width)}
        onPress={(event) => seek(event.nativeEvent.locationX / width)}
        style={styles.trackHit}
        accessibilityRole="adjustable"
      >
        <View style={styles.track}>
          <View style={[styles.fill, { width: `${ratio * 100}%` }]} />
        </View>
      </Pressable>
      <View style={styles.times}>
        <Text style={[styles.time, !night && styles.daySoft]}>{clock(status.duration, withHours)}</Text>
        {onThisSurah ? null : (
          <Pressable onPress={togglePlay} accessibilityRole="button">
            <Text style={[styles.sideText, !night && styles.dayInk]}>{status.playing ? "إيقاف" : "تشغيل"}</Text>
          </Pressable>
        )}
        <Text style={[styles.time, !night && styles.daySoft]}>{clock(status.currentTime, withHours)}</Text>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  dock: {
    position: "absolute",
    left: 0,
    right: 0,
    bottom: 0,
    backgroundColor: "#081611",
    borderTopWidth: 1,
    borderTopColor: colors.line,
    paddingTop: 10,
    paddingHorizontal: 16,
  },
  dockDay: {
    backgroundColor: colors.parchment,
    borderTopColor: "rgba(140, 106, 56, 0.28)",
  },
  playDay: {
    borderColor: colors.parchment,
  },
  dayInk: {
    color: colors.text,
  },
  daySoft: {
    color: colors.textSoft,
  },
  top: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
  },
  side: {
    minWidth: 84,
    minHeight: 44,
    alignItems: "center",
    justifyContent: "center",
  },
  sideText: {
    fontFamily: fonts.uiBold,
    color: colors.goldSoft,
    fontSize: 16,
  },
  play: {
    width: 74,
    height: 74,
    borderRadius: 37,
    backgroundColor: colors.gold,
    alignItems: "center",
    justifyContent: "center",
    marginTop: -28,
    borderWidth: 3,
    borderColor: "#081611",
  },
  playIcon: {
    color: colors.ink,
    fontSize: 22,
    marginTop: -2,
  },
  jewelWord: {
    fontFamily: fonts.uiBold,
    fontSize: 16,
    marginTop: 0,
  },
  title: {
    fontFamily: fonts.display,
    color: colors.goldSoft,
    fontSize: 26,
    textAlign: "center",
    marginTop: 4,
  },
  sub: {
    fontFamily: fonts.ui,
    color: colors.nightSoft,
    fontSize: 14,
    textAlign: "center",
    marginTop: 2,
  },
  trackHit: {
    marginTop: 10,
    paddingVertical: 8,
  },
  track: {
    height: 6,
    borderRadius: 6,
    backgroundColor: "rgba(198, 161, 91, 0.25)",
    overflow: "hidden",
    direction: "ltr",
  },
  fill: {
    height: "100%",
    backgroundColor: colors.gold,
  },
  times: {
    flexDirection: "row",
    justifyContent: "space-between",
  },
  time: {
    fontFamily: fonts.ui,
    color: colors.goldDim,
    fontSize: 13,
  },
});
