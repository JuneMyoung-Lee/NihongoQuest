export function createBattleSnapshot({ battleState, currentStage, player }) {
  const isTrial = battleState?.mode === "trial";
  const monsterDisplay = isTrial
    ? {
        name: "문지기 스핑크스",
        emoji: "🦁",
        assetKey: "monster_sphinx_trial",
        hp: battleState?.monsterMaxHp ?? 100,
        theme: "tower",
      }
    : currentStage?.monster;

  return {
    battleSessionId: battleState?.battleSessionId || "unknown",
    mode: battleState?.mode || "stage",
    stageId: battleState?.stageId || null,
    player: {
      name: "플레이어",
      emoji: player?.avatar || "🧙",
      avatarKey: player?.avatarKey || null,
      hp: battleState?.playerHp ?? player?.maxHp ?? 100,
      maxHp: battleState?.playerMaxHp ?? player?.maxHp ?? battleState?.battleRules?.playerMaxHp ?? 100,
    },
    monster: {
      name: monsterDisplay?.name || "몬스터",
      emoji: monsterDisplay?.emoji || "👾",
      assetKey: monsterDisplay?.assetKey || null,
      hp: battleState?.monsterHp ?? monsterDisplay?.hp ?? 100,
      maxHp: battleState?.monsterMaxHp ?? monsterDisplay?.hp ?? 100,
      theme: monsterDisplay?.theme || "default",
    },
    rules: {
      requiredCorrect: battleState?.battleRules?.requiredCorrect || 0,
      correctCount: battleState?.correctCount || 0,
      wrongCount: battleState?.wrongCount || 0,
      passAccuracy: battleState?.battleRules?.passAccuracy || 70,
    },
  };
}
