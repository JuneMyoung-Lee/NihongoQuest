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
    return updated;
  }

  if (updated.stats.lastPlayedDate === today) {
    return updated;
  }

  // 날짜가 바뀐 경우
  updated.stats.todayAnswered = 0;
  updated.stats.todayClearedStages = 0;
  updated.stats.lastPlayedDate = today;

  return updated;
}
