import { useThoughtStore } from '../store';

export const useMapNavigation = () => {
  const exitToParent = useThoughtStore((s) => s.exitToParent);
  const openSubMap = useThoughtStore((s) => s.openSubMap);

  return { exitToParent, openSubMap };
};
