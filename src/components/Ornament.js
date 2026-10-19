import React from "react";
import { StyleSheet, View } from "react-native";
import Svg, { Circle, Path } from "react-native-svg";
import { colors } from "../theme";

export function Star({ size = 28, color = colors.gold, strokeWidth = 1.5 }) {
  return (
    <Svg width={size} height={size} viewBox="0 0 64 64">
      <Path d="M32 4 L38.5 24 L58 32 L38.5 40 L32 60 L25.5 40 L6 32 L25.5 24 Z" stroke={color} strokeWidth={strokeWidth} fill="none" />
      <Circle cx="32" cy="32" r="6.5" stroke={color} strokeWidth={strokeWidth * 0.8} fill="none" />
    </Svg>
  );
}

export function GoldRule() {
  return (
    <View style={styles.rule}>
      <View style={styles.line} />
      <Star size={14} />
      <View style={styles.line} />
    </View>
  );
}

export function Sky() {
  return (
    <View pointerEvents="none" style={StyleSheet.absoluteFill}>
      <View style={[styles.starPos, { top: 28, left: 22, opacity: 0.35 }]}>
        <Star size={22} />
      </View>
      <View style={[styles.starPos, { top: 90, right: 28, opacity: 0.22 }]}>
        <Star size={16} />
      </View>
      <View style={[styles.starPos, { bottom: 140, left: 18, opacity: 0.16 }]}>
        <Star size={18} />
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  rule: {
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
    marginVertical: 8,
  },
  line: {
    flex: 1,
    height: 1,
    backgroundColor: colors.line,
  },
  starPos: {
    position: "absolute",
  },
});
