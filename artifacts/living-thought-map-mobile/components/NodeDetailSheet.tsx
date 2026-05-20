import { Ionicons } from "@expo/vector-icons";
import { useBottomTabBarHeight } from "@react-navigation/bottom-tabs";
import React, { useEffect, useRef, useState } from "react";
import {
  FlatList, KeyboardAvoidingView, Modal, Platform,
  Pressable, ScrollView, StyleSheet, Text, TextInput, View,
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";

import { EdgeType, NodeType, ThoughtEdge, ThoughtNode, useThought } from "@/context/ThoughtContext";
import { useColors } from "@/hooks/useColors";

const NODE_TYPES: NodeType[] = ["thought", "joke", "character", "myth", "research", "canon", "contradiction", "artifact", "fragment"];

const TYPE_ICONS: Record<NodeType, keyof typeof Ionicons.glyphMap> = {
  thought: "bulb-outline", joke: "happy-outline", character: "person-outline",
  myth: "planet-outline", research: "book-outline", canon: "ribbon-outline",
  contradiction: "swap-horizontal-outline", artifact: "diamond-outline", fragment: "code-slash-outline",
};

const TYPE_COLORS: Record<NodeType, string> = {
  thought: "#06b6d4", joke: "#f59e0b", character: "#a855f7", myth: "#a855f7",
  research: "#3b82f6", canon: "#10b981", contradiction: "#f43f5e", artifact: "#64748b", fragment: "#475569",
};

const EDGE_TYPES: EdgeType[] = ["evolves_from", "contradicts", "references", "remixes", "supports"];
const EDGE_LABELS: Record<EdgeType, string> = {
  evolves_from: "evolves from", contradicts: "contradicts",
  references: "references", remixes: "remixes", supports: "supports",
};
const EDGE_COLORS: Record<EdgeType, string> = {
  evolves_from: "#06b6d4", contradicts: "#f43f5e",
  references: "#3b82f6", remixes: "#a855f7", supports: "#10b981",
};

type Tab = "chat" | "edit" | "links";

interface Props {
  node: ThoughtNode | null;
  visible: boolean;
  onClose: () => void;
}

export default function NodeDetailSheet({ node, visible, onClose }: Props) {
  const colors = useColors();
  const insets = useSafeAreaInsets();
  const tabBarHeight = useBottomTabBarHeight();
  const {
    nodes, realms, edges, addEdge, deleteEdge, updateNode, deleteNode,
    nodeChats, nodeChatStreaming, sendNodeChatMessage, addRealm,
  } = useThought();

  const [tab, setTab] = useState<Tab>("chat");
  const [title, setTitle] = useState("");
  const [content, setContent] = useState("");
  const [nodeType, setNodeType] = useState<NodeType>("thought");
  const [selectedRealm, setSelectedRealm] = useState<string>("");
  const [chatInput, setChatInput] = useState("");
  const [connectStep, setConnectStep] = useState<null | "pick" | { targetId: string }>(null);
  const [showNewRealm, setShowNewRealm] = useState(false);
  const [newRealmInput, setNewRealmInput] = useState("");
  const chatListRef = useRef<FlatList>(null);
  const s = makeStyles(colors);

  useEffect(() => {
    if (node) {
      setTitle(node.title);
      setContent(node.content);
      setNodeType(node.type);
      setSelectedRealm(node.realms[0] ?? "");
      setTab("chat");
      setChatInput("");
      setConnectStep(null);
    }
  }, [node?.id]);

  if (!node) return null;

  const typeColor = TYPE_COLORS[node.type] ?? "#06b6d4";
  const icon = TYPE_ICONS[node.type] ?? "bulb-outline";
  const chat = nodeChats[node.id] ?? [];
  const isStreaming = nodeChatStreaming === node.id;
  const nodeEdges = edges.filter((e) => e.source === node.id || e.target === node.id);
  const realmMap = Object.fromEntries(realms.map((r) => [r.id, r]));
  const otherNodes = nodes.filter((n) => n.id !== node.id);

  const handleSave = () => {
    updateNode(node.id, {
      title: title.trim() || node.title,
      content,
      type: nodeType,
      realms: selectedRealm ? [selectedRealm] : [],
    });
  };

  const handleSendChat = async () => {
    if (!chatInput.trim() || isStreaming) return;
    const msg = chatInput;
    setChatInput("");
    await sendNodeChatMessage(node.id, node.title, node.content, msg);
    setTimeout(() => chatListRef.current?.scrollToEnd?.({ animated: true }), 100);
  };

  const handleConnect = (targetId: string, type: EdgeType) => {
    addEdge(node.id, targetId, type);
    setConnectStep(null);
  };

  const handleCreateRealm = () => {
    const trimmed = newRealmInput.trim();
    if (!trimmed) return;
    const id = addRealm(trimmed);
    setSelectedRealm(id);
    setNewRealmInput("");
    setShowNewRealm(false);
  };

  const TABS: [Tab, string, keyof typeof Ionicons.glyphMap][] = [
    ["chat", "Chat", "chatbubble-outline"],
    ["edit", "Edit", "create-outline"],
    ["links", `Links${nodeEdges.length ? ` ${nodeEdges.length}` : ""}`, "git-network-outline"],
  ];

  return (
    <Modal visible={visible} animationType="slide" transparent onRequestClose={onClose}>
      <View style={[s.backdrop]}>
        <Pressable style={s.dismissArea} onPress={onClose} />
        <KeyboardAvoidingView
          behavior={Platform.OS === "ios" ? "padding" : "height"}
          style={s.sheetOuter}
        >
          <View style={[s.sheet, { backgroundColor: colors.background, paddingBottom: insets.bottom + 8 }]}>
            {/* Handle */}
            <View style={[s.handle, { backgroundColor: colors.border }]} />

            {/* Header */}
            <View style={[s.header, { borderBottomColor: colors.border }]}>
              <View style={[s.typeIcon, { backgroundColor: typeColor + "22", borderColor: typeColor + "55" }]}>
                <Ionicons name={icon} size={16} color={typeColor} />
              </View>
              <View style={s.headerText}>
                <Text style={[s.headerTitle, { color: colors.foreground }]} numberOfLines={1}>{node.title}</Text>
                <Text style={[s.headerSub, { color: colors.mutedForeground }]}>{node.type}</Text>
              </View>
              <Pressable onPress={onClose} style={s.closeBtn} hitSlop={10}>
                <Ionicons name="close" size={18} color={colors.mutedForeground} />
              </Pressable>
            </View>

            {/* Tabs */}
            <View style={[s.tabBar, { borderBottomColor: colors.border }]}>
              {TABS.map(([key, label, tabIcon]) => (
                <Pressable key={key} style={s.tab} onPress={() => setTab(key)}>
                  <Ionicons
                    name={tabIcon}
                    size={13}
                    color={tab === key ? colors.cosmicCyan : colors.mutedForeground}
                  />
                  <Text style={[s.tabText, { color: tab === key ? colors.cosmicCyan : colors.mutedForeground }]}>
                    {label}
                  </Text>
                  {tab === key && <View style={[s.tabUnderline, { backgroundColor: colors.cosmicCyan }]} />}
                </Pressable>
              ))}
            </View>

            {/* ── Chat ── */}
            {tab === "chat" && (
              <View style={s.tabContent}>
                {chat.length === 0 ? (
                  <View style={s.emptyState}>
                    <Ionicons name={icon} size={32} color={typeColor + "88"} />
                    <Text style={[s.emptyTitle, { color: colors.foreground }]}>Chat about this node</Text>
                    <Text style={[s.emptyBody, { color: colors.mutedForeground }]}>
                      Ask the Navigator anything about "{node.title}" — this thread stays focused on this idea.
                    </Text>
                  </View>
                ) : (
                  <FlatList
                    ref={chatListRef}
                    data={chat}
                    keyExtractor={(m) => m.id}
                    style={{ flex: 1 }}
                    contentContainerStyle={{ padding: 14, gap: 10 }}
                    showsVerticalScrollIndicator={false}
                    renderItem={({ item: msg }) => (
                      <View style={msg.role === "user" ? s.msgUser : s.msgAssistant}>
                        <View
                          style={[
                            s.msgBubble,
                            msg.role === "user"
                              ? { backgroundColor: colors.cosmicCyan + "1a", borderColor: colors.cosmicCyan + "44" }
                              : { backgroundColor: colors.card, borderColor: typeColor + "33", borderLeftColor: typeColor + "88", borderLeftWidth: 2 },
                          ]}
                        >
                          <Text style={[s.msgText, { color: colors.foreground }]}>
                            {msg.content}
                            {isStreaming && msg.role === "assistant" && msg === chat[chat.length - 1] && "▌"}
                          </Text>
                        </View>
                      </View>
                    )}
                  />
                )}
                <View style={[s.chatInputRow, { borderTopColor: colors.border }]}>
                  <View style={[s.chatInputWrap, { backgroundColor: colors.card, borderColor: colors.border }]}>
                    <TextInput
                      style={[s.chatInput, { color: colors.foreground }]}
                      placeholder={isStreaming ? "Navigating…" : `Explore "${node.title}"…`}
                      placeholderTextColor={colors.mutedForeground}
                      value={chatInput}
                      onChangeText={setChatInput}
                      onSubmitEditing={handleSendChat}
                      blurOnSubmit={false}
                      returnKeyType="send"
                      editable={!isStreaming}
                    />
                    <Pressable
                      onPress={handleSendChat}
                      disabled={!chatInput.trim() || isStreaming}
                      style={{ opacity: chatInput.trim() && !isStreaming ? 1 : 0.4 }}
                    >
                      <Ionicons name="arrow-up-circle" size={26} color={colors.cosmicCyan} />
                    </Pressable>
                  </View>
                </View>
              </View>
            )}

            {/* ── Edit ── */}
            {tab === "edit" && (
              <ScrollView style={s.tabContent} contentContainerStyle={{ padding: 16, gap: 14 }}>
                <View>
                  <Text style={[s.label, { color: colors.mutedForeground }]}>TITLE</Text>
                  <TextInput
                    style={[s.input, { color: colors.foreground, borderColor: colors.border, backgroundColor: colors.muted }]}
                    value={title}
                    onChangeText={setTitle}
                    onBlur={handleSave}
                    returnKeyType="done"
                  />
                </View>
                <View>
                  <Text style={[s.label, { color: colors.mutedForeground }]}>CONTENT / NOTES</Text>
                  <TextInput
                    style={[s.input, s.textarea, { color: colors.foreground, borderColor: colors.border, backgroundColor: colors.muted }]}
                    value={content}
                    onChangeText={setContent}
                    onBlur={handleSave}
                    multiline
                    numberOfLines={4}
                    placeholder="Add notes, context, detail…"
                    placeholderTextColor={colors.mutedForeground}
                  />
                </View>
                <View>
                  <Text style={[s.label, { color: colors.mutedForeground }]}>TYPE</Text>
                  <ScrollView horizontal showsHorizontalScrollIndicator={false}>
                    {NODE_TYPES.map((t) => (
                      <Pressable
                        key={t}
                        onPress={() => { setNodeType(t); setTimeout(handleSave, 0); }}
                        style={[s.typePill, {
                          backgroundColor: nodeType === t ? TYPE_COLORS[t] + "22" : colors.muted,
                          borderColor: nodeType === t ? TYPE_COLORS[t] : colors.border,
                        }]}
                      >
                        <Text style={[s.typePillText, { color: nodeType === t ? TYPE_COLORS[t] : colors.mutedForeground }]}>{t}</Text>
                      </Pressable>
                    ))}
                  </ScrollView>
                </View>
                <View>
                  <Text style={[s.label, { color: colors.mutedForeground }]}>REALM</Text>
                  <ScrollView horizontal showsHorizontalScrollIndicator={false}>
                    <View style={{ flexDirection: "row", gap: 6 }}>
                      <Pressable
                        onPress={() => { setSelectedRealm(""); setTimeout(handleSave, 0); }}
                        style={[s.typePill, {
                          backgroundColor: !selectedRealm ? colors.cosmicCyan + "22" : colors.muted,
                          borderColor: !selectedRealm ? colors.cosmicCyan : colors.border,
                        }]}
                      >
                        <Text style={[s.typePillText, { color: !selectedRealm ? colors.cosmicCyan : colors.mutedForeground }]}>None</Text>
                      </Pressable>
                      {realms.map((r) => (
                        <Pressable
                          key={r.id}
                          onPress={() => { setSelectedRealm(r.id); setTimeout(handleSave, 0); }}
                          style={[s.typePill, {
                            backgroundColor: selectedRealm === r.id ? r.color + "22" : colors.muted,
                            borderColor: selectedRealm === r.id ? r.color : colors.border,
                          }]}
                        >
                          <Text style={[s.typePillText, { color: selectedRealm === r.id ? r.color : colors.mutedForeground }]}>{r.name}</Text>
                        </Pressable>
                      ))}
                      {showNewRealm ? (
                        <View style={[s.typePill, { borderColor: colors.cosmicCyan, backgroundColor: colors.cosmicCyan + "11", flexDirection: "row", alignItems: "center", gap: 5 }]}>
                          <TextInput
                            autoFocus
                            style={{ fontSize: 12, color: colors.foreground, minWidth: 70 }}
                            placeholder="Name…"
                            placeholderTextColor={colors.mutedForeground}
                            value={newRealmInput}
                            onChangeText={setNewRealmInput}
                            onSubmitEditing={handleCreateRealm}
                            returnKeyType="done"
                          />
                          <Pressable onPress={handleCreateRealm}>
                            <Ionicons name="checkmark" size={13} color={colors.cosmicCyan} />
                          </Pressable>
                          <Pressable onPress={() => { setShowNewRealm(false); setNewRealmInput(""); }}>
                            <Ionicons name="close" size={11} color={colors.mutedForeground} />
                          </Pressable>
                        </View>
                      ) : (
                        <Pressable
                          onPress={() => setShowNewRealm(true)}
                          style={[s.typePill, { borderColor: colors.border, borderStyle: "dashed" }]}
                        >
                          <Text style={[s.typePillText, { color: colors.mutedForeground }]}>+ New</Text>
                        </Pressable>
                      )}
                    </View>
                  </ScrollView>
                </View>
                <Pressable
                  onPress={() => { deleteNode(node.id); onClose(); }}
                  style={s.deleteBtn}
                >
                  <Ionicons name="trash-outline" size={13} color="#f43f5e" />
                  <Text style={s.deleteBtnText}>Delete node</Text>
                </Pressable>
              </ScrollView>
            )}

            {/* ── Links ── */}
            {tab === "links" && (
              <View style={s.tabContent}>
                {connectStep === "pick" && (
                  <View style={[s.connectOverlay, { backgroundColor: colors.card, borderColor: colors.border }]}>
                    <View style={[s.connectHeader, { borderBottomColor: colors.border }]}>
                      <Text style={[s.connectTitle, { color: colors.foreground }]}>Connect to…</Text>
                      <Pressable onPress={() => setConnectStep(null)}>
                        <Ionicons name="close" size={16} color={colors.mutedForeground} />
                      </Pressable>
                    </View>
                    <FlatList
                      data={otherNodes}
                      keyExtractor={(n) => n.id}
                      style={{ maxHeight: 240 }}
                      renderItem={({ item: n }) => (
                        <Pressable
                          style={[s.connectNodeRow, { borderBottomColor: colors.border }]}
                          onPress={() => setConnectStep({ targetId: n.id })}
                        >
                          <Ionicons name={TYPE_ICONS[n.type] ?? "bulb-outline"} size={13} color={TYPE_COLORS[n.type]} />
                          <Text style={[s.connectNodeText, { color: colors.foreground }]} numberOfLines={1}>{n.title}</Text>
                        </Pressable>
                      )}
                    />
                  </View>
                )}

                {connectStep !== null && typeof connectStep === "object" && (
                  <View style={[s.connectOverlay, { backgroundColor: colors.card, borderColor: colors.border }]}>
                    <View style={[s.connectHeader, { borderBottomColor: colors.border }]}>
                      <Text style={[s.connectTitle, { color: colors.foreground }]}>Relationship type</Text>
                      <Pressable onPress={() => setConnectStep(null)}>
                        <Ionicons name="close" size={16} color={colors.mutedForeground} />
                      </Pressable>
                    </View>
                    {EDGE_TYPES.map((et) => (
                      <Pressable
                        key={et}
                        style={[s.connectNodeRow, { borderBottomColor: colors.border }]}
                        onPress={() => handleConnect(connectStep.targetId, et)}
                      >
                        <View style={[s.edgeDot, { backgroundColor: EDGE_COLORS[et] }]} />
                        <Text style={[s.connectNodeText, { color: colors.foreground }]}>{EDGE_LABELS[et]}</Text>
                      </Pressable>
                    ))}
                  </View>
                )}

                <ScrollView style={{ flex: 1 }} contentContainerStyle={{ padding: 14 }}>
                  {nodeEdges.length === 0 && !connectStep ? (
                    <View style={s.emptyState}>
                      <Ionicons name="git-network-outline" size={32} color={colors.mutedForeground} />
                      <Text style={[s.emptyTitle, { color: colors.foreground }]}>No connections yet</Text>
                      <Text style={[s.emptyBody, { color: colors.mutedForeground }]}>
                        Link this node to others to show how ideas relate.
                      </Text>
                    </View>
                  ) : (
                    nodeEdges.map((edge) => {
                      const otherId = edge.source === node.id ? edge.target : edge.source;
                      const other = nodes.find((n) => n.id === otherId);
                      const direction = edge.source === node.id ? "out" : "in";
                      const edgeColor = EDGE_COLORS[edge.type as EdgeType] ?? "#475569";
                      return (
                        <View key={edge.id} style={[s.edgeRow, { backgroundColor: colors.card, borderColor: colors.border }]}>
                          <View style={[s.edgeDot, { backgroundColor: edgeColor }]} />
                          <View style={{ flex: 1 }}>
                            <Text style={[s.edgeLabel, { color: edgeColor }]}>
                              {direction === "out" ? "↗ " : "↙ "}{EDGE_LABELS[edge.type as EdgeType]}
                            </Text>
                            <Text style={[s.edgeTarget, { color: colors.foreground }]} numberOfLines={1}>
                              {other?.title ?? otherId}
                            </Text>
                          </View>
                          <Pressable onPress={() => deleteEdge(edge.id)} hitSlop={10}>
                            <Ionicons name="close" size={14} color={colors.mutedForeground} />
                          </Pressable>
                        </View>
                      );
                    })
                  )}
                </ScrollView>

                {!connectStep && (
                  <View style={[s.linksFooter, { borderTopColor: colors.border }]}>
                    <Pressable
                      style={[s.connectBtn, { borderColor: colors.cosmicCyan, backgroundColor: colors.cosmicCyan + "14" }]}
                      onPress={() => setConnectStep("pick")}
                    >
                      <Ionicons name="add" size={14} color={colors.cosmicCyan} />
                      <Text style={[s.connectBtnText, { color: colors.cosmicCyan }]}>Link to another node</Text>
                    </Pressable>
                  </View>
                )}
              </View>
            )}
          </View>
        </KeyboardAvoidingView>
      </View>
    </Modal>
  );
}

// eslint-disable-next-line @typescript-eslint/no-explicit-any
function makeStyles(colors: any) {
  return StyleSheet.create({
    backdrop: { flex: 1, justifyContent: "flex-end" },
    dismissArea: { flex: 1 },
    sheetOuter: { maxHeight: "88%" },
    sheet: { borderTopLeftRadius: 20, borderTopRightRadius: 20, minHeight: 520 },
    handle: { width: 36, height: 4, borderRadius: 2, alignSelf: "center", marginTop: 12, marginBottom: 4 },
    header: { flexDirection: "row", alignItems: "center", gap: 10, padding: 14, borderBottomWidth: 1 },
    typeIcon: { width: 36, height: 36, borderRadius: 10, borderWidth: 1, alignItems: "center", justifyContent: "center" },
    headerText: { flex: 1 },
    headerTitle: { fontSize: 15, fontFamily: "Inter_600SemiBold" },
    headerSub: { fontSize: 10, fontFamily: "Inter_400Regular", textTransform: "uppercase", letterSpacing: 1 },
    closeBtn: { padding: 4 },
    tabBar: { flexDirection: "row", borderBottomWidth: 1 },
    tab: { flex: 1, alignItems: "center", justifyContent: "center", flexDirection: "row", gap: 4, paddingVertical: 10, position: "relative" },
    tabText: { fontSize: 10, fontFamily: "Inter_500Medium", textTransform: "uppercase", letterSpacing: 0.8 },
    tabUnderline: { position: "absolute", bottom: 0, left: 12, right: 12, height: 2, borderRadius: 1 },
    tabContent: { flex: 1 },
    emptyState: { flex: 1, alignItems: "center", justifyContent: "center", gap: 8, padding: 32 },
    emptyTitle: { fontSize: 14, fontFamily: "Inter_600SemiBold", textAlign: "center" },
    emptyBody: { fontSize: 12, textAlign: "center", lineHeight: 18 },
    chatInputRow: { paddingHorizontal: 12, paddingVertical: 10, borderTopWidth: 1 },
    chatInputWrap: { flexDirection: "row", alignItems: "flex-end", borderRadius: 20, borderWidth: 1, paddingLeft: 14, paddingRight: 6, paddingVertical: 6 },
    chatInput: { flex: 1, fontSize: 14, maxHeight: 80, lineHeight: 20 },
    msgUser: { alignItems: "flex-end" },
    msgAssistant: { alignItems: "flex-start" },
    msgBubble: { maxWidth: "85%", borderRadius: 14, borderWidth: 1, paddingHorizontal: 12, paddingVertical: 8 },
    msgText: { fontSize: 14, lineHeight: 20 },
    label: { fontSize: 9, fontFamily: "Inter_600SemiBold", letterSpacing: 1.5, marginBottom: 8 },
    input: { borderWidth: 1, borderRadius: 10, paddingHorizontal: 12, paddingVertical: 10, fontSize: 14 },
    textarea: { height: 80, textAlignVertical: "top" },
    typePill: { paddingHorizontal: 12, paddingVertical: 6, borderRadius: 8, borderWidth: 1, marginRight: 6 },
    typePillText: { fontSize: 12, fontFamily: "Inter_500Medium" },
    deleteBtn: { flexDirection: "row", alignItems: "center", gap: 6, paddingVertical: 8 },
    deleteBtnText: { fontSize: 13, color: "#f43f5e" },
    edgeRow: { flexDirection: "row", alignItems: "center", gap: 10, borderRadius: 10, borderWidth: 1, padding: 10, marginBottom: 8 },
    edgeDot: { width: 8, height: 8, borderRadius: 4 },
    edgeLabel: { fontSize: 9, fontFamily: "Inter_500Medium", textTransform: "uppercase", letterSpacing: 0.8 },
    edgeTarget: { fontSize: 13, fontFamily: "Inter_500Medium", marginTop: 2 },
    connectOverlay: { margin: 14, borderRadius: 12, borderWidth: 1, overflow: "hidden" },
    connectHeader: { flexDirection: "row", justifyContent: "space-between", alignItems: "center", padding: 12, borderBottomWidth: 1 },
    connectTitle: { fontSize: 13, fontFamily: "Inter_600SemiBold" },
    connectNodeRow: { flexDirection: "row", alignItems: "center", gap: 10, paddingHorizontal: 14, paddingVertical: 12, borderBottomWidth: 1 },
    connectNodeText: { flex: 1, fontSize: 13 },
    linksFooter: { padding: 12, borderTopWidth: 1 },
    connectBtn: { flexDirection: "row", alignItems: "center", gap: 6, borderRadius: 10, borderWidth: 1, paddingHorizontal: 14, paddingVertical: 10, justifyContent: "center" },
    connectBtnText: { fontSize: 13, fontFamily: "Inter_500Medium" },
  });
}
