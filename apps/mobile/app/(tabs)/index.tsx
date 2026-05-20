import React, { useState, useRef, useCallback } from 'react';
import {
  View,
  Text,
  FlatList,
  TextInput,
  Pressable,
  StyleSheet,
  KeyboardAvoidingView,
  Platform,
  ListRenderItemInfo,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Send, Sparkles, User as UserIcon } from 'lucide-react-native';
import { useThoughtStore } from '../../lib/store';
import { ChatMessage } from '../../lib/types';
import { Colors } from '../../constants/colors';
import ExtractModal from '../../components/ExtractModal';

export default function ChatScreen() {
  const { chatHistory, sendChatMessage, isStreaming } = useThoughtStore();
  const [input, setInput] = useState('');
  const [extractMsgId, setExtractMsgId] = useState<string | null>(null);
  const listRef = useRef<FlatList<ChatMessage>>(null);
  const insets = useSafeAreaInsets();

  const handleSend = useCallback(async () => {
    const text = input.trim();
    if (!text || isStreaming) return;
    setInput('');
    await sendChatMessage(text);
  }, [input, isStreaming, sendChatMessage]);

  const renderItem = useCallback(
    ({ item }: ListRenderItemInfo<ChatMessage>) => {
      const isUser = item.role === 'user';
      const isLastMsg = chatHistory[chatHistory.length - 1]?.id === item.id;
      const canExtract =
        !isUser &&
        !item.extractedNodeId &&
        item.content &&
        !item.content.startsWith('⚠') &&
        !item.content.startsWith('↺');

      return (
        <View style={[styles.messageRow, isUser ? styles.rowRight : styles.rowLeft]}>
          <View style={styles.avatarRow}>
            {isUser ? (
              <>
                <Text style={styles.roleLabel}>You</Text>
                <View style={styles.avatarCircle}>
                  <UserIcon size={8} color={Colors.slate400} />
                </View>
              </>
            ) : (
              <>
                <View style={[styles.avatarCircle, styles.aiAvatar]}>
                  <Sparkles size={8} color={Colors.cosmicCyan} />
                </View>
                <Text style={[styles.roleLabel, { color: Colors.cosmicCyan + '99' }]}>Navigator</Text>
              </>
            )}
          </View>

          <View style={[styles.bubble, isUser ? styles.userBubble : styles.aiBubble]}>
            <Text style={styles.bubbleText}>
              {item.content}
              {!isUser && isStreaming && isLastMsg && (
                <Text style={{ color: Colors.cosmicCyan }}> ▍</Text>
              )}
            </Text>
          </View>

          {canExtract && (
            <Pressable onPress={() => setExtractMsgId(item.id)} style={styles.extractBtn}>
              <Text style={styles.extractBtnText}>✦ Crystallize to canvas</Text>
            </Pressable>
          )}

          {item.extractedNodeId && (
            <Text style={styles.anchoredLabel}>✦ Anchored on canvas</Text>
          )}
        </View>
      );
    },
    [chatHistory, isStreaming]
  );

  return (
    <KeyboardAvoidingView
      style={styles.container}
      behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
      keyboardVerticalOffset={insets.bottom + 60}
    >
      <View style={[styles.header, { paddingTop: insets.top + 8 }]}>
        <View style={styles.pulsingDot} />
        <Text style={styles.headerTitle}>Thought Stream</Text>
      </View>

      <FlatList
        ref={listRef}
        data={chatHistory}
        keyExtractor={(item) => item.id}
        renderItem={renderItem}
        contentContainerStyle={styles.listContent}
        onContentSizeChange={() => listRef.current?.scrollToEnd({ animated: true })}
        onLayout={() => listRef.current?.scrollToEnd({ animated: false })}
        showsVerticalScrollIndicator={false}
      />

      <View style={[styles.inputRow, { paddingBottom: Math.max(insets.bottom, 12) }]}>
        <TextInput
          style={styles.textInput}
          value={input}
          onChangeText={setInput}
          placeholder={isStreaming ? 'Navigating…' : 'Introduce a concept…'}
          placeholderTextColor={Colors.slate600}
          editable={!isStreaming}
          multiline
          onSubmitEditing={handleSend}
          returnKeyType="send"
          blurOnSubmit
        />
        <Pressable
          onPress={handleSend}
          disabled={isStreaming || !input.trim()}
          style={({ pressed }) => [
            styles.sendBtn,
            (isStreaming || !input.trim()) && styles.sendBtnDisabled,
            pressed && styles.sendBtnPressed,
          ]}
        >
          <Send size={16} color={Colors.cosmicCyan} />
        </Pressable>
      </View>

      <ExtractModal
        visible={!!extractMsgId}
        messageId={extractMsgId}
        onClose={() => setExtractMsgId(null)}
      />
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: Colors.void900,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    paddingHorizontal: 16,
    paddingBottom: 12,
    borderBottomWidth: 1,
    borderBottomColor: Colors.voidBorder,
    backgroundColor: Colors.void900 + 'F5',
  },
  pulsingDot: {
    width: 6,
    height: 6,
    borderRadius: 3,
    backgroundColor: Colors.cosmicCyan,
  },
  headerTitle: {
    fontFamily: Platform.OS === 'ios' ? 'Courier' : 'monospace',
    fontSize: 11,
    letterSpacing: 2,
    textTransform: 'uppercase',
    color: Colors.slate400,
  },
  listContent: {
    padding: 16,
    gap: 20,
  },
  messageRow: {
    gap: 6,
    marginBottom: 4,
  },
  rowLeft: {
    alignItems: 'flex-start',
  },
  rowRight: {
    alignItems: 'flex-end',
  },
  avatarRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  avatarCircle: {
    width: 18,
    height: 18,
    borderRadius: 9,
    backgroundColor: Colors.void700,
    borderWidth: 1,
    borderColor: Colors.void600,
    alignItems: 'center',
    justifyContent: 'center',
  },
  aiAvatar: {
    backgroundColor: Colors.cosmicCyan + '1A',
    borderColor: Colors.cosmicCyan + '40',
  },
  roleLabel: {
    fontSize: 10,
    color: Colors.slate500,
    fontFamily: Platform.OS === 'ios' ? 'Courier' : 'monospace',
  },
  bubble: {
    maxWidth: '85%',
    borderRadius: 12,
    paddingHorizontal: 14,
    paddingVertical: 10,
    borderWidth: 1,
  },
  userBubble: {
    backgroundColor: Colors.void700 + 'CC',
    borderColor: Colors.void600 + '80',
    borderTopRightRadius: 3,
  },
  aiBubble: {
    backgroundColor: Colors.void900 + '99',
    borderColor: Colors.voidBorder,
    borderTopLeftRadius: 3,
    borderLeftWidth: 2,
    borderLeftColor: Colors.cosmicCyan + '73',
  },
  bubbleText: {
    fontSize: 14,
    color: Colors.slate300,
    lineHeight: 20,
  },
  extractBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  extractBtnText: {
    fontSize: 10,
    color: Colors.slate500,
    fontFamily: Platform.OS === 'ios' ? 'Courier' : 'monospace',
  },
  anchoredLabel: {
    fontSize: 9,
    color: Colors.slate600,
    fontStyle: 'italic',
    fontFamily: Platform.OS === 'ios' ? 'Courier' : 'monospace',
  },
  inputRow: {
    flexDirection: 'row',
    alignItems: 'flex-end',
    paddingHorizontal: 12,
    paddingTop: 10,
    borderTopWidth: 1,
    borderTopColor: Colors.voidBorder,
    backgroundColor: Colors.void900 + 'F5',
    gap: 8,
  },
  textInput: {
    flex: 1,
    backgroundColor: Colors.void800 + '99',
    borderWidth: 1,
    borderColor: Colors.void700 + 'CC',
    borderRadius: 14,
    paddingHorizontal: 14,
    paddingVertical: 10,
    fontSize: 14,
    color: Colors.slate200,
    maxHeight: 100,
  },
  sendBtn: {
    width: 38,
    height: 38,
    borderRadius: 12,
    backgroundColor: Colors.void700,
    alignItems: 'center',
    justifyContent: 'center',
  },
  sendBtnDisabled: {
    opacity: 0.3,
  },
  sendBtnPressed: {
    opacity: 0.7,
  },
});
