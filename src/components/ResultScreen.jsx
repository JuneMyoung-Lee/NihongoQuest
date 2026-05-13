import { useEffect, useRef } from "react";
import { getRequiredExp } from "../utils/gameLogic";

export default function ResultScreen({
  resultState,
  player,
  stages,
  nextStage,
  onResultSaved,
  onStartStage,
  onGoStageSelect,
  onGoHome,
}) {
  const savedRef = useRef(false);

  useEffect(() => {
    if (!savedRef.current && !resultState.saved) {
      savedRef.current = true;
      onResultSaved(resultState);
    }
  }, []);

  const stage = stages.find((s) => s.id === resultState.stageId);
  const {
    isCleared,
    totalQuestions,
    correctCount,
    accuracy,
    remainingPlayerHp,
    earnedExp,
    earnedGold,
    leveledUp,
    previousLevel,
    newLevel,
    previousTitle,
    newTitle,
  } = resultState;

  const canNextStage = isCleared && nextStage;

  return (
    <div className="screen">
      {/* 결과 타이틀 */}
      <div className={`result-title-banner ${isCleared ? "result-clear" : "result-fail"}`}>
        <div className="result-title-icon">{isCleared ? "🏆" : "💀"}</div>
        <div className="result-title-text">
          {isCleared ? "Stage Clear!" : "Quest Failed"}
        </div>
        {stage && <div className="result-stage-name">{stage.title}</div>}
      </div>

      {/* 전투 결과 */}
      <div className="card result-card">
        <h3 className="card-title">📊 전투 결과</h3>
        <div className="result-row">
          <span>정답</span>
          <span className="result-value">{correctCount} / {totalQuestions}</span>
        </div>
        <div className="result-row">
          <span>정답률</span>
          <span className={`result-value ${accuracy >= 60 ? "text-green" : "text-red"}`}>
            {accuracy}%
          </span>
        </div>
        <div className="result-row">
          <span>남은 HP</span>
          <span className="result-value">{remainingPlayerHp} / 100</span>
        </div>
      </div>

      {/* 보상 */}
      <div className="card result-card">
        <h3 className="card-title">🎁 획득 보상</h3>
        <div className="result-row">
          <span>경험치</span>
          <span className="result-value text-blue">+{earnedExp} EXP</span>
        </div>
        <div className="result-row">
          <span>골드</span>
          <span className="result-value text-yellow">
            {isCleared ? `+${earnedGold}G` : "0G (실패)"}
          </span>
        </div>
      </div>

      {/* 레벨업 / 칭호 변경 */}
      {leveledUp && (
        <div className="card level-up-card">
          <div className="level-up-title">🎉 레벨업!</div>
          <div className="level-up-detail">
            Lv.{previousLevel} → Lv.{newLevel}
          </div>
          {previousTitle !== newTitle && (
            <div className="level-up-title-change">
              칭호: {previousTitle} → {newTitle}
            </div>
          )}
        </div>
      )}

      {/* 현재 플레이어 상태 */}
      <div className="card result-card">
        <h3 className="card-title">👤 현재 상태</h3>
        <div className="result-row">
          <span>레벨</span>
          <span className="result-value">Lv.{newLevel}</span>
        </div>
        <div className="result-row">
          <span>칭호</span>
          <span className="result-value">{newTitle}</span>
        </div>
        <div className="result-row">
          <span>EXP</span>
          <span className="result-value">
            {player.exp} / {getRequiredExp(player.level)}
          </span>
        </div>
        <div className="result-row">
          <span>Gold</span>
          <span className="result-value">💰 {player.gold}G</span>
        </div>
      </div>

      {/* 버튼 */}
      <div className="btn-list">
        {canNextStage && (
          <button
            className="btn btn-primary btn-large"
            onClick={() => onStartStage(nextStage.id)}
          >
            ▶️ 다음 스테이지: {nextStage.title}
          </button>
        )}

        <button
          className="btn btn-secondary btn-large"
          onClick={() => onStartStage(resultState.stageId)}
        >
          🔄 다시 도전
        </button>

        <button className="btn btn-outline btn-large" onClick={onGoStageSelect}>
          🗺️ 스테이지 선택
        </button>

        <button className="btn btn-ghost btn-large" onClick={onGoHome}>
          🏠 홈으로
        </button>
      </div>
    </div>
  );
}
