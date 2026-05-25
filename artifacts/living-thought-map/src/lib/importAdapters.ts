import { DEBUG, IS_DEV } from '../config/debug';

export type ImportType = 'thoughtmap' | 'vaultmind' | 'unknown';

type NormalizedImportNode = {
  id: string;
  title: string;
  body: string;
  type: string;
  tags: string[];
};

type NormalizedImportEdge = {
  id: string;
  source: string;
  target: string;
  type: string;
};

type NormalizedImport = {
  nodes: NormalizedImportNode[];
  edges: NormalizedImportEdge[];
};

export function detectImportType(data: any): ImportType {
  if (data?.nodes && data?.edges) {
    return 'thoughtmap';
  }
  if (data?.artifacts || data?.concepts || data?.relationships) {
    return 'vaultmind';
  }
  return 'unknown';
}

function normalizeNode(raw: any, index: number): NormalizedImportNode {
  return {
    id: raw?.id ?? crypto.randomUUID(),
    title: raw?.title ?? raw?.name ?? raw?.label ?? `Artifact ${index + 1}`,
    body: raw?.body ?? raw?.summary ?? raw?.description ?? '',
    type: raw?.type ?? 'thought',
    tags: Array.isArray(raw?.tags) ? raw.tags : [],
  };
}

function normalizeEdge(raw: any): NormalizedImportEdge {
  return {
    id: raw?.id ?? crypto.randomUUID(),
    source: raw?.source ?? raw?.sourceId,
    target: raw?.target ?? raw?.targetId,
    type: raw?.type ?? 'related',
  };
}

export function normalizeImport(data: any): NormalizedImport {
  const rawNodes = data?.artifacts ?? data?.concepts ?? [];
  const rawEdges = data?.relationships ?? data?.edges ?? [];

  if (IS_DEV && DEBUG.imports) console.log('[RAW NODE COUNT]', rawNodes.length);

  const nodes = rawNodes.map(normalizeNode);
  const edges = rawEdges
    .map(normalizeEdge)
    .filter((edge: NormalizedImportEdge) => typeof edge.source === 'string' && typeof edge.target === 'string');

  if (IS_DEV && DEBUG.imports) {
    console.log('[NORMALIZED NODE COUNT]', nodes.length);
    console.log('[NORMALIZED EDGE COUNT]', edges.length);
  }

  return {
    nodes,
    edges,
  };
}

export function adaptVaultMindToThoughtMap(data: any) {
  const normalized = normalizeImport(data);

  const nodes = normalized.nodes.map((node, index: number) => ({
    id: node.id,
    title: node.title,
    content: node.body,
    type: node.type,
    tags: node.tags,
    x: Math.cos(index * 0.5) * 400,
    y: Math.sin(index * 0.5) * 400,
    realms: [],
  }));

  return {
    nodes,
    edges: normalized.edges,
    realms: [],
  };
}
