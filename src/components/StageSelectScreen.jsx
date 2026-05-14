import { useState } from "react";
import ProgressBar from "./ProgressBar";
import {
  isStageUnlocked, canAttemptTrial,
  groupStagesByJlpt, getJlptProgress, getDefaultJlptLevel,
  JLPT_LEVELS, JLPT_INFO,
} from "../utils/gameLogic";

// label 기준 중복 제거 (대소문자·공백 정규화)
function dedupeBadgesByLabel(badges) {
  const seen = new Set();
  return badges.filter((b) => {
    const key = (b.label ?? "").trim().toLowerCase();
    if (!key || seen.has(key)) return false;
    seen.add(key);
    return true;
  });
}

// 스테이지 카드에 표시할 뱃지 목록 반환
function getStageBadges(stage) {
  const badges = [];
  if (stage.jlptLevel) {
    badges.push({ type: "level", label: stage.jlptLevel });
  }
  // difficulty가 jlptLevel과 다를 때만 추가 (같으면 중복이므로 생략)
  if (stage.difficulty && stage.difficulty !== stage.jlptLevel) {
    badges.push({ type: "difficulty", label: stage.difficulty });
  }
  if (stage.topic) {
    badges.push({ type: "topic", label: stage.topic });
  }
  return dedupeBadgesByLabel(badges);
}

// 뱃지 타입별 CSS 클래스
function getBadgeClassName(badge) {
  if (badge.type === "level") {
    return `jlpt-level-badge jlpt-badge-sm jlpt-${badge.label}`;
  }
  if (badge.type === "difficulty") {
    const slug = (badge.label ?? "").replace("+", "plus").replace("-", "minus");
    return `difficulty-badge diff-${slug}`;
  }
  return "topic-badge";
}

export default function StageSelectScreen({ player, stages, onStartStage, onStartTrial, onGoHome }) {
  const groupedStages = groupStagesByJlpt(stages);
  const jlptProgress = getJlptProgress(stages, player);
  const [selectedLevel, setSelectedLevel] = useState(() => getDefaultJlptLevel(stages, player));

  const currentStages = groupedStages[selectedLevel] ?? [];
  const info = JLPT_INFO[selectedLevel] ?? { area: selectedLevel, desc: "" };
  const prog = jlptProgress[selectedLevel] ?? { total: 0, cleared: 0 };

  return (
    <div className="screen">
      <header className="screen-header">
        <button className="btn btn-ghost btn-small" onClick={onGoHome}>← 홈</button>
        <h2 className="screen-title">스테이지 선택</h2>
      </header>
      <p className="stage-select-subtitle">JLPT 레벨별로 도전하세요</p>

      {/* JLPT 탭 바 */}
      <div className="jlpt-tab-bar">
        {JLPT_LEVELS.map((level) => {
          const p = jlptProgress[level] ?? { total: 0, cleared: 0 };
          const allCleared = p.total > 0 && p.cleared === p.total;
          const isActive = selectedLevel === level;
          return (
            <button
              key={level}
              className={`jlpt-tab${isActive ? " jlpt-tab-active" : ""}${allCleared ? " jlpt-tab-done" : ""}`}
              onClick={() => setSelectedLevel(level)}
              aria-pressed={isActive}
            >
              <span className="jlpt-tab-label">{level}</span>
              <span className="jlpt-tab-progress">{p.cleared}/{p.total}</span>
            </button>
          );
        })}
      </div>

      {/* 그룹 헤더 */}
      <div className="jlpt-group-header">
        <div className="jlpt-group-top">
          <span className={`jlpt-level-badge jlpt-${selectedLevel}`}>{selectedLevel}</span>
          <div className="jlpt-group-text">
            <div className="jlpt-group-area">{info.area}</div>
            <div className="jlpt-group-desc">{info.desc}</div>
          </div>
          <div className="jlpt-group-count">
            {prog.cleared}/{prog.total} 클리어
          </div>
        </div>
        {prog.total > 0 && (
          <ProgressBar current={prog.cleared} max={prog.total} colorClass="jlpt-progress-bar" />
        )}
      </div>

      {currentStages.length === 0 && (
        <p className="jlpt-empty">이 레벨에 스테이지가 없습니다.</p>
      )}

      {/* 스테이지 카드 목록 */}
      <div className="stage-list">
        {currentStages.map((stage) => {
          const isUnlocked = isStageUnlocked(stage, player);
          const isCleared = player.clearedStageIds?.includes(stage.id);
          const isTrialUnlocked = !isCleared && player.unlockedStageIds?.includes(stage.id);
          const canTrial = canAttemptTrial(stage, player);
          const stageProgress = player.stageProgress?.[stage.id];
          const accessible = isUnlocked || isCleared;

          let statusLabel = "잠김 🔒";
          let statusClass = "status-locked";
          if (isCleared) { statusLabel = "클리어 ✅"; statusClass = "status-cleared"; }
          else if (isTrialUnlocked) { statusLabel = "도약 해금 🔓"; statusClass = "status-trial"; }
          else if (isUnlocked) { statusLabel = "도전 가능 ⚔️"; statusClass = "status-available"; }

          const badges = getStageBadges(stage);

          return (
            <div
              key={stage.id}
              className={`card stage-card monster-card theme-${stage.monster.theme}${!accessible ? " stage-card-locked" : ""}`}
            >
              <div className="stage-card-header">
                <div className="stage-order-wrap">
                  {badges.map((badge) => (
                    <span key={badge.label} className={getBadgeClassName(badge)}>
                      {badge.label}
                    </span>
                  ))}
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
                {stage.recommendedLevel && <span>⭐ 권장 Lv.{stage.recommendedLevel}</span>}
              </div>

              {stageProgress && (
                <div className="stage-record">
                  <span>🎯 최고 {stageProgress.bestAccuracy}%</span>
                  <span>🔁 {stageProgress.attempts}회 도전</span>
                  {stageProgress.perfectCleared && <span className="perfect-badge">PERFECT</span>}
                </div>
              )}

              <div className="stage-btn-group">
                {accessible && (
                  <button
                    className={`btn ${isCleared ? "btn-secondary" : "btn-primary"} btn-full`}
                    onClick={() => onStartStage(stage.id)}
                  >
                    {isCleared ? "🔄 다시 도전" : "⚔️ 도전하기"}
                  </button>
                )}

                {!accessible && canTrial && (
                  <button
                    className="btn btn-outline btn-full"
                    onClick={() => onStartTrial(stage.id)}
                  >
                    🧪 도약 시험
                    <span className="btn-sub">통과 조건: 정답률 80%↑</span>
                  </button>
                )}

                {!accessible && !canTrial && (
                  <button className="btn btn-locked btn-full" disabled>
                    🔒 잠김
                    <span className="btn-sub">이전 스테이지를 클리어해야 합니다</span>
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
