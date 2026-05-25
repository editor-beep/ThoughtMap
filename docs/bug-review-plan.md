# Bug Review & Remediation Plan (Research Only)

Date: 2026-05-25

## Findings

1. **Missing dependency in mobile app**
   - `@react-navigation/bottom-tabs` is imported in mobile files but not declared in `artifacts/living-thought-map-mobile/package.json`.
   - This causes TypeScript module resolution failures during workspace typecheck.

2. **Unsafe color typing in mobile hook**
   - `hooks/useColors.ts` casts `colors` to `Record<string, typeof colors.light>`.
   - `constants/colors.ts` includes `radius: number`, which conflicts with that record value type.
   - This surfaces as TS2352 and blocks clean typecheck.

3. **Potential UI spacing defect in chat screen**
   - `useBottomTabBarHeight()` is used directly to offset both list and input container padding.
   - This can double-count bottom spacing depending on safe-area/tab-bar interaction.

## Reproduction Signal

- `pnpm run typecheck` fails in `artifacts/living-thought-map-mobile` with:
  - unresolved `@react-navigation/bottom-tabs` imports
  - TS2352 in `hooks/useColors.ts`

## Remediation Plan

1. Add missing dependency in `artifacts/living-thought-map-mobile/package.json`.
2. Refactor `useColors` typing to explicit palette/theme types and remove unsafe record cast.
3. Validate chat input/list bottom offsets on iOS, Android, and web, then normalize inset logic.
4. Re-run `pnpm run typecheck` and ensure full workspace passes.
5. Add CI guardrails to prevent dependency omissions and type-regression in mobile package.

## Scope Note

This document records analysis and implementation planning only.
