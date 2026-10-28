// Look of a plan (icon + colour). Older plans without these fall back to 🎯 and the theme accent.
export const GOAL_ICONS = ['🎯', '🏠', '📱', '💻', '✈️', '🚗', '🎓', '💍', '🏥', '🎁', '🛡️', '🐷', '🏖️', '🎸', '👶', '🧾'];
export const GOAL_COLORS = ['#E8B84B', '#FF7043', '#EC407A', '#AB47BC', '#5C6BC0', '#42A5F5', '#26A69A', '#66BB6A', '#C0CA33', '#8D6E63'];

export const goalIcon = (g) => (g && g.icon) || '🎯';
export const goalColor = (g, t) => (g && g.color) || t.accent;

// How much to put aside per day/week to finish on time (null if not applicable)
export function savingPace(g, daysLeft) {
  if (!g || g.committed || !g.dueDate || daysLeft == null || daysLeft <= 0) return null;
  const left = g.targetAmount - g.savedAmount;
  if (left <= 0) return null;
  return { perDay: left / daysLeft, perWeek: (left / daysLeft) * 7, left };
}
