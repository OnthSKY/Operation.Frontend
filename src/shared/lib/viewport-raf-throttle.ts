/**
 * Coalesces rapid viewport / scroll events into one layout read per animation frame.
 */
export function rafThrottle(fn: () => void): {
  schedule: () => void;
  cancel: () => void;
  flush: () => void;
} {
  let id: number | null = null;
  const run = () => {
    id = null;
    fn();
  };
  const schedule = () => {
    if (id != null) return;
    id = requestAnimationFrame(run);
  };
  const cancel = () => {
    if (id != null) {
      cancelAnimationFrame(id);
      id = null;
    }
  };
  const flush = () => {
    cancel();
    fn();
  };
  return { schedule, cancel, flush };
}
