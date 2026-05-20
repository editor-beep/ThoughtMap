import { Stack } from 'expo-router';
import { GestureHandlerRootView } from 'react-native-gesture-handler';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import { StatusBar } from 'expo-status-bar';
import { Colors } from '../constants/colors';

export default function RootLayout() {
  return (
    <GestureHandlerRootView style={{ flex: 1, backgroundColor: Colors.void900 }}>
      <SafeAreaProvider>
        <StatusBar style="light" backgroundColor={Colors.void900} />
        <Stack screenOptions={{ headerShown: false, contentStyle: { backgroundColor: Colors.void900 } }}>
          <Stack.Screen name="(tabs)" />
          <Stack.Screen
            name="node/[id]"
            options={{
              presentation: 'modal',
              headerShown: true,
              headerStyle: { backgroundColor: Colors.void800 },
              headerTintColor: Colors.cosmicCyan,
              headerTitle: '',
              headerShadowVisible: false,
            }}
          />
        </Stack>
      </SafeAreaProvider>
    </GestureHandlerRootView>
  );
}
