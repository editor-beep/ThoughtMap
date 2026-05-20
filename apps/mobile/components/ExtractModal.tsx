import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  Modal,
  Pressable,
  TextInput,
  StyleSheet,
  Platform,
} from 'react-native';
import { useThoughtStore } from '../lib/store';
import { NodeType } from '../lib/types';
import { Colors } from '../constants/colors';
import { X } from 'lucide-react-native';

const NODE_TYPES: { value: NodeType; label: string }[] = [
  { value: 'thought', label: 'Thought' },
  { value: 'joke', label: 'Joke' },
  { value: 'character', label: 'Character' },
  { value: 'myth', label: 'Myth' },
  { value: 'research', label: 'Research' },
  { value: 'canon', label: 'Canon' },
  { value: 'contradiction', label: 'Contradiction' },
  { value: 'artifact', label: 'Artifact' },
  { value: 'fragment', label: 'Fragment' },
];

interface Props {
  visible: boolean;
  messageId: string | null;
  onClose: () => void;
}

export default function ExtractModal({ visible, messageId, onClose }: Props) {
  const { extractToMap } = useThoughtStore();
  const [title, setTitle] = useState('');
  const [nodeType, setNodeType] = useState<NodeType>('thought');

  useEffect(() => {
    if (visible) {
      setTitle('');
      setNodeType('thought');
    }
  }, [visible]);

  const handleCommit = () => {
    if (!title.trim() || !messageId) return;
    extractToMap(messageId, nodeType, title.trim());
    onClose();
  };

  return (
    <Modal visible={visible} transparent animationType="slide" onRequestClose={onClose}>
      <Pressable style={styles.backdrop} onPress={onClose}>
        <Pressable style={styles.sheet} onPress={() => { /* stop propagation */ }}>
          <View style={styles.dragHandle} />

          <View style={styles.titleRow}>
            <Text style={styles.sheetTitle}>Crystallize to Canvas</Text>
            <Pressable onPress={onClose} hitSlop={12}>
              <X size={16} color={Colors.slate500} />
            </Pressable>
          </View>

          <TextInput
            style={styles.input}
            value={title}
            onChangeText={setTitle}
            placeholder="Node title…"
            placeholderTextColor={Colors.slate600}
            autoFocus
            returnKeyType="done"
            onSubmitEditing={handleCommit}
          />

          <Text style={styles.typePickerLabel}>Type</Text>
          <View style={styles.typeGrid}>
            {NODE_TYPES.map(({ value, label }) => (
              <Pressable
                key={value}
                onPress={() => setNodeType(value)}
                style={[
                  styles.typeChip,
                  nodeType === value && {
                    borderColor: (Colors.nodeColors[value] ?? Colors.cosmicCyan) + 'AA',
                    backgroundColor: (Colors.nodeColors[value] ?? Colors.cosmicCyan) + '22',
                  },
                ]}
              >
                <Text
                  style={[
                    styles.typeChipText,
                    nodeType === value && { color: Colors.nodeColors[value] ?? Colors.cosmicCyan },
                  ]}
                >
                  {label}
                </Text>
              </Pressable>
            ))}
          </View>

          <View style={styles.actions}>
            <Pressable onPress={onClose} style={styles.cancelBtn}>
              <Text style={styles.cancelText}>Cancel</Text>
            </Pressable>
            <Pressable
              onPress={handleCommit}
              disabled={!title.trim()}
              style={[styles.commitBtn, !title.trim() && styles.commitBtnDisabled]}
            >
              <Text style={styles.commitText}>Materialize</Text>
            </Pressable>
          </View>
        </Pressable>
      </Pressable>
    </Modal>
  );
}

const styles = StyleSheet.create({
  backdrop: {
    flex: 1,
    justifyContent: 'flex-end',
    backgroundColor: 'rgba(3,7,18,0.6)',
  },
  sheet: {
    backgroundColor: Colors.void800,
    borderTopLeftRadius: 20,
    borderTopRightRadius: 20,
    padding: 20,
    paddingBottom: Platform.OS === 'ios' ? 36 : 24,
    borderTopWidth: 1,
    borderTopColor: Colors.voidBorder,
    gap: 14,
  },
  dragHandle: {
    width: 36,
    height: 4,
    borderRadius: 2,
    backgroundColor: Colors.void600,
    alignSelf: 'center',
    marginBottom: 4,
  },
  titleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  sheetTitle: {
    fontFamily: Platform.OS === 'ios' ? 'Courier' : 'monospace',
    fontSize: 11,
    letterSpacing: 2,
    textTransform: 'uppercase',
    color: Colors.cosmicCyan + 'B3',
  },
  input: {
    backgroundColor: Colors.void900,
    borderWidth: 1,
    borderColor: Colors.voidBorder,
    borderRadius: 10,
    paddingHorizontal: 14,
    paddingVertical: 11,
    fontSize: 15,
    color: Colors.slate200,
  },
  typePickerLabel: {
    fontFamily: Platform.OS === 'ios' ? 'Courier' : 'monospace',
    fontSize: 9,
    letterSpacing: 2,
    textTransform: 'uppercase',
    color: Colors.slate600,
  },
  typeGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 6,
  },
  typeChip: {
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 6,
    borderWidth: 1,
    borderColor: Colors.voidBorder,
    backgroundColor: Colors.void700 + '60',
  },
  typeChipText: {
    fontFamily: Platform.OS === 'ios' ? 'Courier' : 'monospace',
    fontSize: 11,
    color: Colors.slate500,
  },
  actions: {
    flexDirection: 'row',
    justifyContent: 'flex-end',
    gap: 10,
    marginTop: 4,
  },
  cancelBtn: {
    paddingHorizontal: 16,
    paddingVertical: 10,
    borderRadius: 8,
  },
  cancelText: {
    fontSize: 14,
    color: Colors.slate500,
  },
  commitBtn: {
    paddingHorizontal: 20,
    paddingVertical: 10,
    borderRadius: 8,
    backgroundColor: Colors.cosmicCyan,
  },
  commitBtnDisabled: {
    opacity: 0.4,
  },
  commitText: {
    fontSize: 14,
    fontWeight: '600',
    color: Colors.void900,
  },
});
