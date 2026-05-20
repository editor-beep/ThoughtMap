import React, { useMemo, useCallback } from 'react';
import {
  View,
  Text,
  FlatList,
  StyleSheet,
  Platform,
  ListRenderItemInfo,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useThoughtStore } from '../../lib/store';
import { ThoughtNode } from '../../lib/types';
import { Colors } from '../../constants/colors';
import NodeCard from '../../components/NodeCard';

export default function NodesScreen() {
  const { nodes, realms } = useThoughtStore();
  const insets = useSafeAreaInsets();

  const activeRealmIds = useMemo(
    () => new Set(realms.filter((r) => r.isActive).map((r) => r.id)),
    [realms]
  );

  const visibleNodes = useMemo(
    () =>
      nodes
        .filter((n) => n.realms.length === 0 || n.realms.some((r) => activeRealmIds.has(r)))
        .slice()
        .sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()),
    [nodes, activeRealmIds]
  );

  const renderItem = useCallback(
    ({ item }: ListRenderItemInfo<ThoughtNode>) => <NodeCard node={item} />,
    []
  );

  return (
    <View style={[styles.container, { paddingTop: insets.top }]}>
      <View style={styles.header}>
        <View style={styles.pulsingDot} />
        <Text style={styles.headerTitle}>
          Active Anchors
          {nodes.length > 0 && (
            <Text style={styles.headerCount}> ({nodes.length})</Text>
          )}
        </Text>
      </View>

      {visibleNodes.length === 0 ? (
        <View style={styles.empty}>
          <Text style={styles.emptyTitle}>Begin thinking.</Text>
          <Text style={styles.emptySubtitle}>Every message can become a node.</Text>
        </View>
      ) : (
        <FlatList
          data={visibleNodes}
          keyExtractor={(item) => item.id}
          renderItem={renderItem}
          contentContainerStyle={[styles.listContent, { paddingBottom: insets.bottom + 20 }]}
          showsVerticalScrollIndicator={false}
        />
      )}
    </View>
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
    paddingVertical: 14,
    borderBottomWidth: 1,
    borderBottomColor: Colors.voidBorder,
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
  headerCount: {
    color: Colors.slate600,
  },
  empty: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
  },
  emptyTitle: {
    fontFamily: Platform.OS === 'ios' ? 'Courier' : 'monospace',
    fontSize: 11,
    letterSpacing: 3,
    textTransform: 'uppercase',
    color: Colors.slate500,
  },
  emptySubtitle: {
    fontFamily: Platform.OS === 'ios' ? 'Courier' : 'monospace',
    fontSize: 10,
    color: Colors.slate600,
  },
  listContent: {
    padding: 12,
    gap: 10,
  },
});
