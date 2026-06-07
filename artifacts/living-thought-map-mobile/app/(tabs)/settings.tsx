import { Ionicons } from "@expo/vector-icons";
import { useAuth, useUser } from "@clerk/expo";
import React, { useState } from "react";
import { ActivityIndicator, Platform, Pressable, ScrollView, StyleSheet, Text, View } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";

import { TerrainId, useThought } from "@/context/ThoughtContext";
import { useColors } from "@/hooks/useColors";

const TERRAINS: { id: TerrainId; name: string; desc: string; icon: keyof typeof Ionicons.glyphMap; color: string }[] = [
  { id: "the-void", name: "The Void", desc: "Pure darkness. No distractions.", icon: "ellipse-outline", color: "#a855f7" },
  { id: "memory-palace", name: "Memory Palace", desc: "Amber corridors of stored thought.", icon: "business-outline", color: "#f59e0b" },
  { id: "interstellar-plane", name: "Interstellar Plane", desc: "Infinite starfield. Cosmic scale.", icon: "planet-outline", color: "#3b82f6" },
  { id: "terrestrial-globe", name: "Terrestrial Globe", desc: "Earth's topography as canvas.", icon: "earth-outline", color: "#10b981" },
  { id: "mythic-landscape", name: "Mythic Landscape", desc: "Ancient lands and sacred geometry.", icon: "triangle-outline", color: "#f43f5e" },
];

export default function SettingsScreen() {
  const colors = useColors();
  const insets = useSafeAreaInsets();
  const { realms, activeTerrain, toggleRealm, setTerrain } = useThought();
  const { signOut, isSignedIn } = useAuth();
  const { user } = useUser();
  const s = makeStyles(colors);

  const [signOutLoading, setSignOutLoading] = useState(false);

  const handleSignOut = async () => {
    setSignOutLoading(true);
    try { await signOut(); } finally { setSignOutLoading(false); }
  };

  return (
    <ScrollView style={[s.container, { backgroundColor: colors.background }]} contentContainerStyle={{ paddingBottom: insets.bottom + 80 }}>
      {/* Header */}
      <View style={[s.header, { paddingTop: Platform.OS === "web" ? 67 : insets.top, borderBottomColor: colors.border }]}>
        <View style={s.headerLeft}>
          <View style={[s.dot, { backgroundColor: colors.cosmicAmber }]} />
          <Text style={[s.headerTitle, { color: colors.foreground }]}>SETTINGS</Text>
        </View>
        <Text style={[s.headerSub, { color: colors.mutedForeground }]}>Configure your realm</Text>
      </View>

      {/* Account */}
      {isSignedIn && (
        <View style={s.section}>
          <Text style={[s.sectionTitle, { color: colors.mutedForeground }]}>ACCOUNT</Text>
          <View style={[s.accountCard, { backgroundColor: colors.card, borderColor: colors.border }]}>
            <View style={s.accountRow}>
              <Ionicons name="person-circle-outline" size={20} color={colors.mutedForeground} />
              <Text style={[s.accountEmail, { color: colors.foreground }]} numberOfLines={1}>
                {user?.primaryEmailAddress?.emailAddress ?? "Signed in"}
              </Text>
            </View>
            <View style={[s.divider, { backgroundColor: colors.border }]} />

            <Pressable
              style={[s.btnOutline, { borderColor: colors.border }, signOutLoading && s.btnDisabled]}
              onPress={handleSignOut}
              disabled={signOutLoading}
            >
              {signOutLoading
                ? <ActivityIndicator size="small" color="#f43f5e" />
                : <>
                    <Ionicons name="log-out-outline" size={15} color="#f43f5e" />
                    <Text style={[s.btnOutlineText, { color: "#f43f5e" }]}>Sign out</Text>
                  </>
              }
            </Pressable>
          </View>
        </View>
      )}

      {/* Symbolic Realms */}
      <View style={s.section}>
        <Text style={[s.sectionTitle, { color: colors.mutedForeground }]}>SYMBOLIC REALMS</Text>
        {realms.map((realm) => (
          <Pressable key={realm.id}
            style={[s.realmRow, {
              backgroundColor: realm.isActive ? realm.color + "0d" : colors.card,
              borderColor: realm.isActive ? realm.color + "44" : colors.border,
            }]}
            onPress={() => toggleRealm(realm.id)}
          >
            <View style={[s.realmSymbol, { backgroundColor: realm.color + "22" }]}>
              <Text style={{ color: realm.color, fontSize: 14 }}>{realm.symbol}</Text>
            </View>
            <Text style={[s.realmName, { color: realm.isActive ? colors.foreground : colors.mutedForeground }]}>{realm.name}</Text>
            <View style={{ flex: 1 }} />
            <View style={[s.toggle, {
              backgroundColor: realm.isActive ? realm.color : colors.muted,
              borderColor: realm.isActive ? realm.color : colors.border,
            }]}>
              {realm.isActive && <Ionicons name="checkmark" size={12} color="#fff" />}
            </View>
          </Pressable>
        ))}
      </View>

      {/* Terrain */}
      <View style={s.section}>
        <Text style={[s.sectionTitle, { color: colors.mutedForeground }]}>ACTIVE TERRAIN</Text>
        {TERRAINS.map((t) => {
          const isActive = activeTerrain === t.id;
          return (
            <Pressable key={t.id}
              style={[s.terrainRow, {
                backgroundColor: isActive ? t.color + "10" : colors.card,
                borderColor: isActive ? t.color + "55" : colors.border,
              }]}
              onPress={() => setTerrain(t.id)}
            >
              <View style={[s.terrainIcon, { backgroundColor: t.color + "22", borderColor: t.color + "44" }]}>
                <Ionicons name={t.icon} size={20} color={t.color} />
              </View>
              <View style={{ flex: 1 }}>
                <Text style={[s.terrainName, { color: isActive ? colors.foreground : colors.mutedForeground }]}>{t.name}</Text>
                <Text style={[s.terrainDesc, { color: colors.mutedForeground }]}>{t.desc}</Text>
              </View>
              {isActive && <Ionicons name="radio-button-on" size={18} color={t.color} />}
            </Pressable>
          );
        })}
      </View>

      {/* About */}
      <View style={s.section}>
        <Text style={[s.sectionTitle, { color: colors.mutedForeground }]}>ABOUT</Text>
        <View style={[s.aboutCard, { backgroundColor: colors.card, borderColor: colors.border }]}>
          <Text style={[s.aboutTitle, { color: colors.foreground }]}>Living Thought Map</Text>
          <Text style={[s.aboutBody, { color: colors.mutedForeground }]}>
            A spatial thought-mapping canvas with AI exploration. Chat with the Navigator, crystallize insights into nodes, and organize them by symbolic realm.
          </Text>
          <Text style={[s.aboutVersion, { color: colors.mutedForeground }]}>V0.1.0 // Spatial Dominance</Text>
        </View>
      </View>
    </ScrollView>
  );
}

// eslint-disable-next-line @typescript-eslint/no-explicit-any
function makeStyles(colors: any) {
  return StyleSheet.create({
    container: { flex: 1 },
    header: { flexDirection: "row", alignItems: "center", justifyContent: "space-between", paddingHorizontal: 16, paddingBottom: 12, borderBottomWidth: 1 },
    headerLeft: { flexDirection: "row", alignItems: "center", gap: 8 },
    dot: { width: 7, height: 7, borderRadius: 4 },
    headerTitle: { fontSize: 12, fontFamily: "Inter_600SemiBold", letterSpacing: 2 },
    headerSub: { fontSize: 11, fontFamily: "Inter_400Regular" },
    section: { paddingHorizontal: 16, paddingTop: 24 },
    sectionTitle: { fontSize: 10, fontFamily: "Inter_600SemiBold", letterSpacing: 1.5, marginBottom: 10 },
    accountCard: { borderRadius: 14, borderWidth: 1, overflow: "hidden" },
    accountRow: { flexDirection: "row", alignItems: "center", gap: 10, padding: 14 },
    accountEmail: { fontSize: 14, fontFamily: "Inter_500Medium", flex: 1 },
    divider: { height: 1, marginHorizontal: 14 },
    btnOutline: { flexDirection: "row", alignItems: "center", justifyContent: "center", gap: 7, margin: 12, paddingVertical: 11, borderRadius: 10, borderWidth: 1 },
    btnOutlineText: { fontSize: 14, fontFamily: "Inter_500Medium" },
    btnDisabled: { opacity: 0.5 },
    realmRow: { flexDirection: "row", alignItems: "center", gap: 12, padding: 12, borderRadius: 12, borderWidth: 1, marginBottom: 6 },
    realmSymbol: { width: 32, height: 32, borderRadius: 8, alignItems: "center", justifyContent: "center" },
    realmName: { fontSize: 14, fontFamily: "Inter_500Medium" },
    toggle: { width: 22, height: 22, borderRadius: 11, borderWidth: 1, alignItems: "center", justifyContent: "center" },
    terrainRow: { flexDirection: "row", alignItems: "center", gap: 12, padding: 14, borderRadius: 12, borderWidth: 1, marginBottom: 8 },
    terrainIcon: { width: 44, height: 44, borderRadius: 12, borderWidth: 1, alignItems: "center", justifyContent: "center", flexShrink: 0 },
    terrainName: { fontSize: 14, fontFamily: "Inter_600SemiBold", marginBottom: 2 },
    terrainDesc: { fontSize: 12, fontFamily: "Inter_400Regular" },
    aboutCard: { padding: 16, borderRadius: 12, borderWidth: 1, gap: 8 },
    aboutTitle: { fontSize: 15, fontFamily: "Inter_600SemiBold" },
    aboutBody: { fontSize: 13, lineHeight: 19, fontFamily: "Inter_400Regular" },
    aboutVersion: { fontSize: 10, fontFamily: "Inter_400Regular", letterSpacing: 1 },
  });
}
