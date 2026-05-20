import { useState } from "react";
import ProgressBar from "./ProgressBar";
import ThemeToggle from "./ThemeToggle";
import { getRequiredExp, getTodayQuestStage, getJlptProgress, JLPT_LEVELS } from "../utils/gameLogic";

const SHOP_ITEMS = [
  { key: "hints", label: "힌트 티켓", emoji: "💡", price: 15, desc: "오답 선택지 1개를 숨겨줍니다" },
  { key: "potions", label: "회복 포션", emoji: "💊", price: 25, desc: "전투 중 HP를 30 회복합니다" },
  { key: "trialTickets", label: "도약의 증표", emoji: "🔑", price: 40, desc: "잠긴 스테이지 도약 시험에 사용" },
];

export default function HomeScreen({ player, stages, onStartQuest, onGoStageSelect, onStartReview, onReset, onPurchase, setErrorMessage, theme, onThemeToggle }) {
  const [showShop, setShowShop] = useState(false);

  const requiredExp = getRequiredExp(player.level);
  const todayStage = getTodayQuestStage(stages, player);
  const jlptProgress = getJlptProgress(stages, player);
  const noStages = !stages || stages.length === 0;
  const totalStages = stages?.length ?? 0;
  const clearedCount = player.clearedStageIds?.length ?? 0;
  const totalAnswered = player.stats?.totalAnswered ?? 0;
  const totalCorrect = player.stats?.totalCorrect ?? 0;
  const accuracy = totalAnswered > 0 ? Math.round((totalCorrect / totalAnswered) * 100) : 0;
  const inventory = player.inventory ?? { hints: 0, potions: 0, trialTickets: 0 };
  const DAILY_GOAL = 20;
  const todayAnsweredCount = player.stats?.todayAnswered ?? 0;
  const dailyGoalClaimed = player.stats?.dailyGoalClaimed ?? false;
  const dailyGoalProgress = Math.min(1, todayAnsweredCount / DAILY_GOAL);
  const dailyGoalDone = todayAnsweredCount >= DAILY_GOAL;

  function handleTodayQuest() {
    if (!todayStage) { setErrorMessage("추천 스테이지를 찾을 수 없습니다."); return; }
    onStartQuest(todayStage.id);
  }

  function handleBuy(itemKey) {
    onPurchase(itemKey);
  }

  return (
    <div className="screen">
      <header className="home-header">
        <div className="home-header-top">
          <ThemeToggle theme={theme} onToggle={onThemeToggle} />
        </div>
        <h1 className="app-title">🎌 니혼고 퀘스트</h1>
        <p className="app-subtitle">일본어를 배우며 몬스터를 물리쳐라!</p>
      </header>

      {noStages && <div className="error-card">스테이지 데이터를 불러올 수 없습니다.</div>}

      {/* 플레이어 카드 */}
      <div className="card player-card">
        <div className="player-card-top">
          <div className="player-level-badge">Lv.{player.level}</div>
          <div className="player-info">
            <div className="player-title-text">{player.title}</div>
            <div className="player-exp-text">EXP {player.exp} / {requiredExp}</div>
          </div>
          <div className="player-gold">💰 {player.gold}G</div>
        </div>
        <ProgressBar current={player.exp} max={requiredExp} colorClass="exp-bar" />
        <div className="player-hp-row">
          <span className="hp-chip">❤️ HP {player.maxHp}</span>
          <span className="stat-chip">📊 정답률 {accuracy}%</span>
          <span className="stat-chip">🏆 {clearedCount}/{totalStages} 클리어</span>
        </div>
      </div>

      {/* 아이템 현황 */}
      <div className="card inventory-card">
        <div className="card-title">🎒 보유 아이템</div>
        <div className="inventory-row">
          <span className="inv-item">💡 힌트 {inventory.hints}개</span>
          <span className="inv-item">💊 포션 {inventory.potions}개</span>
          <span className="inv-item">🔑 도약증표 {inventory.trialTickets}개</span>
        </div>
      </div>

      {/* JLPT 진행도 */}
      <div className="card jlpt-home-card">
        <div className="card-title">📊 JLPT 진행도</div>
        <div className="jlpt-home-grid">
          {JLPT_LEVELS.map((level) => {
            const p = jlptProgress[level] ?? { total: 0, cleared: 0 };
            const allDone = p.total > 0 && p.cleared === p.total;
            return (
              <div key={level} className={`jlpt-home-item${allDone ? " jlpt-home-item-done" : ""}`}>
                <span className={`jlpt-level-badge jlpt-badge-sm jlpt-${level}`}>{level}</span>
                <div className="jlpt-home-nums">
                  <span className="jlpt-home-cleared">{p.cleared}</span>
                  <span className="jlpt-home-total">/{p.total}</span>
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {/* 오늘 학습 */}
      <div className="card today-card">
        <div className="card-title">📅 오늘의 학습</div>
        <div className="today-stats">
          <div className="today-stat">
            <span className="stat-value">{todayAnsweredCount}</span>
            <span className="stat-label">문제</span>
          </div>
          <div className="today-stat">
            <span className="stat-value">{player.stats?.todayClearedStages ?? 0}</span>
            <span className="stat-label">클리어</span>
          </div>
          <div className="today-stat">
            <span className="stat-value">{player.stats?.streakDays ?? 0}</span>
            <span className="stat-label">연속일</span>
          </div>
        </div>
        <div className="daily-goal-section">
          <div className="daily-goal-header">
            <span className="daily-goal-label">일일 목표 {todayAnsweredCount}/{DAILY_GOAL}문제</span>
            {dailyGoalDone && (
              <span className="daily-goal-badge">{dailyGoalClaimed ? "✅ 보상 수령 완료" : "🎉 목표 달성!"}</span>
            )}
          </div>
          <div className="daily-goal-track">
            <div
              className={`daily-goal-fill${dailyGoalDone ? " daily-goal-fill-done" : ""}`}
              style={{ width: `${dailyGoalProgress * 100}%` }}
            />
          </div>
          {!dailyGoalDone && (
            <div className="daily-goal-hint">목표 달성 시 💰 +5G 보상!</div>
          )}
        </div>
      </div>

      {/* 상점 */}
      {showShop && (
        <div className="card shop-card">
          <div className="shop-header">
            <div className="card-title">🏪 상점</div>
            <span className="gold-display">보유 골드: 💰 {player.gold}G</span>
          </div>
          <div className="shop-items">
            {SHOP_ITEMS.map((item) => (
              <div key={item.key} className="shop-item">
                <div className="shop-item-info">
                  <span className="shop-item-emoji">{item.emoji}</span>
                  <div>
                    <div className="shop-item-name">{item.label}</div>
                    <div className="shop-item-desc">{item.desc}</div>
                  </div>
                </div>
                <button
                  className="btn btn-primary btn-small"
                  onClick={() => handleBuy(item.key)}
                  disabled={player.gold < item.price}
                >
                  {item.price}G
                </button>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* 버튼 */}
      <div className="btn-list">
        <button
          className="btn btn-primary btn-large"
          onClick={handleTodayQuest}
          disabled={noStages || !todayStage}
        >
          ⚔️ 오늘의 퀘스트 시작
          {todayStage && <span className="btn-sub">{todayStage.title}</span>}
        </button>

        <button className="btn btn-secondary btn-large" onClick={onGoStageSelect} disabled={noStages}>
          🗺️ 스테이지 선택
        </button>

        {(player.wrongQuestionIds?.length ?? 0) > 0 && (
          <button className="btn btn-review btn-large" onClick={onStartReview}>
            📚 오답 복습
            <span className="btn-sub">오답 {player.wrongQuestionIds.length}개 · 데미지 없음</span>
          </button>
        )}

        <button
          className={`btn btn-large ${showShop ? "btn-outline" : "btn-ghost"}`}
          onClick={() => setShowShop((v) => !v)}
        >
          🏪 {showShop ? "상점 닫기" : "상점 열기"}
        </button>

        <button className="btn btn-danger btn-small" onClick={onReset}>
          🗑️ 데이터 초기화
        </button>
      </div>

      <footer className="home-footer">
        총 {totalAnswered}문제 · 정답 {totalCorrect}개 · 정답률 {accuracy}%
      </footer>
    </div>
  );
}
