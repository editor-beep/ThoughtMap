export const HUD_SPACING = 16;
export const HUD_STACK_GAP = 12;

export const HUD_ZONES = {
  topLeft: { top: HUD_SPACING, left: HUD_SPACING },
  topRight: { top: HUD_SPACING, right: HUD_SPACING },
  bottomLeft: { bottom: HUD_SPACING, left: HUD_SPACING },
  bottomRight: { bottom: HUD_SPACING, right: HUD_SPACING },
} as const;

export const HUD_LAYERS = {
  graph: 1,
  minimap: 10,
  controls: 20,
  overlays: 30,
  modals: 100,
} as const;
