import React, { useMemo } from 'react';
import {
  View,
  Text,
  ScrollView,
  Pressable,
  StyleSheet,
  Platform,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useThoughtStore } from '../../lib/store';
import { Colors } from '../../constants/colors';
import { TerrainId } from '../../lib/types';

const TERRAINS: { id: TerrainId; name: string; description: string }[] = [
  { id: 'memory-palace', name: 'Memory Palace', description: 'Warm candlelight and deep recall.' },
  { id: 'interstellar-plane', name: 'Interstellar', description: 'Infinite starfield, ideas without gravity.' },
  { id: 'terrestrial-globe', name: 'Terrestrial', description: 'Antique parchment, the weight of place.' },
  { id: 'mythic-landscape', name: 'Mythic', description: 'Glowing flora, the border of waking.' },
  { id: 'the-void', name: 'The Void', description: 'Near-perfect darkness. Maximum focus.' },
];

export default function RealmsScreen() {
  const { realms, toggleRealm, nodes, activeTerrain, setTerrain } = useThoughtStore();
  const insets = useSafeAreaInsets();

  const realmCounts = useMemo(() => {
    const counts: Record<string, number> = {};
    realms.forEach((r) => {
      counts[r.id] = nodes.filter((n) => n.realms.includes(r.id)).length;
    });
    return counts;
  }, [realms, nodes]);

  return (
    <ScrollView
      style={styles.container}
      contentContainerStyle={[
        styles.scrollContent,
        { paddingTop: insets.top + 16, paddingBottom: insets.bottom + 24 },
      ]}
      showsVerticalScrollIndicator={false}
    >
      <View style={styles.header}>
        <View style={styles.pulsingDot} />
        <Text style={styles.headerTitle}>Symbolic Realms</Text>
      </View>

      <View style={styles.section}>
        {realms.map((realm) => (
          <Pressable
            key={realm.id}
            onPress={() => toggleRealm(realm.id)}
            style={({ pressed }) => [
              styles.realmRow,
              realm.isActive && styles.realmRowActive,
              pressed && styles.realmRowPressed,
            ]}
          >
            <View style={styles.realmLeft}>
              <Text style={[styles.realmSymbol, { color: realm.isActive ? realm.color : Colors.slate600 }]}>
                {realm.symbol}
              </Text>
              <Text style={[styles.realmName, realm.isActive ? styles.realmNameActive : styles.realmNameInactive]}>
                {realm.name}
              </Text>
            </View>
            <View style={styles.realmRight}>
              {realmCounts[realm.id] > 0 && (
                <Text style={[styles.realmCount, { color: realm.isActive ? realm.color : Colors.slate600 }]}>
                  {realmCounts[realm.id]}
                </Text>
              )}
              <View
                style={[
                  styles.activeDot,
                  { backgroundColor: realm.isActive ? realm.color : 'transparent' },
                ]}
              />
            </View>
          </Pressable>
        ))}
      </View>

      <View style={styles.divider} />

      <View style={styles.sanctumHeader}>
        <Text style={styles.sectionLabel}>The Sanctum</Text>
        <Text style={styles.sectionSub}>Choose the skin of your mind.</Text>
      </View>

      <View style={styles.terrainGrid}>
        {TERRAINS.map((terrain) => {
          const isActive = activeTerrain === terrain.id;
          return (
            <Pressable
              key={terrain.id}
              onPress={() => setTerrain(terrain.id)}
              style={({ pressed }) => [
                styles.terrainCard,
                isActive && styles.terrainCardActive,
                pressed && styles.terrainCardPressed,
              ]}
            >
              <View style={[styles.terrainSwatch, isActive && styles.terrainSwatchActive]}>
                {isActive && <View style={styles.terrainActiveDot} />}
              </View>
              <View style={styles.terrainInfo}>
                <Text style={[styles.terrainName, isActive && styles.terrainNameActive]}>
                  {terrain.name}
                </Text>
                <Text style={styles.terrainDesc} numberOfLines={2}>
                  {terrain.description}
                </Text>
              </View>
            </Pressable>
          );
        })}
      </View>

      <View style={styles.footer}>
        <Text style={styles.footerText}>V0.1.0 // Spatial Dominance</Text>
      </View>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: Colors.void900,
  },
  scrollContent: {
    paddingHorizontal: 16,
  },
  header: {
    marginBottom: 16,
  },
  pulsingDot: {
    width: 6,
    height: 6,
    borderRadius: 3,
    backgroundColor: Colors.cosmicCyan,
    marginBottom: 8,
  },
  headerTitle: {
    fontFamily: Platform.OS === 'ios' ? 'Courier' : 'monospace',
    fontSize: 11,
    letterSpacing: 2,
    textTransform: 'uppercase',
    color: Colors.slate400,
  },
  sanctumHeader: {
    marginBottom: 16,
  },
  sectionLabel: {
    fontFamily: Platform.OS === 'ios' ? 'Courier' : 'monospace',
    fontSize: 13,
    letterSpacing: 2,
    textTransform: 'uppercase',
    color: Colors.slate300,
    marginBottom: 4,
  },
  sectionSub: {
    fontFamily: Platform.OS === 'ios' ? 'Courier' : 'monospace',
    fontSize: 10,
    color: Colors.slate500,
    letterSpacing: 1,
  },
  section: {
    gap: 2,
    marginBottom: 24,
  },
  realmRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 12,
    paddingVertical: 10,
    borderRadius: 8,
  },
  realmRowActive: {
    backgroundColor: Colors.void700 + '99',
  },
  realmRowPressed: {
    opacity: 0.7,
  },
  realmLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
  },
  realmSymbol: {
    fontSize: 16,
    width: 24,
    textAlign: 'center',
  },
  realmName: {
    fontFamily: Platform.OS === 'ios' ? 'Courier' : 'monospace',
    fontSize: 12,
  },
  realmNameActive: {
    color: Colors.slate200,
  },
  realmNameInactive: {
    color: Colors.slate600,
  },
  realmRight: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  realmCount: {
    fontFamily: Platform.OS === 'ios' ? 'Courier' : 'monospace',
    fontSize: 10,
  },
  activeDot: {
    width: 5,
    height: 5,
    borderRadius: 3,
  },
  divider: {
    height: 1,
    backgroundColor: Colors.voidBorder,
    marginVertical: 24,
  },
  terrainGrid: {
    gap: 10,
  },
  terrainCard: {
    flexDirection: 'row',
    borderRadius: 10,
    overflow: 'hidden',
    borderWidth: 1,
    borderColor: Colors.void700 + '80',
  },
  terrainCardActive: {
    borderColor: Colors.cosmicCyan + '99',
  },
  terrainCardPressed: {
    opacity: 0.75,
  },
  terrainSwatch: {
    width: 64,
    backgroundColor: Colors.void700,
    alignItems: 'flex-end',
    justifyContent: 'flex-start',
    padding: 6,
  },
  terrainSwatchActive: {
    backgroundColor: Colors.cosmicCyan + '22',
  },
  terrainActiveDot: {
    width: 6,
    height: 6,
    borderRadius: 3,
    backgroundColor: Colors.cosmicCyan,
  },
  terrainInfo: {
    flex: 1,
    padding: 10,
    backgroundColor: Colors.void800 + 'CC',
  },
  terrainName: {
    fontFamily: Platform.OS === 'ios' ? 'Courier' : 'monospace',
    fontSize: 11,
    letterSpacing: 1,
    color: Colors.slate300,
    marginBottom: 3,
  },
  terrainNameActive: {
    color: Colors.cosmicCyan,
  },
  terrainDesc: {
    fontSize: 11,
    color: Colors.slate500,
    lineHeight: 15,
  },
  footer: {
    marginTop: 32,
    alignItems: 'center',
  },
  footerText: {
    fontFamily: Platform.OS === 'ios' ? 'Courier' : 'monospace',
    fontSize: 10,
    color: Colors.slate600,
    letterSpacing: 1,
  },
});
