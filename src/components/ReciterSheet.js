import React, { useMemo, useState } from "react";
import { FlatList, Modal, Pressable, StyleSheet, Text, TextInput, View } from "react-native";
import { useFrameInsets } from "../insets";
import { strip } from "../arabic";
import { useMushaf } from "../MushafContext";
import { colors, fonts } from "../theme";
import { Star } from "./Ornament";

export default function ReciterSheet() {
  const insets = useFrameInsets();
  const { reciterOpen, setReciterOpen, reciters, reciter, chooseReciter, night } = useMushaf();
  const [query, setQuery] = useState("");

  const rows = useMemo(() => {
    const needle = strip(query);
    if (!needle) return reciters;
    return reciters.filter((item) => strip(item.name).includes(needle) || strip(item.style).includes(needle));
  }, [query, reciters]);

  return (
    <Modal visible={reciterOpen} animationType="slide" transparent onRequestClose={() => setReciterOpen(false)}>
      <Pressable style={styles.backdrop} onPress={() => setReciterOpen(false)} />
      <View style={[styles.sheet, !night && styles.sheetDay, { paddingBottom: Math.max(insets.bottom, 16) }]}>
        <View style={styles.handle} />
        <View style={styles.titleRow}>
          <Star size={18} />
          <Text style={[styles.title, !night && styles.dayInk]}>اختر القارئ</Text>
        </View>
        <TextInput
          value={query}
          onChangeText={setQuery}
          placeholder="ابحث عن قارئ"
          placeholderTextColor={night ? colors.goldDim : colors.textSoft}
          style={[styles.search, !night && styles.searchDay]}
          textAlign="right"
        />
        <FlatList
          data={rows}
          keyExtractor={(item) => item.id}
          keyboardShouldPersistTaps="handled"
          renderItem={({ item }) => {
            const selected = item.id === reciter.id;
            return (
              <Pressable
                onPress={() => chooseReciter(item)}
                style={[styles.row, selected && styles.rowOn]}
                accessibilityRole="button"
              >
                <View style={styles.copy}>
                  <Text style={[styles.name, !night && styles.dayInk]}>{item.name}</Text>
                  <Text style={[styles.style, !night && styles.daySoft]}>{item.style}</Text>
                </View>
                <View style={[styles.mark, selected && styles.markOn]} />
              </Pressable>
            );
          }}
        />
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  backdrop: {
    flex: 1,
    backgroundColor: "rgba(4, 10, 8, 0.55)",
  },
  sheet: {
    maxHeight: "78%",
    backgroundColor: colors.emeraldDeep,
    borderTopLeftRadius: 28,
    borderTopRightRadius: 28,
    borderWidth: 1,
    borderColor: colors.line,
    paddingHorizontal: 18,
    paddingTop: 10,
  },
  sheetDay: {
    backgroundColor: colors.parchment,
    borderColor: colors.goldDim,
  },
  searchDay: {
    color: colors.text,
    backgroundColor: "#fffdf8",
    borderColor: colors.goldDim,
  },
  dayInk: {
    color: colors.text,
  },
  daySoft: {
    color: colors.textSoft,
  },
  handle: {
    alignSelf: "center",
    width: 56,
    height: 4,
    borderRadius: 4,
    backgroundColor: colors.goldDim,
    marginBottom: 12,
  },
  titleRow: {
    flexDirection: "row-reverse",
    alignItems: "center",
    gap: 8,
    marginBottom: 12,
  },
  title: {
    fontFamily: fonts.display,
    color: colors.goldSoft,
    fontSize: 28,
  },
  search: {
    borderWidth: 1,
    borderColor: colors.line,
    borderRadius: 16,
    paddingHorizontal: 16,
    paddingVertical: 12,
    color: colors.goldSoft,
    fontFamily: fonts.ui,
    fontSize: 18,
    marginBottom: 10,
    backgroundColor: "rgba(7, 20, 16, 0.45)",
  },
  row: {
    flexDirection: "row-reverse",
    alignItems: "center",
    gap: 12,
    paddingVertical: 14,
    paddingHorizontal: 12,
    borderRadius: 16,
    marginBottom: 6,
  },
  rowOn: {
    backgroundColor: "rgba(198, 161, 91, 0.14)",
    borderWidth: 1,
    borderColor: colors.line,
  },
  copy: {
    flex: 1,
    alignItems: "flex-end",
  },
  name: {
    fontFamily: fonts.uiBold,
    color: colors.goldSoft,
    fontSize: 20,
  },
  style: {
    fontFamily: fonts.ui,
    color: colors.nightSoft,
    fontSize: 15,
    marginTop: 2,
  },
  mark: {
    width: 14,
    height: 14,
    borderRadius: 7,
    borderWidth: 1,
    borderColor: colors.goldDim,
  },
  markOn: {
    backgroundColor: colors.gold,
    borderColor: colors.gold,
  },
});
