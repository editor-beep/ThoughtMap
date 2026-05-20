import { Ionicons } from "@expo/vector-icons";
import React, { useRef, useState } from "react";
import { FlatList, Platform, Pressable, StyleSheet, Text, TextInput, View } from "react-native";
import { KeyboardAvoidingView } from "react-native-keyboard-controller";
import { useSafeAreaInsets } from "react-native-safe-area-context";

import MessageBubble from "@/components/MessageBubble";
import TypingIndicator from "@/components/TypingIndicator";
import { useThought } from "@/context/ThoughtContext";
import { useColors } from "@/hooks/useColors";

const TAB_BAR_HEIGHT = 49;

export default function ChatScreen() {
  const colors = useColors();
  const insets = useSafeAreaInsets();
  const { chatHistory, isStreaming, sendChatMessage, extractToMap, realms } = useThought();
  const [inputText, setInputText] = useState("");
  const inputRef = useRef<TextInput>(null);
  const s = makeStyles(colors);

  const handleSend = async () => {
    const text = inputText.trim();
    if (!text || isStreaming) return;
    setInputText("");
    inputRef.current?.focus();
    await sendChatMessage(text);
  };

  const reversed = [...chatHistory].reverse();

  const activeRealms = realms.filter((r) => r.isActive);

  // Bottom offset: tab bar + home indicator + input padding
  const bottomOffset = Platform.OS === "web" ? 34 : insets.bottom + TAB_BAR_HEIGHT;

  return (
    <KeyboardAvoidingView
      style={[s.container, { backgroundColor: colors.background }]}
      behavior="padding"
      keyboardVerticalOffset={0}
    >
      {/* Header */}
      <View style={[s.header, {
        paddingTop: Platform.OS === "web" ? 67 : insets.top,
        borderBottomColor: colors.border,
        backgroundColor: colors.background,
      }]}>
        <View style={s.headerLeft}>
          <View style={[s.dot, { backgroundColor: colors.cosmicCyan }]} />
          <Text style={[s.headerTitle, { color: colors.foreground }]}>NAVIGATOR</Text>
        </View>
        {/* Active realm indicators */}
        <View style={s.realmDots}>
          {activeRealms.map((r) => (
            <View key={r.id} style={[s.realmDot, { backgroundColor: r.color }]} />
          ))}
        </View>
        <Text style={[s.headerSub, { color: colors.mutedForeground }]}>Gemini · Thought Stream</Text>
      </View>

      {/* Message list — inverted so newest message is at bottom */}
      <FlatList
        data={reversed}
        keyExtractor={(item) => item.id}
        renderItem={({ item }) => (
          <MessageBubble
            id={item.id}
            role={item.role}
            content={item.content}
            extractedNodeId={item.extractedNodeId}
            onExtract={extractToMap}
          />
        )}
        inverted={chatHistory.length > 0}
        ListHeaderComponent={isStreaming ? <TypingIndicator /> : null}
        keyboardDismissMode="interactive"
        keyboardShouldPersistTaps="handled"
        contentContainerStyle={{ paddingVertical: 12, paddingBottom: bottomOffset + 72 }}
        style={{ flex: 1 }}
        showsVerticalScrollIndicator={false}
      />

      {/* Input bar — sits above tab bar */}
      <View style={[s.inputBar, {
        paddingBottom: bottomOffset + 8,
        borderTopColor: colors.border,
        backgroundColor: colors.background,
      }]}>
        <View style={[s.inputWrap, { backgroundColor: colors.card, borderColor: colors.border }]}>
          <TextInput
            ref={inputRef}
            style={[s.input, { color: colors.foreground }]}
            placeholder="Introduce a concept..."
            placeholderTextColor={colors.mutedForeground}
            value={inputText}
            onChangeText={setInputText}
            onSubmitEditing={handleSend}
            blurOnSubmit={false}
            returnKeyType="send"
            multiline
            maxLength={2000}
          />
          <Pressable
            onPress={handleSend}
            disabled={!inputText.trim() || isStreaming}
            style={{ opacity: !inputText.trim() || isStreaming ? 0.4 : 1, padding: 2 }}
          >
            <Ionicons name="arrow-up-circle" size={28} color={colors.cosmicCyan} />
          </Pressable>
        </View>
      </View>
    </KeyboardAvoidingView>
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
    headerSub: { fontSize: 11, fontFamily: "Inter_400Regular" },
    realmDots: { flexDirection: "row", gap: 3, flex: 1, paddingHorizontal: 8 },
    realmDot: { width: 5, height: 5, borderRadius: 3 },
    inputBar: { paddingHorizontal: 12, paddingTop: 10, borderTopWidth: 1 },
    inputWrap: {
      flexDirection: "row", alignItems: "flex-end",
      borderRadius: 20, borderWidth: 1,
      paddingLeft: 16, paddingRight: 6, paddingVertical: 6,
    },
    input: { flex: 1, fontSize: 14, fontFamily: "Inter_400Regular", maxHeight: 100, lineHeight: 20 },
  });
}
