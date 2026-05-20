import { Ionicons } from "@expo/vector-icons";
import React, { useState } from "react";
import { Pressable, StyleSheet, Text, TextInput, View } from "react-native";

import { NodeType } from "@/context/ThoughtContext";
import { useColors } from "@/hooks/useColors";

interface Props {
  id: string;
  role: "user" | "assistant";
  content: string;
  extractedNodeId?: string;
  onExtract?: (id: string, type: NodeType, title: string) => void;
}

export default function MessageBubble({ id, role, content, extractedNodeId, onExtract }: Props) {
  const colors = useColors();
  const [showExtract, setShowExtract] = useState(false);
  const [title, setTitle] = useState("");
  const isUser = role === "user";
  const s = makeStyles(colors);

  return (
    <View style={[s.row, isUser ? s.rowUser : s.rowAssistant]}>
      {!isUser && (
        <View style={s.avatar}>
          <Ionicons name="aperture" size={13} color={colors.cosmicCyan} />
        </View>
      )}
      <View style={[s.bubble, isUser ? s.bubbleUser : s.bubbleAssistant]}>
        <Text style={[s.text, { color: colors.foreground }]}>{content}</Text>

        {!isUser && onExtract && !extractedNodeId && content.length > 10 && (
          <View style={{ marginTop: 8 }}>
            {showExtract ? (
              <View style={[s.extractRow, { backgroundColor: colors.muted, borderColor: colors.border }]}>
                <TextInput
                  style={[s.extractInput, { color: colors.foreground }]}
                  placeholder="Node title..."
                  placeholderTextColor={colors.mutedForeground}
                  value={title}
                  onChangeText={setTitle}
                  autoFocus
                />
                <Pressable onPress={() => { if (title.trim()) { onExtract(id, "thought", title.trim()); setShowExtract(false); setTitle(""); } }}>
                  <Ionicons name="add-circle" size={20} color={colors.cosmicCyan} />
                </Pressable>
                <Pressable onPress={() => setShowExtract(false)} style={{ marginLeft: 6 }}>
                  <Ionicons name="close" size={16} color={colors.mutedForeground} />
                </Pressable>
              </View>
            ) : (
              <Pressable style={s.crystalBtn} onPress={() => setShowExtract(true)}>
                <Ionicons name="git-network-outline" size={11} color={colors.cosmicCyan} />
                <Text style={[s.crystalText, { color: colors.cosmicCyan }]}>Crystallize to node</Text>
              </Pressable>
            )}
          </View>
        )}

        {extractedNodeId && (
          <View style={s.crystalBtn}>
            <Ionicons name="checkmark-circle" size={11} color={colors.cosmicEmerald} />
            <Text style={[s.crystalText, { color: colors.cosmicEmerald }]}>Added to map</Text>
          </View>
        )}
      </View>
    </View>
  );
}

// eslint-disable-next-line @typescript-eslint/no-explicit-any
function makeStyles(colors: any) {
  return StyleSheet.create({
    row: { flexDirection: "row", marginVertical: 3, paddingHorizontal: 14, alignItems: "flex-end" },
    rowUser: { justifyContent: "flex-end" },
    rowAssistant: { justifyContent: "flex-start" },
    avatar: {
      width: 24, height: 24, borderRadius: 12,
      backgroundColor: colors.card,
      borderWidth: 1, borderColor: colors.cosmicCyan + "44",
      alignItems: "center", justifyContent: "center",
      marginRight: 8, marginBottom: 2,
    },
    bubble: { maxWidth: "78%", borderRadius: 16, paddingHorizontal: 14, paddingVertical: 10 },
    bubbleUser: {
      backgroundColor: colors.cosmicCyan + "1a",
      borderWidth: 1, borderColor: colors.cosmicCyan + "44",
      borderBottomRightRadius: 4,
    },
    bubbleAssistant: {
      backgroundColor: colors.card,
      borderWidth: 1, borderColor: colors.border,
      borderBottomLeftRadius: 4,
    },
    text: { fontSize: 14, lineHeight: 20, fontFamily: "Inter_400Regular" },
    extractRow: {
      flexDirection: "row", alignItems: "center",
      borderRadius: 8, borderWidth: 1,
      paddingHorizontal: 8, paddingVertical: 4, gap: 6,
    },
    extractInput: { flex: 1, fontSize: 12, fontFamily: "Inter_400Regular" },
    crystalBtn: { flexDirection: "row", alignItems: "center", gap: 4, marginTop: 4 },
    crystalText: { fontSize: 11, fontFamily: "Inter_400Regular" },
  });
}
