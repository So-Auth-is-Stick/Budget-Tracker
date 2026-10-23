// Newest first by a timestamp field. Items without one keep their original order, after the rest.
export function sortByRecent(list, key = 'updatedAt') {
  return list
    .map((item, i) => ({ item, i }))
    .sort((a, b) => (b.item[key] || 0) - (a.item[key] || 0) || a.i - b.i)
    .map((x) => x.item);
}
