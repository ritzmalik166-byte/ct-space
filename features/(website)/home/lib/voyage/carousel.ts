import { INITIAL_PARTNER_INDEX, PORTFOLIO_PARTNERS } from "../portfolioPartners";

/** Shared by the 3D orbit, the HTML panel/selector sync and the selector buttons. */
export const PARTNER_COUNT = PORTFOLIO_PARTNERS.length;
const STEPS = Math.max(PARTNER_COUNT - 1, 1);

/** Continuous active index for timeline orbit progress 0–1 (may exceed the count; wrap with `wrapIndex`). */
export function activeFloat(orbit: number) {
  return INITIAL_PARTNER_INDEX + orbit * STEPS;
}

export function wrapIndex(index: number) {
  return ((Math.round(index) % PARTNER_COUNT) + PARTNER_COUNT) % PARTNER_COUNT;
}

/** Signed distance from the active slot, wrapped to [-count/2, count/2). Negative = already passed. */
export function slotOffset(index: number, active: number) {
  const n = PARTNER_COUNT;
  let d = (index - active) % n;
  if (d < -n / 2) d += n;
  if (d >= n / 2) d -= n;
  return d;
}

/** Orbit progress (0–1) that centres a partner. */
export function orbitForPartner(index: number) {
  const steps = (((index - INITIAL_PARTNER_INDEX) % PARTNER_COUNT) + PARTNER_COUNT) % PARTNER_COUNT;
  return Math.min(1, steps / STEPS);
}
