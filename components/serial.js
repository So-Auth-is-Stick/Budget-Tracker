// Runs read-modify-write storage operations one at a time per key, so two quick saves
// (e.g. a recurring entry being added while you tap Save) can never overwrite each other.
const chains = {};
export function serial(key, fn) {
  const prev = chains[key] || Promise.resolve();
  const run = prev.then(fn, fn);
  chains[key] = run.catch(() => {});
  return run;
}
