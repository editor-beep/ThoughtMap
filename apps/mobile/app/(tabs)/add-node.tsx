import { useEffect, useRef } from 'react';
import { ActivityIndicator, StyleSheet, View } from 'react-native';
import { useRouter } from 'expo-router';
import { useThoughtStore } from '../../lib/store';
import { Colors } from '../../constants/colors';

export default function AddNodeScreen() {
  const router = useRouter();
  const hasCreatedRef = useRef(false);
  const { addNode, realms } = useThoughtStore();

  useEffect(() => {
    if (hasCreatedRef.current) return;
    hasCreatedRef.current = true;

    const defaultRealmId = realms.find((realm) => realm.isActive)?.id ?? realms[0]?.id;

    const newNodeId = addNode({
      title: 'Untitled Node',
      content: '',
      type: 'thought',
      realms: defaultRealmId ? [defaultRealmId] : [],
    });

    router.replace(`/node/${newNodeId}`);
  }, [addNode, realms, router]);

  return (
    <View style={styles.container}>
      <ActivityIndicator color={Colors.cosmicCyan} />
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: Colors.void900,
    alignItems: 'center',
    justifyContent: 'center',
  },
});
