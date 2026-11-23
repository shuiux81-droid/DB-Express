export function clamp(val, min, max) {
  return Math.max(min, Math.min(max, val));
}

export function computeWeightedTarget(status, elapsedSeconds = 0) {
  if (elapsedSeconds >= 2.0) return 100;
  let earned = 0;
  if (status.fontsDone) earned += 40;
  if (status.posterDone) earned += 40;
  if (status.domDone) earned += 20;
  return clamp(Math.max(10, earned), 10, 100);
}

export function stepDisplayedProgress(
  prevP,
  target,
  elapsedSeconds,
  minDurationSeconds = 0.7
) {
  const eased = prevP + (target - prevP) * 0.2;
  const timeCap = (Math.max(0, elapsedSeconds) / minDurationSeconds) * 100;
  const capped = Math.min(eased, timeCap);
  const monotonic = Math.max(prevP, capped);
  if (target >= 100 && monotonic >= 99.5) {
    return 100;
  }
  return clamp(monotonic, 0, 100);
}

export function quantizeReducedMotionPercent(p) {
  const c = clamp(p, 0, 100);
  if (Math.round(c) >= 100) return 100;
  return Math.min(100, Math.floor(c / 10) * 10);
}
