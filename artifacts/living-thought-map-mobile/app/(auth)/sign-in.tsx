import { useSignIn, useAuth } from '@clerk/expo';
import { Link, useRouter } from 'expo-router';
import React, { useState } from 'react';
import {
  View, Text, TextInput, Pressable, StyleSheet,
  KeyboardAvoidingView, Platform, ScrollView, ActivityIndicator,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

export default function SignInScreen() {
  const { signIn, errors, fetchStatus } = useSignIn();
  const { isSignedIn } = useAuth();
  const router = useRouter();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');

  if (isSignedIn) {
    router.replace('/(tabs)');
    return null;
  }

  const handleSignIn = async () => {
    const { error } = await signIn.password({ emailAddress: email, password });
    if (error) return;
    if (signIn.status === 'complete') {
      await signIn.finalize({
        navigate: ({ decorateUrl }) => {
          const url = decorateUrl('/');
          if (url.startsWith('http')) {
            // handled by Clerk SDK
          } else {
            router.replace('/(tabs)');
          }
        },
      });
    }
  };

  const isLoading = fetchStatus === 'fetching';

  return (
    <SafeAreaView style={styles.safe}>
      <KeyboardAvoidingView
        style={{ flex: 1 }}
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
      >
        <ScrollView contentContainerStyle={styles.container} keyboardShouldPersistTaps="handled">
          <View style={styles.logoRow}>
            <View style={styles.logoBox}>
              <Text style={styles.logoText}>✦</Text>
            </View>
          </View>

          <Text style={styles.title}>Welcome back</Text>
          <Text style={styles.subtitle}>Sign in to ThoughtMap</Text>

          <Text style={styles.label}>Email</Text>
          <TextInput
            style={styles.input}
            value={email}
            onChangeText={setEmail}
            placeholder="you@example.com"
            placeholderTextColor="#475569"
            keyboardType="email-address"
            autoCapitalize="none"
            autoComplete="email"
          />
          {(errors.fields as any)?.emailAddress && (
            <Text style={styles.fieldError}>{(errors.fields as any).emailAddress.message}</Text>
          )}

          <Text style={styles.label}>Password</Text>
          <TextInput
            style={styles.input}
            value={password}
            onChangeText={setPassword}
            placeholder="••••••••"
            placeholderTextColor="#475569"
            secureTextEntry
          />
          {errors.fields.password && (
            <Text style={styles.fieldError}>{errors.fields.password.message}</Text>
          )}

          {errors.global && errors.global.length > 0 && (
            <View style={styles.errorBox}>
              <Text style={styles.errorText}>{errors.global[0].longMessage ?? errors.global[0].message}</Text>
            </View>
          )}

          <Pressable
            style={[styles.btn, (isLoading || !email || !password) && styles.btnDisabled]}
            onPress={handleSignIn}
            disabled={isLoading || !email || !password}
          >
            {isLoading ? (
              <ActivityIndicator color="#030712" size="small" />
            ) : (
              <Text style={styles.btnText}>Sign in</Text>
            )}
          </Pressable>

          <View style={styles.linkRow}>
            <Text style={styles.linkMuted}>No account? </Text>
            <Link href="/(auth)/sign-up">
              <Text style={styles.link}>Sign up</Text>
            </Link>
          </View>
        </ScrollView>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: '#030712' },
  container: { flexGrow: 1, justifyContent: 'center', padding: 24 },
  logoRow: { alignItems: 'center', marginBottom: 32 },
  logoBox: {
    width: 56, height: 56, borderRadius: 16,
    backgroundColor: '#0b0f19', borderWidth: 1, borderColor: '#1e293b',
    alignItems: 'center', justifyContent: 'center',
  },
  logoText: { fontSize: 28, color: '#06b6d4' },
  title: { fontSize: 26, fontWeight: '700', color: '#f1f5f9', textAlign: 'center', marginBottom: 6 },
  subtitle: { fontSize: 14, color: '#64748b', textAlign: 'center', marginBottom: 32 },
  label: { fontSize: 13, fontWeight: '500', color: '#94a3b8', marginBottom: 6 },
  input: {
    backgroundColor: '#111827', borderWidth: 1, borderColor: '#1e293b',
    borderRadius: 10, paddingHorizontal: 14, paddingVertical: 12,
    color: '#f1f5f9', fontSize: 15, marginBottom: 4,
  },
  fieldError: { color: '#f43f5e', fontSize: 12, marginBottom: 8 },
  errorBox: {
    backgroundColor: 'rgba(244,63,94,0.1)', borderWidth: 1, borderColor: 'rgba(244,63,94,0.3)',
    borderRadius: 8, padding: 12, marginBottom: 16,
  },
  errorText: { color: '#f43f5e', fontSize: 13 },
  btn: {
    backgroundColor: '#06b6d4', borderRadius: 12, paddingVertical: 14,
    alignItems: 'center', marginTop: 20, marginBottom: 16,
  },
  btnDisabled: { opacity: 0.5 },
  btnText: { color: '#030712', fontSize: 15, fontWeight: '700' },
  linkRow: { flexDirection: 'row', justifyContent: 'center' },
  linkMuted: { color: '#64748b', fontSize: 14 },
  link: { color: '#06b6d4', fontSize: 14, fontWeight: '600' },
});
