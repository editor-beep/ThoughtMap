import React, { useCallback } from 'react';
import {
  View,
  Text,
  Pressable,
  StyleSheet,
  Platform,
} from 'react-native';
import { router } from 'expo-router';
import { Trash2 } from 'lucide-react-native';
import { ThoughtNode } from '../lib/types';
import { Colors } from '../constants/colors';
import { useThoughtStore } from '../lib/store';
import TypeIcon from './TypeIcon';

interface Props {
  node: ThoughtNode;
}

export default function NodeCard({ node }: Props) {
  const { deleteNode, realms } = useThoughtStore();
  const nodeColor = Colors.nodeColors[node.type] ?? Colors.cosmicCyan;
  const nodeRealms = realms.filter((r) => node.realms.includes(r.id));

  const handleDelete = useCallback(() => {
    deleteNode(node.id);
  }, [node.id, deleteNode]);

  return (
    <Pressable
      onPress={() => router.push(`/node/${node.id}` as never)}
      style={({ pressed }) => [
        styles.card,
        { borderLeftColor: nodeColor + '80' },
        pressed && styles.pressed,
      ]}
    >
      <View style={styles.header}>
        <TypeIcon type={node.type} size={13} color={nodeColor} />
        <Text style={[styles.typeLabel, { color: nodeColor }]}>{node.type}</Text>
        <Pressable onPress={handleDelete} style={styles.deleteBtn} hitSlop={12}>
          <Trash2 size={12} color={Colors.slate600} />
        </Pressable>
      </View>

      <Text style={styles.title} numberOfLines={2}>
        {node.title}
      </Text>

      <Text style={styles.content} numberOfLines={3}>
        {node.content}
      </Text>

      {nodeRealms.length > 0 && (
        <View style={styles.realmRow}>
          {nodeRealms.slice(0, 3).map((r) => (
            <View key={r.id} style={styles.realmTag}>
              <Text style={[styles.realmTagText, { color: r.color + 'BB' }]}>@{r.name.toLowerCase()}</Text>
            </View>
          ))}
        </View>
      )}
    </Pressable>
  );
}

const styles = StyleSheet.create({
  card: {
    backgroundColor: Colors.void800 + 'E6',
    borderRadius: 12,
    borderLeftWidth: 3,
    padding: 14,
    gap: 8,
    borderWidth: 1,
    borderColor: Colors.voidBorder,
    marginBottom: 10,
  },
  pressed: {
    opacity: 0.8,
    transform: [{ scale: 0.99 }],
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  typeLabel: {
    flex: 1,
    fontFamily: Platform.OS === 'ios' ? 'Courier' : 'monospace',
    fontSize: 9,
    letterSpacing: 2,
    textTransform: 'uppercase',
  },
  deleteBtn: {
    padding: 2,
  },
  title: {
    fontSize: 15,
    fontWeight: '600',
    color: Colors.slate200,
    lineHeight: 20,
  },
  content: {
    fontSize: 12,
    color: Colors.slate400,
    lineHeight: 18,
  },
  realmRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 4,
    marginTop: 2,
  },
  realmTag: {
    backgroundColor: Colors.void700 + '99',
    borderRadius: 4,
    paddingHorizontal: 6,
    paddingVertical: 2,
  },
  realmTagText: {
    fontFamily: Platform.OS === 'ios' ? 'Courier' : 'monospace',
    fontSize: 9,
  },
});
