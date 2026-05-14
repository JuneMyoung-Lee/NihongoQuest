/**
 * 전투 규칙 계산 유틸.
 * battleState 초기화 시 한 번 생성하여 battleState.battleRules에 저장.
 */
export function createBattleRules({ stage, questions, player, mode }) {
  const totalQuestions = Math.max(1, questions?.length ?? 1);
  const passAccuracy = mode === "trial" ? 80 : (stage?.passAccuracy ?? 70);
  const requiredCorrect = Math.max(1, Math.ceil(totalQuestions * passAccuracy / 100));
  const allowedWrong = Math.max(0, totalQuestions - requiredCorrect);
  const mistakesToFail = allowedWrong + 1;

  const playerMaxHp =
    typeof player?.maxHp === "number" && player.maxHp > 0 ? player.maxHp : 100;

  const monsterMaxHp =
    stage?.monster?.hp && stage.monster.hp > 0
      ? stage.monster.hp
      : requiredCorrect * 30;

  // 오답 mistakesToFail 번이면 HP가 0이 되는 데미지
  const damageToPlayer = Math.max(1, Math.ceil(playerMaxHp / mistakesToFail));

  // 정답 requiredCorrect 번이면 몬스터 HP가 0이 되는 데미지
  const damageToMonster = Math.max(1, Math.ceil(monsterMaxHp / requiredCorrect));

  return {
    totalQuestions,
    passAccuracy,
    requiredCorrect,
    allowedWrong,
    mistakesToFail,
    playerMaxHp,
    monsterMaxHp,
    damageToPlayer,
    damageToMonster,
  };
}
