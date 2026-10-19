import React from "react";
import { Modal, Pressable, ScrollView, StyleSheet, Text, View } from "react-native";
import { useFrameInsets } from "../insets";
import { ar } from "../arabic";
import { useMushaf } from "../MushafContext";
import { FATIHA_AYAHS, getSurah } from "../quran";
import { colors, fonts, SCALES } from "../theme";
import { GoldRule, Star } from "./Ornament";

export default function FatihaModal() {
  const insets = useFrameInsets();
  const { fatiha, closeFatiha, listenFatiha, status, pause, showSurah, scaleIndex, loadingAudio, night } = useMushaf();
  const from = getSurah(fatiha.fromSurah);
  const size = Math.max(26, SCALES[scaleIndex] - 4);
  const playingFatiha = status.playing && fatiha.phase === "listening";
  const loadingFatiha = fatiha.phase === "listening" && loadingAudio && !status.playing;
  const next = fatiha.fromSurah < 114 ? fatiha.fromSurah + 1 : null;

  return (
    <Modal visible={fatiha.visible} animationType="fade" transparent onRequestClose={closeFatiha}>
      <View style={styles.backdrop}>
        <ScrollView
          contentContainerStyle={[styles.scroll, { paddingTop: insets.top + 16, paddingBottom: insets.bottom + 16 }]}
          showsVerticalScrollIndicator={false}
        >
          <View style={[styles.card, !night && styles.cardDay]}>
            <View style={styles.starWrap}>
              <Star size={36} />
            </View>
            <GoldRule />
            <Text style={[styles.kicker, !night && styles.daySoft]}>سورة الفاتحة</Text>
            <Text style={styles.person} numberOfLines={1} adjustsFontSizeToFit>
              ميعاد كاظم وعدنان لطيف
            </Text>
            {from ? <Text style={[styles.after, !night && styles.daySoft]}>بعد إتمام سورة {from.name}</Text> : null}

            <View style={[styles.page, night && styles.pageNight]}>
              {FATIHA_AYAHS.map((ayah, index) => (
                <Text key={index} style={[styles.ayah, night && styles.ayahNight, { fontSize: size, lineHeight: size * 1.9 }]}>
                  {ayah}
                  <Text style={styles.mark}>{`  ﴿${ar(index + 1)}﴾`}</Text>
                </Text>
              ))}
            </View>

            {fatiha.phase === "accepted" ? <Text style={styles.accepted}>تقبّل الله</Text> : null}

            {fatiha.phase !== "accepted" ? (
              <Pressable
                style={styles.listen}
                onPress={playingFatiha ? pause : loadingFatiha ? undefined : listenFatiha}
                accessibilityRole="button"
              >
                <Text style={styles.listenText}>
                  {playingFatiha ? "إيقاف مؤقت" : loadingFatiha ? "جاري التحميل" : "استماع الفاتحة"}
                </Text>
              </Pressable>
            ) : null}

            <View style={styles.actions}>
              {next ? (
                <Pressable
                  style={styles.next}
                  onPress={() => showSurah(next)}
                  accessibilityRole="button"
                >
                  <Text style={styles.nextText}>السورة التالية</Text>
                </Pressable>
              ) : null}
              <Pressable style={styles.amin} onPress={closeFatiha} accessibilityRole="button">
                <Text style={[styles.aminText, !night && styles.dayInk]}>آمين</Text>
              </Pressable>
            </View>
          </View>
        </ScrollView>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  backdrop: {
    flex: 1,
    backgroundColor: "rgba(4, 12, 10, 0.88)",
  },
  scroll: {
    flexGrow: 1,
    justifyContent: "center",
    paddingHorizontal: 16,
  },
  card: {
    backgroundColor: colors.ink,
    borderRadius: 28,
    borderWidth: 1,
    borderColor: colors.gold,
    paddingHorizontal: 20,
    paddingTop: 22,
    paddingBottom: 18,
  },
  cardDay: {
    backgroundColor: colors.parchment,
  },
  dayInk: {
    color: colors.text,
  },
  daySoft: {
    color: colors.textSoft,
  },
  pageNight: {
    backgroundColor: colors.inkSoft,
    borderColor: colors.line,
  },
  ayahNight: {
    color: colors.nightText,
  },
  starWrap: {
    alignItems: "center",
    marginBottom: 8,
  },
  kicker: {
    fontFamily: fonts.ui,
    color: colors.nightSoft,
    fontSize: 16,
    textAlign: "center",
  },
  person: {
    fontFamily: fonts.display,
    color: colors.gold,
    fontSize: 40,
    textAlign: "center",
    lineHeight: 58,
  },
  after: {
    fontFamily: fonts.ui,
    color: colors.nightSoft,
    fontSize: 15,
    textAlign: "center",
    marginTop: 4,
  },
  page: {
    marginTop: 16,
    backgroundColor: colors.parchment,
    borderRadius: 18,
    borderWidth: 1,
    borderColor: colors.goldDim,
    paddingHorizontal: 16,
    paddingVertical: 14,
  },
  ayah: {
    fontFamily: fonts.quran,
    color: colors.text,
    textAlign: "center",
    marginBottom: 8,
  },
  mark: {
    color: colors.goldDim,
    fontSize: 18,
  },
  accepted: {
    fontFamily: fonts.display,
    color: colors.gold,
    fontSize: 36,
    textAlign: "center",
    marginTop: 16,
  },
  listen: {
    marginTop: 16,
    backgroundColor: colors.gold,
    borderRadius: 18,
    minHeight: 58,
    alignItems: "center",
    justifyContent: "center",
  },
  listenText: {
    fontFamily: fonts.uiBold,
    color: colors.ink,
    fontSize: 20,
  },
  actions: {
    flexDirection: "row-reverse",
    gap: 10,
    marginTop: 12,
  },
  amin: {
    flex: 1,
    minHeight: 54,
    borderRadius: 16,
    borderWidth: 1,
    borderColor: colors.gold,
    alignItems: "center",
    justifyContent: "center",
  },
  aminText: {
    fontFamily: fonts.display,
    color: colors.goldSoft,
    fontSize: 26,
  },
  next: {
    flex: 1,
    minHeight: 54,
    borderRadius: 16,
    backgroundColor: colors.emerald,
    alignItems: "center",
    justifyContent: "center",
    borderWidth: 1,
    borderColor: colors.line,
  },
  nextText: {
    fontFamily: fonts.uiBold,
    color: colors.goldSoft,
    fontSize: 16,
  },
});
