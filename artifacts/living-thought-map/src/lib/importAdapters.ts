export type ImportType = 'thoughtmap' | 'vaultmind' | 'unknown';

export function detectImportType(data: any): ImportType {
  if (data?.nodes && data?.edges) {
    return 'thoughtmap';
  }
  if (data?.artifacts || data?.relationships) {
    return 'vaultmind';
  }
  return 'unknown';
}

export function adaptVaultMindToThoughtMap(data: any) {
  const artifacts = data?.artifacts ?? [];
  const relationships = data?.relationships ?? [];

  const nodes = artifacts.map((artifact: any, index: number) => ({
    id: artifact?.id ?? crypto.randomUUID(),
    title: artifact?.title ?? artifact?.name ?? 'Untitled Artifact',
    content: artifact?.body ?? artifact?.summary ?? '',
    type: artifact?.type ?? 'thought',
    tags: artifact?.tags ?? [],
    x: Math.cos(index * 0.5) * 400,
    y: Math.sin(index * 0.5) * 400,
    realms: [],
  }));

  const edges = relationships
    .filter((rel: any) => rel && typeof rel.source === 'string' && typeof rel.target === 'string')
    .map((rel: any) => ({
      id: crypto.randomUUID(),
      source: rel.source,
      target: rel.target,
      type: rel.type ?? 'related',
    }));

  return {
    nodes,
    edges,
    realms: [],
  };
}
