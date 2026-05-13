import ProgressBar from "./ProgressBar";
import { getRequiredExp, getTodayQuestStage } from "../utils/gameLogic";

export default function HomeScreen({
  player,
  stages,
  onStartQuest,
  onGoStageSelect,
  onReset,
  setErrorMessage,
}) {
  const requiredExp = getRequiredExp(player.level);
  const todayStage = getTodayQuestStage(stages, player);
  const hasWrongQuestions = player.wrongQuestionIds.length > 0;
  const noStages = !stages || stages.length === 0;

  function handleTodayQuest() {
    if (!todayStage) {
      setErrorMessage("추천 스테이지를 찾을 수 없습니다.");
      return;
    }
    onStartQuest(todayStage.id);
  }

  function handleWrongReview() {
    alert("오답 복습 기능은 준비 중입니다! 💪");
  }

  return (
    <div className="screen">
      <header className="home-header">
        <h1 className="app-title">🎌 니혼고 퀘스트</h1>
        <p className="app-subtitle">일본어를 배우며 몬스터를 물리쳐라!</p>
      </header>

      {noStages && (
        <div className="error-card">스테이지 데이터를 불러올 수 없습니다.</div>
      )}

      {/* 플레이어 카드 */}
      <div className="card player-card">
        <div className="player-card-top">
          <div className="player-level-badge">Lv.{player.level}</div>
          <div className="player-info">
            <div className="player-title">{player.title}</div>
            <div className="player-exp-text">
              EXP {player.exp} / {requiredExp}
            </div>
          </div>
          <div className="player-gold">💰 {player.gold}G</div>
        </div>
        <ProgressBar current={player.exp} max={requiredExp} colorClass="exp-bar" />
      </div>

      {/* 오늘 학습 카드 */}
      <div className="card today-card">
        <h3 className="card-title">📅 오늘의 학습</h3>
        <div className="today-stats">
          <div className="today-stat">
            <span className="stat-value">{player.stats.todayAnswered}</span>
            <span className="stat-label">문제</span>
          </div>
          <div className="today-stat">
            <span className="stat-value">{player.stats.todayClearedStages}</span>
            <span className="stat-label">스테이지 클리어</span>
          </div>
          <div className="today-stat">
            <span className="stat-value">{player.stats.streakDays}</span>
            <span className="stat-label">연속 학습일</span>
          </div>
        </div>
      </div>

      {/* 버튼 목록 */}
      <div className="btn-list">
        <button
          className="btn btn-primary btn-large"
          onClick={handleTodayQuest}
          disabled={noStages || !todayStage}
        >
          ⚔️ 오늘의 퀘스트 시작
          {todayStage && (
            <span className="btn-sub">{todayStage.title}</span>
          )}
        </button>

        <button
          className="btn btn-secondary btn-large"
          onClick={onGoStageSelect}
          disabled={noStages}
        >
          🗺️ 스테이지 선택
        </button>

        <button
          className="btn btn-outline btn-large"
          onClick={handleWrongReview}
          disabled={!hasWrongQuestions}
          title={!hasWrongQuestions ? "오답 문제가 없습니다" : ""}
        >
          📝 오답 복습
          {!hasWrongQuestions && (
            <span className="btn-sub">오답 없음</span>
          )}
          {hasWrongQuestions && (
            <span className="btn-sub">{player.wrongQuestionIds.length}개</span>
          )}
        </button>

        <button className="btn btn-danger btn-small" onClick={onReset}>
          🗑️ 데이터 초기화
        </button>
      </div>

      <footer className="home-footer">
        <span>총 {player.stats.totalAnswered}문제 풀이 · 정답 {player.stats.totalCorrect}개</span>
      </footer>
    </div>
  );
}
