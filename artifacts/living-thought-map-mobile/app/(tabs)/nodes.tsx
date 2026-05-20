import { Ionicons } from "@expo/vector-icons";
import React, { useMemo, useState } from "react";
import {
  FlatList, KeyboardAvoidingView, Modal, Platform,
  Pressable, ScrollView, StyleSheet, Text, TextInput, View
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";

import NodeCard from "@/components/NodeCard";
import { NodeType, useThought } from "@/context/ThoughtContext";
import { useColors } from "@/hooks/useColors";

const NODE_TYPES: NodeType[] = ["thought", "joke", "character", "myth", "research", "canon", "contradiction", "artifact", "fragment"];
const TAB_BAR_HEIGHT = 49;

export default function NodesScreen() {
  const colors = useColors();
  const insets = useSafeAreaInsets();
  const { nodes, realms, deleteNode, addNode } = useThought();
  const [filterRealm, setFilterRealm] = useState<string | null>(null);
  const [showAdd, setShowAdd] = useState(false);
  const [newTitle, setNewTitle] = useState("");
  const [newContent, setNewContent] = useState("");
  const [newType, setNewType] = useState<NodeType>("thought");
  const [newRealm, setNewRealm] = useState<string>("");
  const s = makeStyles(colors);

  const realmMap = useMemo(
    () => Object.fromEntries(realms.map((r) => [r.id, { name: r.name, color: r.color }])),
    [realms]
  );

  const activeRealmIds = useMemo(() => new Set(realms.filter((r) => r.isActive).map((r) => r.id)), [realms]);

  // Mirror web canvas: only show nodes that belong to at least one active realm.
  // If a filterRealm is selected, narrow further.
  const filtered = useMemo(() => {
    let result = nodes.filter(
      (n) => n.realms.length === 0 || n.realms.some((r) => activeRealmIds.has(r))
    );
    if (filterRealm) result = result.filter((n) => n.realms.includes(filterRealm));
    return result;
  }, [nodes, activeRealmIds, filterRealm]);

  // Hidden by inactive realms (but exist)
  const hiddenCount = nodes.length - nodes.filter(
    (n) => n.realms.length === 0 || n.realms.some((r) => activeRealmIds.has(r))
  ).length;

  const openAdd = () => {
    const firstActive = realms.find((r) => r.isActive)?.id ?? realms[0]?.id ?? "";
    setNewRealm(firstActive);
    setNewTitle("");
    setNewContent("");
    setNewType("thought");
    setShowAdd(true);
  };

  const handleAdd = () => {
    if (!newTitle.trim()) return;
    addNode({
      title: newTitle.trim(),
      content: newContent.trim(),
      type: newType,
      realms: newRealm ? [newRealm] : [],
    });
    setShowAdd(false);
  };

  const bottomOffset = Platform.OS === "web" ? 34 : insets.bottom + TAB_BAR_HEIGHT;

  return (
    <View style={[s.container, { backgroundColor: colors.background }]}>
      {/* Header */}
      <View style={[s.header, { paddingTop: Platform.OS === "web" ? 67 : insets.top, borderBottomColor: colors.border }]}>
        <View style={s.headerLeft}>
          <View style={[s.dot, { backgroundColor: colors.cosmicPurple }]} />
          <Text style={[s.headerTitle, { color: colors.foreground }]}>THOUGHT MAP</Text>
        </View>
        <Pressable
          style={[s.addBtn, { backgroundColor: colors.cosmicCyan + "22", borderColor: colors.cosmicCyan + "55" }]}
          onPress={openAdd}
        >
          <Ionicons name="add" size={18} color={colors.cosmicCyan} />
        </Pressable>
      </View>

      {/* Realm filter row — only shows active realms */}
      <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={s.realmRow}>
        <Pressable
          style={[s.pill, !filterRealm && { backgroundColor: colors.cosmicCyan + "22", borderColor: colors.cosmicCyan }]}
          onPress={() => setFilterRealm(null)}
        >
          <Text style={[s.pillText, !filterRealm && { color: colors.cosmicCyan }]}>All</Text>
        </Pressable>
        {realms.filter((r) => r.isActive).map((r) => (
          <Pressable key={r.id}
            style={[s.pill, filterRealm === r.id && { backgroundColor: r.color + "22", borderColor: r.color }]}
            onPress={() => setFilterRealm(filterRealm === r.id ? null : r.id)}
          >
            <View style={[s.realmDot, { backgroundColor: r.color }]} />
            <Text style={[s.pillText, filterRealm === r.id && { color: r.color }]}>{r.name}</Text>
          </Pressable>
        ))}
      </ScrollView>

      <View style={s.countRow}>
        <Text style={[s.countText, { color: colors.mutedForeground }]}>
          {filtered.length} {filtered.length === 1 ? "node" : "nodes"}
        </Text>
        {hiddenCount > 0 && (
          <Text style={[s.countText, { color: colors.mutedForeground }]}>
            · {hiddenCount} hidden by inactive realms
          </Text>
        )}
      </View>

      {filtered.length === 0 ? (
        <View style={s.empty}>
          <Ionicons name="git-network-outline" size={40} color={colors.mutedForeground} />
          <Text style={[s.emptyTitle, { color: colors.foreground }]}>
            {nodes.length > 0 ? "No nodes in active realms" : "No nodes yet"}
          </Text>
          <Text style={[s.emptyText, { color: colors.mutedForeground }]}>
            {nodes.length > 0
              ? "Enable more realms in the Sanctum tab to see hidden nodes."
              : "Chat with the Navigator and crystallize messages, or tap + to add one."}
          </Text>
        </View>
      ) : (
        <FlatList
          data={[...filtered].reverse()}
          keyExtractor={(item) => item.id}
          renderItem={({ item }) => <NodeCard node={item} realmMap={realmMap} onDelete={deleteNode} />}
          contentContainerStyle={{ paddingHorizontal: 16, paddingBottom: bottomOffset + 24 }}
          showsVerticalScrollIndicator={false}
        />
      )}

      {/* Add node bottom sheet */}
      <Modal visible={showAdd} transparent animationType="slide" onRequestClose={() => setShowAdd(false)}>
        <KeyboardAvoidingView
          behavior={Platform.OS === "ios" ? "padding" : "height"}
          style={{ flex: 1, justifyContent: "flex-end" }}
        >
          <Pressable style={s.overlay} onPress={() => setShowAdd(false)} />
          <View style={[s.sheet, { backgroundColor: colors.card, borderColor: colors.border, paddingBottom: insets.bottom + 16 }]}>
            <View style={[s.handle, { backgroundColor: colors.border }]} />
            <Text style={[s.sheetTitle, { color: colors.foreground }]}>New Node</Text>

            <TextInput
              style={[s.sheetInput, { color: colors.foreground, borderColor: colors.border, backgroundColor: colors.muted }]}
              placeholder="Title"
              placeholderTextColor={colors.mutedForeground}
              value={newTitle}
              onChangeText={setNewTitle}
              autoFocus
              returnKeyType="next"
            />
            <TextInput
              style={[s.sheetInput, s.sheetTextArea, { color: colors.foreground, borderColor: colors.border, backgroundColor: colors.muted }]}
              placeholder="Content (optional)"
              placeholderTextColor={colors.mutedForeground}
              value={newContent}
              onChangeText={setNewContent}
              multiline
              numberOfLines={2}
            />

            {/* Node type picker */}
            <Text style={[s.sectionLabel, { color: colors.mutedForeground }]}>NODE TYPE</Text>
            <ScrollView horizontal showsHorizontalScrollIndicator={false} style={{ marginBottom: 14 }}>
              {NODE_TYPES.map((t) => (
                <Pressable
                  key={t}
                  style={[s.typePill, {
                    backgroundColor: newType === t ? colors.cosmicCyan + "22" : colors.muted,
                    borderColor: newType === t ? colors.cosmicCyan : colors.border,
                  }]}
                  onPress={() => setNewType(t)}
                >
                  <Text style={[s.typePillText, { color: newType === t ? colors.cosmicCyan : colors.mutedForeground }]}>
                    {t}
                  </Text>
                </Pressable>
              ))}
            </ScrollView>

            {/* Realm picker */}
            <Text style={[s.sectionLabel, { color: colors.mutedForeground }]}>REALM</Text>
            <ScrollView horizontal showsHorizontalScrollIndicator={false} style={{ marginBottom: 16 }}>
              {realms.map((r) => (
                <Pressable
                  key={r.id}
                  style={[s.typePill, {
                    backgroundColor: newRealm === r.id ? r.color + "22" : colors.muted,
                    borderColor: newRealm === r.id ? r.color : colors.border,
                    opacity: r.isActive ? 1 : 0.45,
                  }]}
                  onPress={() => setNewRealm(r.id)}
                >
                  <Text style={[s.typePillText, { color: newRealm === r.id ? r.color : colors.mutedForeground }]}>
                    {r.name}
                  </Text>
                </Pressable>
              ))}
            </ScrollView>

            <Pressable
              style={[s.saveBtn, { backgroundColor: colors.cosmicCyan, opacity: newTitle.trim() ? 1 : 0.4 }]}
              onPress={handleAdd}
              disabled={!newTitle.trim()}
            >
              <Text style={[s.saveBtnText, { color: colors.background }]}>Add Node</Text>
            </Pressable>
          </View>
        </KeyboardAvoidingView>
      </Modal>
    </View>
  );
}

// eslint-disable-next-line @typescript-eslint/no-explicit-any
function makeStyles(colors: any) {
  return StyleSheet.create({
    container: { flex: 1 },
    header: {
      flexDirection: "row", alignItems: "center", justifyContent: "space-between",
      paddingHorizontal: 16, paddingBottom: 12, borderBottomWidth: 1,
    },
    headerLeft: { flexDirection: "row", alignItems: "center", gap: 8 },
    dot: { width: 7, height: 7, borderRadius: 4 },
    headerTitle: { fontSize: 12, fontFamily: "Inter_600SemiBold", letterSpacing: 2 },
    addBtn: { width: 32, height: 32, borderRadius: 16, borderWidth: 1, alignItems: "center", justifyContent: "center" },
    realmRow: { paddingHorizontal: 12, paddingVertical: 10, gap: 6, alignItems: "center" },
    realmDot: { width: 5, height: 5, borderRadius: 3 },
    pill: { flexDirection: "row", alignItems: "center", gap: 5, paddingHorizontal: 12, paddingVertical: 5, borderRadius: 20, borderWidth: 1, borderColor: colors.border },
    pillText: { fontSize: 12, color: colors.mutedForeground, fontFamily: "Inter_500Medium" },
    countRow: { flexDirection: "row", alignItems: "center", gap: 4, paddingHorizontal: 16, paddingBottom: 8 },
    countText: { fontSize: 11, fontFamily: "Inter_400Regular" },
    empty: { flex: 1, alignItems: "center", justifyContent: "center", paddingHorizontal: 32, gap: 12 },
    emptyTitle: { fontSize: 16, fontFamily: "Inter_600SemiBold" },
    emptyText: { fontSize: 13, textAlign: "center", lineHeight: 19, fontFamily: "Inter_400Regular" },
    overlay: { flex: 1 },
    sheet: { borderTopLeftRadius: 20, borderTopRightRadius: 20, borderWidth: 1, padding: 20 },
    handle: { width: 36, height: 4, borderRadius: 2, alignSelf: "center", marginBottom: 16 },
    sheetTitle: { fontSize: 16, fontFamily: "Inter_600SemiBold", marginBottom: 16 },
    sheetInput: {
      borderWidth: 1, borderRadius: 10, paddingHorizontal: 14, paddingVertical: 10,
      fontSize: 14, fontFamily: "Inter_400Regular", marginBottom: 12,
    },
    sheetTextArea: { height: 60, textAlignVertical: "top" },
    sectionLabel: { fontSize: 9, fontFamily: "Inter_600SemiBold", letterSpacing: 1.5, marginBottom: 8 },
    typePill: { paddingHorizontal: 12, paddingVertical: 6, borderRadius: 8, borderWidth: 1, marginRight: 6 },
    typePillText: { fontSize: 12, fontFamily: "Inter_500Medium" },
    saveBtn: { borderRadius: 12, paddingVertical: 14, alignItems: "center" },
    saveBtnText: { fontSize: 15, fontFamily: "Inter_600SemiBold" },
  });
}
