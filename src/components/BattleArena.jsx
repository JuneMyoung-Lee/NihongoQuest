import BattleActor from "./BattleActor";

export default function BattleArena({
  playerHp, playerMaxHp,
  monsterHp, monsterMaxHp,
  monsterDisplay,
  isTrial,
  playerAnimState,
  monsterAnimState,
  battleEvent,
  onPlayerAnimComplete,
  onMonsterAnimComplete,
  themeClass,
}) {
  return (
    <div className={`card battle-arena monster-card ${themeClass}`}>
      {/* 몬스터 — 오른쪽 위 */}
      <div className="arena-monster-row">
        <div className="arena-spacer" />
        <BattleActor
          emoji={monsterDisplay.emoji}
          name={isTrial ? "문지기 스핑크스" : monsterDisplay.name}
          hp={monsterHp}
          maxHp={monsterMaxHp}
          isPlayer={false}
          animState={monsterAnimState}
          onAnimComplete={onMonsterAnimComplete}
          battleEvent={battleEvent}
        />
      </div>

      {/* 플레이어 — 왼쪽 아래 */}
      <div className="arena-player-row">
        <BattleActor
          emoji="🧙"
          name="플레이어"
          hp={playerHp}
          maxHp={playerMaxHp}
          isPlayer={true}
          animState={playerAnimState}
          onAnimComplete={onPlayerAnimComplete}
          battleEvent={battleEvent}
        />
        <div className="arena-spacer" />
      </div>
    </div>
  );
}
