import { isStageUnlocked, canAttemptTrial } from "../utils/gameLogic";

export default function StageSelectScreen({ player, stages, onStartStage, onStartTrial, onGoHome }) {
  return (
    <div className="screen">
      <header className="screen-header">
        <button className="btn btn-ghost btn-small" onClick={onGoHome}>← 홈</button>
        <h2 className="screen-title">스테이지 선택</h2>
      </header>

      <div className="stage-list">
        {stages.map((stage) => {
          const unlocked = isStageUnlocked(stage, player);
          const cleared = player.clearedStageIds?.includes(stage.id);
          const trialUnlocked = !cleared && player.unlockedStageIds?.includes(stage.id);
          const canTrial = canAttemptTrial(stage, player);
          const progress = player.stageProgress?.[stage.id];

          let statusLabel = "잠김 🔒";
          let statusClass = "status-locked";
          if (cleared) { statusLabel = "클리어 ✅"; statusClass = "status-cleared"; }
          else if (trialUnlocked) { statusLabel = "도약 해금 🔓"; statusClass = "status-trial"; }
          else if (unlocked) { statusLabel = "도전 가능 ⚔️"; statusClass = "status-available"; }

          return (
            <div key={stage.id} className={`card stage-card monster-card theme-${stage.monster.theme} ${!unlocked ? "stage-card-locked" : ""}`}>
              <div className="stage-card-header">
                <div className="stage-order-wrap">
                  <span className="stage-order">Stage {stage.order}</span>
                  <span className={`difficulty-badge diff-${stage.difficulty?.replace("+", "plus").replace("-", "minus")}`}>
                    {stage.difficulty}
                  </span>
                </div>
                <span className={`stage-status ${statusClass}`}>{statusLabel}</span>
              </div>

              <div className="stage-monster-row">
                <span className="stage-monster-emoji">{stage.monster.emoji}</span>
                <div>
                  <div className="stage-title">{stage.title}</div>
                  <div className="stage-area">{stage.area}</div>
                </div>
              </div>

              <p className="stage-desc">{stage.description}</p>

              <div className="stage-meta">
                <span>👾 {stage.monster.name} (HP {stage.monster.hp})</span>
                <span>🎁 EXP +{stage.rewards.exp} / 💰 +{stage.rewards.gold}G</span>
                {stage.recommendedLevel && (
                  <span>⭐ 권장 Lv.{stage.recommendedLevel}</span>
                )}
              </div>

              {/* 스테이지 기록 */}
              {progress && (
                <div className="stage-record">
                  <span>🎯 최고 {progress.bestAccuracy}%</span>
                  <span>🔁 {progress.attempts}회 도전</span>
                  {progress.perfectCleared && <span className="perfect-badge">PERFECT</span>}
                </div>
              )}

              <div className="stage-btn-group">
                {unlocked && (
                  <button
                    className={`btn ${cleared ? "btn-secondary" : "btn-primary"} btn-full`}
                    onClick={() => onStartStage(stage.id)}
                  >
                    {cleared ? "🔄 다시 도전" : "⚔️ 도전하기"}
                  </button>
                )}

                {!unlocked && canTrial && (
                  <button
                    className="btn btn-outline btn-full"
                    onClick={() => onStartTrial(stage.id)}
                  >
                    🧪 도약 시험
                    <span className="btn-sub">통과 조건: 정답률 80%↑</span>
                  </button>
                )}

                {!unlocked && !canTrial && (
                  <button className="btn btn-locked btn-full" disabled>
                    🔒 잠김
                    {stage.order > 3 && (
                      <span className="btn-sub">Lv.{Math.ceil(stage.order / 2)} 또는 도약의 증표 필요</span>
                    )}
                  </button>
                )}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
