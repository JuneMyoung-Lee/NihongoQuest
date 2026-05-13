export function getRequiredExp(level) {
  return level * 100;
}

export function getTitleByLevel(level) {
  if (level >= 10) return "초급 문장 검사";
  if (level >= 5) return "단어 사냥꾼";
  if (level >= 3) return "히라가나 모험가";
  return "일본어 견습생";
}

export function applyExp(player, gainedExp) {
  let { level, exp } = player;
  exp += gainedExp;

  while (exp >= getRequiredExp(level)) {
    exp -= getRequiredExp(level);
    level += 1;
  }

  const title = getTitleByLevel(level);
  return { ...player, level, exp, title };
}

export function isStageUnlocked(stage, player) {
  if (!stage.requiredStageId) return true;
  return player.clearedStageIds.includes(stage.requiredStageId);
}

export function mergeUnique(arrayA, arrayB) {
  const set = new Set([...(arrayA || []), ...(arrayB || [])]);
  return Array.from(set);
}

export function getTodayQuestStage(stages, player) {
  if (!stages || stages.length === 0) return null;

  const unlocked = stages.filter((s) => isStageUnlocked(s, player));
  if (unlocked.length === 0) return null;

  const firstUncleared = unlocked.find(
    (s) => !player.clearedStageIds.includes(s.id)
  );
  if (firstUncleared) return firstUncleared;

  // 모두 클리어한 경우 마지막 해금 스테이지
  return unlocked[unlocked.length - 1];
}

export function getNextStage(currentStageId, stages, player) {
  if (!stages || stages.length === 0) return null;

  const currentIndex = stages.findIndex((s) => s.id === currentStageId);
  if (currentIndex === -1 || currentIndex >= stages.length - 1) return null;

  const next = stages[currentIndex + 1];
  if (!isStageUnlocked(next, player)) return null;

  return next;
}
