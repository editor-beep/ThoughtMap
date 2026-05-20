import { Ionicons } from "@expo/vector-icons";
import React from "react";
import { Pressable, StyleSheet, Text, View } from "react-native";

import { NodeType, ThoughtNode } from "@/context/ThoughtContext";
import { useColors } from "@/hooks/useColors";

const TYPE_ICONS: Record<NodeType, keyof typeof Ionicons.glyphMap> = {
  thought: "bulb-outline",
  joke: "happy-outline",
  character: "person-outline",
  myth: "planet-outline",
  research: "book-outline",
  canon: "ribbon-outline",
  contradiction: "swap-horizontal-outline",
  artifact: "diamond-outline",
  fragment: "code-slash-outline",
};

const TYPE_COLORS: Record<NodeType, string> = {
  thought: "#06b6d4", joke: "#f59e0b", character: "#a855f7",
  myth: "#a855f7", research: "#3b82f6", canon: "#10b981",
  contradiction: "#f43f5e", artifact: "#f59e0b", fragment: "#64748b",
};

interface Props {
  node: ThoughtNode;
  realmMap: Record<string, { name: string; color: string }>;
  onDelete?: (id: string) => void;
  onPress?: () => void;
}

export default function NodeCard({ node, realmMap, onDelete, onPress }: Props) {
  const colors = useColors();
  const typeColor = TYPE_COLORS[node.type] ?? colors.primary;
  const icon = TYPE_ICONS[node.type] ?? "bulb-outline";
  const s = makeStyles(colors);

  return (
    <Pressable style={s.card} onPress={onPress}>
      <View style={[s.typeIcon, { backgroundColor: typeColor + "22", borderColor: typeColor + "55" }]}>
        <Ionicons name={icon} size={16} color={typeColor} />
      </View>
      <View style={s.content}>
        <Text style={s.title} numberOfLines={1}>{node.title}</Text>
        {node.content.length > 0 && (
          <Text style={s.body} numberOfLines={2}>{node.content}</Text>
        )}
        <View style={s.footer}>
          <Text style={[s.typeLabel, { color: typeColor }]}>{node.type}</Text>
          {node.realms.slice(0, 2).map((rid) => (
            <View key={rid} style={[s.realmBadge, { backgroundColor: (realmMap[rid]?.color ?? colors.primary) + "22" }]}>
              <Text style={[s.realmText, { color: realmMap[rid]?.color ?? colors.primary }]}>
                {realmMap[rid]?.name ?? rid}
              </Text>
            </View>
          ))}
        </View>
      </View>
      {onDelete && (
        <Pressable onPress={() => onDelete(node.id)} hitSlop={10} style={{ padding: 4 }}>
          <Ionicons name="trash-outline" size={15} color={colors.mutedForeground} />
        </Pressable>
      )}
    </Pressable>
  );
}

// eslint-disable-next-line @typescript-eslint/no-explicit-any
function makeStyles(colors: any) {
  return StyleSheet.create({
    card: {
      flexDirection: "row", alignItems: "flex-start",
      backgroundColor: colors.card, borderWidth: 1, borderColor: colors.border,
      borderRadius: 12, padding: 12, marginBottom: 8, gap: 10,
    },
    typeIcon: {
      width: 32, height: 32, borderRadius: 8, borderWidth: 1,
      alignItems: "center", justifyContent: "center", marginTop: 2, flexShrink: 0,
    },
    content: { flex: 1 },
    title: { fontSize: 14, fontFamily: "Inter_600SemiBold", color: colors.foreground, marginBottom: 2 },
    body: { fontSize: 12, color: colors.mutedForeground, lineHeight: 17, marginBottom: 5 },
    footer: { flexDirection: "row", alignItems: "center", gap: 6, flexWrap: "wrap" },
    typeLabel: { fontSize: 10, fontFamily: "Inter_500Medium", textTransform: "uppercase", letterSpacing: 0.5 },
    realmBadge: { paddingHorizontal: 6, paddingVertical: 2, borderRadius: 4 },
    realmText: { fontSize: 10, fontFamily: "Inter_500Medium" },
  });
}
