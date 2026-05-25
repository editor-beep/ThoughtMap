import { NODE_VISUAL_MODE_THRESHOLDS } from './nodeVisualMode';

/** Minimum zoom level at which expanded card bodies are shown. Below this threshold cards render title-only. */
export const EXPAND_THRESHOLD = NODE_VISUAL_MODE_THRESHOLDS.COMPACT_CARD;

/** Below this zoom level cards transition to icon-only dot markers. */
export const DOT_THRESHOLD = NODE_VISUAL_MODE_THRESHOLDS.COMPACT_CARD;

/** Below this zoom level dot markers cluster into aggregate group markers. */
export const CLUSTER_THRESHOLD = NODE_VISUAL_MODE_THRESHOLDS.CLUSTER;
