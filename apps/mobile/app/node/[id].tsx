import React, { useMemo, useState } from 'react';
import {
  View,
  Text,
  ScrollView,
  Pressable,
  StyleSheet,
  Platform,
  Alert,
} from 'react-native';
import { useLocalSearchParams, router } from 'expo-router';
import { ChevronDown, Trash2 } from 'lucide-react-native';
import { useThoughtStore } from '../../lib/store';
import { Colors } from '../../constants/colors';
import { EdgeType } from '../../lib/types';
import TypeIcon from '../../components/TypeIcon';

const EDGE_LABELS: Record<EdgeType, string> = {
  evolves_from: 'evolves from',
  contradicts: 'contradicts',
  references: 'references',
  remixes: 'remixes',
  supports: 'supports',
};

const EDGE_COLORS: Record<EdgeType, string> = {
  evolves_from: '#06b6d4',
  contradicts: '#f43f5e',
  references: '#3b82f6',
  remixes: '#a855f7',
  supports: '#10b981',
};

export default function NodeDetailScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const { nodes, edges, realms, deleteNode, updateNode, addRealm } = useThoughtStore();
  const [realmDropdownOpen, setRealmDropdownOpen] = useState(false);

  const node = useMemo(() => nodes.find((n) => n.id === id), [nodes, id]);

  const connections = useMemo(() => {
    if (!id) return [];
    return edges
      .filter((e) => e.source === id || e.target === id)
      .map((e) => {
        const otherId = e.source === id ? e.target : e.source;
        const otherNode = nodes.find((n) => n.id === otherId);
        return { edge: e, otherNode, isSource: e.source === id };
      });
  }, [edges, id, nodes]);

  const selectedRealmId = node?.realms[0] ?? null;

  const nodeRealms = useMemo(
    () => (node ? realms.filter((r) => node.realms.includes(r.id)) : []),
    [node, realms]
  );

  const handleDelete = () => {
    Alert.alert(
      'Delete Node',
      `Remove "${node?.title}" from the canvas?`,
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Delete',
          style: 'destructive',
          onPress: () => {
            if (id) deleteNode(id);
            router.back();
          },
        },
      ]
    );
  };

  const assignRealm = (realmId: string) => {
    if (!id) return;
    updateNode(id, { realms: [realmId] });
    setRealmDropdownOpen(false);
  };

  const handleAddRealm = () => {
    if (Platform.OS !== 'ios') {
      Alert.alert('Add Realm', 'Adding a new realm is currently available on iOS in this screen.');
      return;
    }

    Alert.prompt(
      'Add Realm',
      'Name your new realm:',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Add',
          onPress: (value) => {
            if (!value?.trim()) return;
            const newRealmId = addRealm(value);
            if (newRealmId) assignRealm(newRealmId);
          },
        },
      ],
      'plain-text'
    );
  };

  if (!node) {
    return (
      <View style={styles.notFound}>
        <Text style={styles.notFoundText}>Node not found.</Text>
      </View>
    );
  }

  const nodeColor = Colors.nodeColors[node.type] ?? Colors.cosmicCyan;

  return (
    <ScrollView
      style={styles.container}
      contentContainerStyle={styles.scrollContent}
      showsVerticalScrollIndicator={false}
    >
      <View style={[styles.typeHeader, { borderLeftColor: nodeColor }]}>
        <TypeIcon type={node.type} size={14} color={nodeColor} />
        <Text style={[styles.typeLabel, { color: nodeColor }]}>{node.type}</Text>
        <Pressable onPress={handleDelete} style={styles.deleteBtn} hitSlop={12}>
          <Trash2 size={14} color={Colors.slate500} />
        </Pressable>
      </View>

      <Text style={styles.title}>{node.title}</Text>

      <Text style={styles.body}>{node.content}</Text>

      <View style={styles.realmSection}>
        <Text style={styles.sectionLabel}>Realm</Text>
        <Pressable
          style={styles.realmDropdownTrigger}
          onPress={() => setRealmDropdownOpen((prev) => !prev)}
        >
          <Text style={styles.realmDropdownText}>
            {realms.find((r) => r.id === selectedRealmId)?.name ?? 'Choose realm'}
          </Text>
          <ChevronDown
            size={14}
            color={Colors.slate400}
            style={[styles.chevron, realmDropdownOpen && styles.chevronOpen]}
          />
        </Pressable>

        {realmDropdownOpen && (
          <View style={styles.realmDropdownMenu}>
            {realms.map((realm) => {
              const selected = realm.id === selectedRealmId;
              return (
                <Pressable
                  key={realm.id}
                  style={[styles.realmDropdownItem, selected && styles.realmDropdownItemSelected]}
                  onPress={() => assignRealm(realm.id)}
                >
                  <Text style={[styles.realmChipSymbol, { color: realm.color }]}>{realm.symbol}</Text>
                  <Text style={styles.realmChipName}>{realm.name}</Text>
                </Pressable>
              );
            })}
            <Pressable style={styles.addRealmItem} onPress={handleAddRealm}>
              <Text style={styles.addRealmText}>+ Add realm</Text>
            </Pressable>
          </View>
        )}

        {nodeRealms.length > 0 && (
          <View style={styles.realmChips}>
            {nodeRealms.map((r) => (
              <View key={r.id} style={[styles.realmChip, { borderColor: r.color + '60' }]}>
                <Text style={[styles.realmChipSymbol, { color: r.color }]}>{r.symbol}</Text>
                <Text style={styles.realmChipName}>{r.name}</Text>
              </View>
            ))}
          </View>
        )}
      </View>


      {connections.length > 0 && (
        <View style={styles.connectionsSection}>
          <Text style={styles.sectionLabel}>Connections</Text>
          <View style={styles.connectionList}>
            {connections.map(({ edge, otherNode, isSource }) => (
              <Pressable
                key={edge.id}
                onPress={() => otherNode && router.push(`/node/${otherNode.id}`)}
                style={styles.connectionRow}
              >
                <View style={[styles.connectionDot, { backgroundColor: EDGE_COLORS[edge.type] }]} />
                <View style={styles.connectionInfo}>
                  <Text style={[styles.connectionType, { color: EDGE_COLORS[edge.type] }]}>
                    {isSource ? '→' : '←'} {EDGE_LABELS[edge.type]}
                  </Text>
                  <Text style={styles.connectionTitle}>{otherNode?.title ?? 'Unknown'}</Text>
                </View>
              </Pressable>
            ))}
          </View>
        </View>
      )}

      <Text style={styles.timestamp}>{new Date(node.createdAt).toLocaleString()}</Text>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: Colors.void800 },
  scrollContent: { padding: 20, gap: 16 },
  typeHeader: { flexDirection: 'row', alignItems: 'center', gap: 8, borderLeftWidth: 2, paddingLeft: 10, marginBottom: 4 },
  typeLabel: { flex: 1, fontFamily: Platform.OS === 'ios' ? 'Courier' : 'monospace', fontSize: 10, letterSpacing: 2, textTransform: 'uppercase' },
  deleteBtn: { padding: 4 },
  title: { fontSize: 22, fontWeight: '700', color: Colors.slate200, lineHeight: 28 },
  body: { fontSize: 14, color: Colors.slate400, lineHeight: 22 },
  sectionLabel: { fontFamily: Platform.OS === 'ios' ? 'Courier' : 'monospace', fontSize: 9, letterSpacing: 2, textTransform: 'uppercase', color: Colors.slate600, marginBottom: 8 },
  realmSection: { marginTop: 8 },
  realmDropdownTrigger: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', backgroundColor: Colors.void700 + '80', borderColor: Colors.voidBorder, borderWidth: 1, borderRadius: 8, paddingHorizontal: 12, paddingVertical: 10 },
  realmDropdownText: { color: Colors.slate300, fontSize: 13 },
  chevron: {},
  chevronOpen: { transform: [{ rotate: '180deg' }] },
  realmDropdownMenu: { marginTop: 8, borderWidth: 1, borderColor: Colors.voidBorder, borderRadius: 8, overflow: 'hidden' },
  realmDropdownItem: { flexDirection: 'row', alignItems: 'center', gap: 8, paddingHorizontal: 10, paddingVertical: 8, backgroundColor: Colors.void700 + '66' },
  realmDropdownItemSelected: { backgroundColor: Colors.cosmicCyan + '18' },
  addRealmItem: { paddingHorizontal: 10, paddingVertical: 10, borderTopWidth: 1, borderTopColor: Colors.voidBorder, backgroundColor: Colors.void700 + '80' },
  addRealmText: { color: Colors.cosmicCyan, fontFamily: Platform.OS === 'ios' ? 'Courier' : 'monospace', fontSize: 11 },
  realmChips: { flexDirection: 'row', flexWrap: 'wrap', gap: 6, marginTop: 8 },
  realmChip: { flexDirection: 'row', alignItems: 'center', gap: 5, paddingHorizontal: 10, paddingVertical: 5, borderRadius: 6, borderWidth: 1, backgroundColor: Colors.void700 + '60' },
  realmChipSymbol: { fontSize: 13 },
  realmChipName: { fontFamily: Platform.OS === 'ios' ? 'Courier' : 'monospace', fontSize: 11, color: Colors.slate400 },

  connectionsSection: { marginTop: 8 },
  connectionList: { gap: 8 },
  connectionRow: { flexDirection: 'row', alignItems: 'center', gap: 12, paddingVertical: 8, paddingHorizontal: 12, borderRadius: 8, backgroundColor: Colors.void700 + '60' },
  connectionDot: { width: 8, height: 8, borderRadius: 4, flexShrink: 0 },
  connectionInfo: { flex: 1, gap: 2 },
  connectionType: { fontFamily: Platform.OS === 'ios' ? 'Courier' : 'monospace', fontSize: 10, letterSpacing: 1 },
  connectionTitle: { fontSize: 13, color: Colors.slate300, fontWeight: '500' },
  timestamp: { fontFamily: Platform.OS === 'ios' ? 'Courier' : 'monospace', fontSize: 10, color: Colors.slate600, textAlign: 'right', marginTop: 8 },
  notFound: { flex: 1, backgroundColor: Colors.void800, alignItems: 'center', justifyContent: 'center' },
  notFoundText: { color: Colors.slate500 },
});
