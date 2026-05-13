import { isStageUnlocked } from "../utils/gameLogic";

export default function StageSelectScreen({ player, stages, onStartStage, onGoHome }) {
  return (
    <div className="screen">
      <header className="screen-header">
        <button className="btn btn-ghost" onClick={onGoHome}>← 홈으로</button>
        <h2 className="screen-title">스테이지 선택</h2>
      </header>

      <div className="stage-list">
        {stages.map((stage) => {
          const unlocked = isStageUnlocked(stage, player);
          const cleared = player.clearedStageIds.includes(stage.id);

          let statusLabel = "잠김 🔒";
          let statusClass = "status-locked";
          if (unlocked && cleared) {
            statusLabel = "클리어 ✅";
            statusClass = "status-cleared";
          } else if (unlocked) {
            statusLabel = "도전 가능 ⚔️";
            statusClass = "status-available";
          }

          return (
            <div
              key={stage.id}
              className={`card stage-card ${!unlocked ? "stage-card-locked" : ""}`}
            >
              <div className="stage-card-header">
                <span className="stage-order">Stage {stage.order}</span>
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
              </div>

              <button
                className={`btn ${cleared ? "btn-secondary" : unlocked ? "btn-primary" : "btn-locked"} btn-full`}
                disabled={!unlocked}
                onClick={() => unlocked && onStartStage(stage.id)}
              >
                {cleared ? "다시 도전" : unlocked ? "도전하기" : "잠김"}
              </button>
            </div>
          );
        })}
      </div>
    </div>
  );
}
