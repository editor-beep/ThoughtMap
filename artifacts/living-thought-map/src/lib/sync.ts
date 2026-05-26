import { useThoughtStore } from '../store';

function getApiHeaders(token: string): Record<string, string> {
  return { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` };
}

export async function pullSync(): Promise<{ hasRemote: boolean; newerThanLocal: boolean; data: unknown }> {
  const { authToken, lastSyncedAt } = useThoughtStore.getState();
  if (!authToken) return { hasRemote: false, newerThanLocal: false, data: null };

  const res = await fetch('/api/sync', { headers: getApiHeaders(authToken) });
  if (!res.ok) return { hasRemote: false, newerThanLocal: false, data: null };

  const { data, updatedAt } = await res.json() as { data: unknown; updatedAt: string | null };
  if (!data || !updatedAt) return { hasRemote: false, newerThanLocal: false, data: null };

  const remoteTs = new Date(updatedAt).getTime();
  const newerThanLocal = !lastSyncedAt || remoteTs > lastSyncedAt;
  return { hasRemote: true, newerThanLocal, data };
}

export async function pushSync(): Promise<void> {
  const store = useThoughtStore.getState();
  const { authToken } = store;
  if (!authToken) return;

  // Snapshot the persisted portion of state
  const snapshot = {
    maps: { ...store.maps, [store.currentMapId]: { ...store.maps[store.currentMapId], nodes: store.nodes, edges: store.edges } },
    currentMapId: store.currentMapId,
    nodes: store.nodes,
    edges: store.edges,
    realms: store.realms,
    chatHistory: store.chatHistory,
    nodeChats: store.nodeChats,
    cartographerStyle: store.cartographerStyle,
    cartographerMode: store.cartographerMode,
  };

  const res = await fetch('/api/sync', {
    method: 'PUT',
    headers: getApiHeaders(authToken),
    body: JSON.stringify({ data: snapshot }),
  });

  if (res.ok) {
    const { updatedAt } = await res.json() as { updatedAt: string };
    store.setLastSyncedAt(new Date(updatedAt).getTime());
  }
}

let pushDebounceTimer: ReturnType<typeof setTimeout> | null = null;

export function schedulePush(): void {
  if (pushDebounceTimer) clearTimeout(pushDebounceTimer);
  pushDebounceTimer = setTimeout(() => {
    pushSync().catch(() => { /* silent fail — sync is best-effort */ });
    pushDebounceTimer = null;
  }, 30_000);
}
