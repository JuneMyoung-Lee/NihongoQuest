export function getTodayString() {
  const d = new Date();
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, "0");
  const day = String(d.getDate()).padStart(2, "0");
  return `${y}-${m}-${day}`;
}

export function refreshDailyStats(player) {
  const today = getTodayString();
  const updated = { ...player, stats: { ...player.stats } };

  if (!updated.stats.lastPlayedDate) {
    updated.stats.lastPlayedDate = today;
    updated.stats.streakDays = 1;
    return updated;
  }

  if (updated.stats.lastPlayedDate === today) {
    return updated;
  }

  // 날짜가 바뀐 경우 — 어제와의 연속 여부 확인
  const last = new Date(updated.stats.lastPlayedDate);
  const now  = new Date(today);
  const diffDays = Math.round((now - last) / (1000 * 60 * 60 * 24));

  updated.stats.streakDays = diffDays === 1
    ? (updated.stats.streakDays ?? 0) + 1
    : 1;

  updated.stats.todayAnswered = 0;
  updated.stats.todayClearedStages = 0;
  updated.stats.dailyGoalClaimed = false;
  updated.stats.lastPlayedDate = today;

  return updated;
}
