import { Ionicons } from "@expo/vector-icons";
import React, { useState } from "react";
import { Pressable, ScrollView, StyleSheet, Text, TextInput, View } from "react-native";

import { NodeType, Realm } from "@/context/ThoughtContext";
import { useColors } from "@/hooks/useColors";

interface Props {
  id: string;
  role: "user" | "assistant";
  content: string;
  extractedNodeId?: string;
  realms?: Realm[];
  onExtract?: (id: string, type: NodeType, title: string, realmId?: string) => void;
}

export default function MessageBubble({ id, role, content, extractedNodeId, realms = [], onExtract }: Props) {
  const colors = useColors();
  const [showExtract, setShowExtract] = useState(false);
  const [title, setTitle] = useState("");
  const [selectedRealm, setSelectedRealm] = useState<string>("");
  const isUser = role === "user";
  const s = makeStyles(colors);

  const handleCommit = () => {
    if (!title.trim()) return;
    onExtract?.(id, "thought", title.trim(), selectedRealm || undefined);
    setShowExtract(false);
    setTitle("");
    setSelectedRealm("");
  };

  const handleOpen = () => {
    setShowExtract(true);
    setTitle("");
    setSelectedRealm("");
  };

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
              <View style={[s.extractPanel, { backgroundColor: colors.muted, borderColor: colors.border }]}>
                <TextInput
                  style={[s.extractInput, { color: colors.foreground, borderColor: colors.border }]}
                  placeholder="Node title..."
                  placeholderTextColor={colors.mutedForeground}
                  value={title}
                  onChangeText={setTitle}
                  onSubmitEditing={handleCommit}
                  returnKeyType="done"
                  autoFocus
                />

                {realms.length > 0 && (
                  <ScrollView horizontal showsHorizontalScrollIndicator={false} style={{ marginTop: 6 }}>
                    <View style={s.realmRow}>
                      <Pressable
                        onPress={() => setSelectedRealm("")}
                        style={[
                          s.realmPill,
                          { borderColor: selectedRealm === "" ? colors.cosmicCyan : colors.border },
                          selectedRealm === "" && { backgroundColor: colors.cosmicCyan + "22" },
                        ]}
                      >
                        <Text style={[s.realmPillText, { color: selectedRealm === "" ? colors.cosmicCyan : colors.mutedForeground }]}>
                          None
                        </Text>
                      </Pressable>
                      {realms.map((r) => (
                        <Pressable
                          key={r.id}
                          onPress={() => setSelectedRealm(r.id)}
                          style={[
                            s.realmPill,
                            { borderColor: selectedRealm === r.id ? r.color : colors.border },
                            selectedRealm === r.id && { backgroundColor: r.color + "22" },
                          ]}
                        >
                          <View style={[s.realmDot, { backgroundColor: r.color }]} />
                          <Text style={[s.realmPillText, { color: selectedRealm === r.id ? r.color : colors.mutedForeground }]}>
                            {r.name}
                          </Text>
                        </Pressable>
                      ))}
                    </View>
                  </ScrollView>
                )}

                <View style={s.extractActions}>
                  <Pressable onPress={() => { setShowExtract(false); setTitle(""); setSelectedRealm(""); }}>
                    <Ionicons name="close" size={16} color={colors.mutedForeground} />
                  </Pressable>
                  <Pressable
                    onPress={handleCommit}
                    disabled={!title.trim()}
                    style={{ opacity: title.trim() ? 1 : 0.4 }}
                  >
                    <Ionicons name="add-circle" size={22} color={colors.cosmicCyan} />
                  </Pressable>
                </View>
              </View>
            ) : (
              <Pressable style={s.crystalBtn} onPress={handleOpen}>
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
    extractPanel: {
      borderRadius: 10, borderWidth: 1,
      paddingHorizontal: 10, paddingVertical: 8,
      gap: 0,
    },
    extractInput: {
      fontSize: 12, fontFamily: "Inter_400Regular",
      borderWidth: 1, borderRadius: 6,
      paddingHorizontal: 8, paddingVertical: 5,
      backgroundColor: "transparent",
    },
    realmRow: { flexDirection: "row", gap: 5, paddingBottom: 2 },
    realmPill: {
      flexDirection: "row", alignItems: "center", gap: 4,
      borderWidth: 1, borderRadius: 20,
      paddingHorizontal: 8, paddingVertical: 3,
    },
    realmDot: { width: 5, height: 5, borderRadius: 3 },
    realmPillText: { fontSize: 10, fontFamily: "Inter_400Regular" },
    extractActions: {
      flexDirection: "row", justifyContent: "flex-end",
      alignItems: "center", gap: 10, marginTop: 6,
    },
    crystalBtn: { flexDirection: "row", alignItems: "center", gap: 4, marginTop: 4 },
    crystalText: { fontSize: 11, fontFamily: "Inter_400Regular" },
  });
}
