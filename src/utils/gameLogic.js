export function calculateMaxHp(level) {
  return 100 + (level - 1) * 5;
}

export function getRequiredExp(level) {
  return level * 100;
}

export function getTitleByLevel(level) {
  if (level >= 15) return "일본어 전술가";
  if (level >= 10) return "초급 문장 검사";
  if (level >= 7) return "문법 사냥꾼";
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
  const maxHp = calculateMaxHp(level);
  return { ...player, level, exp, title, maxHp };
}

export function isStageUnlocked(stage, player) {
  if (!stage.requiredStageId) return true;
  const cleared = Array.isArray(player.clearedStageIds) && player.clearedStageIds.includes(stage.requiredStageId);
  const unlocked = Array.isArray(player.unlockedStageIds) && player.unlockedStageIds.includes(stage.id);
  return cleared || unlocked;
}

export function canAttemptTrial(stage, player) {
  if (isStageUnlocked(stage, player)) return false; // 이미 해금됨
  if (!stage.order || stage.order < 2) return false;

  const level = typeof player.level === "number" ? player.level : 1;
  const tickets = player.inventory?.trialTickets ?? 0;

  if (stage.order <= 3) return true;
  if (level >= Math.ceil(stage.order / 2)) return true;
  if (tickets > 0) return true;
  return false;
}

export function applyPurchase(player, itemType) {
  const prices = { hints: 15, potions: 25, trialTickets: 40 };
  const price = prices[itemType];
  if (!price) return { success: false, player, message: "알 수 없는 아이템입니다." };
  if (player.gold < price) return { success: false, player, message: `Gold가 부족합니다. (필요: ${price}G)` };

  const updated = {
    ...player,
    gold: player.gold - price,
    inventory: {
      ...player.inventory,
      [itemType]: (player.inventory?.[itemType] ?? 0) + 1,
    },
    economy: {
      ...player.economy,
      totalGoldSpent: (player.economy?.totalGoldSpent ?? 0) + price,
    },
  };
  return { success: true, player: updated, message: "" };
}

export function getReplayReward(stage, isAlreadyCleared, isBestAccuracyUpdated) {
  if (!isAlreadyCleared) {
    return { exp: stage.rewards.exp, gold: stage.rewards.gold, isFirstClear: true };
  }
  const bonusExp = isBestAccuracyUpdated ? 10 : 0;
  return { exp: Math.floor(stage.rewards.exp * 0.25) + bonusExp, gold: 0, isFirstClear: false };
}

export function updateStageProgress(player, result) {
  const { stageId, isCleared, accuracy, correctCount } = result;
  const prev = player.stageProgress?.[stageId] ?? {
    attempts: 0, bestAccuracy: 0, bestCorrectCount: 0,
    clearedAt: null, lastPlayedAt: null, perfectCleared: false,
  };

  const now = new Date().toISOString();
  const isBestAccuracy = accuracy > prev.bestAccuracy;

  return {
    ...player,
    stageProgress: {
      ...(player.stageProgress ?? {}),
      [stageId]: {
        attempts: prev.attempts + 1,
        bestAccuracy: Math.max(prev.bestAccuracy, accuracy),
        bestCorrectCount: Math.max(prev.bestCorrectCount, correctCount),
        clearedAt: isCleared && !prev.clearedAt ? now : prev.clearedAt,
        lastPlayedAt: now,
        perfectCleared: prev.perfectCleared || accuracy === 100,
      },
    },
    _isBestAccuracy: isBestAccuracy,
  };
}

export function mergeUnique(arrayA, arrayB) {
  const set = new Set([...(arrayA || []), ...(arrayB || [])]);
  return Array.from(set);
}

export function getTodayQuestStage(stages, player) {
  if (!stages || stages.length === 0) return null;
  const unlocked = stages.filter((s) => isStageUnlocked(s, player));
  if (unlocked.length === 0) return null;
  const firstUncleared = unlocked.find((s) => !player.clearedStageIds.includes(s.id));
  if (firstUncleared) return firstUncleared;
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
