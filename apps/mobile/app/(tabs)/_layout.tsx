import { Tabs } from 'expo-router';
import { MessageSquare, Layers, CirclePlus, Compass } from 'lucide-react-native';
import { Colors } from '../../constants/colors';

export default function TabLayout() {
  return (
    <Tabs
      screenOptions={{
        headerShown: false,
        tabBarStyle: {
          backgroundColor: Colors.void800,
          borderTopColor: Colors.voidBorder,
          borderTopWidth: 1,
          elevation: 0,
          shadowOpacity: 0,
        },
        tabBarActiveTintColor: Colors.cosmicCyan,
        tabBarInactiveTintColor: Colors.slate500,
        tabBarLabelStyle: { fontSize: 10, letterSpacing: 1 },
      }}
    >
      <Tabs.Screen
        name="index"
        options={{
          title: 'Stream',
          tabBarIcon: ({ color, size }) => <MessageSquare size={size} color={color} />,
        }}
      />
      <Tabs.Screen
        name="nodes"
        options={{
          title: 'Anchors',
          tabBarIcon: ({ color, size }) => <Layers size={size} color={color} />,
        }}
      />

      <Tabs.Screen
        name="add-node"
        options={{
          title: 'Add',
          tabBarIcon: ({ color, size }) => <CirclePlus size={size} color={color} />,
        }}
      />
      <Tabs.Screen
        name="realms"
        options={{
          title: 'Realms',
          tabBarIcon: ({ color, size }) => <Compass size={size} color={color} />,
        }}
      />
    </Tabs>
  );
}
