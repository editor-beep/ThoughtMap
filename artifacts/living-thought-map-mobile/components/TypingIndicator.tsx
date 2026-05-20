import React, { useEffect, useRef } from "react";
import { Animated, StyleSheet, View } from "react-native";

import { useColors } from "@/hooks/useColors";

export default function TypingIndicator() {
  const colors = useColors();
  const dot1 = useRef(new Animated.Value(0.3)).current;
  const dot2 = useRef(new Animated.Value(0.3)).current;
  const dot3 = useRef(new Animated.Value(0.3)).current;

  useEffect(() => {
    const pulse = (dot: Animated.Value, delay: number) =>
      Animated.loop(
        Animated.sequence([
          Animated.delay(delay),
          Animated.timing(dot, { toValue: 1, duration: 350, useNativeDriver: true }),
          Animated.timing(dot, { toValue: 0.3, duration: 350, useNativeDriver: true }),
          Animated.delay(500),
        ])
      );
    const a1 = pulse(dot1, 0);
    const a2 = pulse(dot2, 160);
    const a3 = pulse(dot3, 320);
    a1.start(); a2.start(); a3.start();
    return () => { a1.stop(); a2.stop(); a3.stop(); };
  }, [dot1, dot2, dot3]);

  return (
    <View style={[styles.container, { backgroundColor: colors.card, borderColor: colors.border }]}>
      {[dot1, dot2, dot3].map((dot, i) => (
        <Animated.View key={i} style={[styles.dot, { backgroundColor: colors.cosmicCyan, opacity: dot }]} />
      ))}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flexDirection: "row", alignItems: "center", gap: 5,
    paddingHorizontal: 14, paddingVertical: 10,
    borderRadius: 16, borderBottomLeftRadius: 4, borderWidth: 1,
    marginLeft: 32, marginHorizontal: 14, marginVertical: 3,
    alignSelf: "flex-start",
  },
  dot: { width: 6, height: 6, borderRadius: 3 },
});
