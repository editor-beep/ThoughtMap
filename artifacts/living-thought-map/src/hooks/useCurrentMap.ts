import { useMemo } from 'react';
import { useThoughtStore } from '../store';

export const useCurrentMap = () => {
  const currentMapId = useThoughtStore((s) => s.currentMapId);
  const maps = useThoughtStore((s) => s.maps);
  const switchMap = useThoughtStore((s) => s.switchMap);

  const currentMap = useMemo(() => maps[currentMapId] ?? null, [maps, currentMapId]);

  return {
    map: currentMap,
    isMaster: currentMap?.level === 'master',
    isDetail: currentMap?.level === 'detail',
    switchMap,
  };
};
