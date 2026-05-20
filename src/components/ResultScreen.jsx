import { useEffect, useRef, useState } from "react";
import { getRequiredExp } from "../utils/gameLogic";
import { questions as allQuestions } from "../data/questions";

export default function ResultScreen({
  resultState, player, stages, nextStage,
  onResultSaved, onStartStage, onStartTrial, onStartReview, onGoStageSelect, onGoHome,
}) {
  const savedRef = useRef(false);

  useEffect(() => {
    if (!savedRef.current && !resultState.saved) {
      savedRef.current = true;
      onResultSaved(resultState);
    }
  }, []);

  const stage = stages.find((s) => s.id === resultState.stageId);
  const isTrial = resultState.mode === "trial";
  const {
    trialPassed, isCleared, totalQuestions, answeredCount, correctCount, wrongCount,
    accuracy, remainingPlayerHp, earnedExp, earnedGold,
    leveledUp, previousLevel, newLevel, previousTitle, newTitle,
    isFirstClear, isBestAccuracy,
    requiredCorrect, passAccuracy, clearReason, failReason,
  } = resultState;

  const answered = answeredCount ?? totalQuestions;
  const showAnsweredNote = answered < totalQuestions;

  const canNextStage = !isTrial && isCleared && nextStage;

  // 오답 복습 데이터
  const wrongQuestions = (resultState.wrongQuestionIds ?? [])
    .map((id) => allQuestions.find((q) => q.id === id))
    .filter(Boolean);

  // 클리어/실패 사유 텍스트
  function getClearReasonText() {
    if (clearReason === "monsterDefeated") return "몬스터를 처치했습니다!";
    return "클리어";
  }
  function getFailReasonText() {
    if (failReason === "playerDead") return "HP가 0이 됐습니다.";
    if (failReason === "notEnoughCorrect") return `목표 정답 ${requiredCorrect}개에 도달하지 못했습니다.`;
    return "퀘스트 실패";
  }

  if (resultState.mode === "review") {
    const masteredCount = resultState.masteredIds?.length ?? 0;
    const stillWrongCount = resultState.remainingWrongCount ?? 0;

    return (
      <div className="screen">
        <div className={`result-title-banner ${masteredCount > 0 ? "result-clear" : "result-fail"}`}>
          <div className="result-title-icon">📚</div>
          <div className="result-title-text">복습 완료!</div>
          <div className="result-reason-text">
            {masteredCount > 0 ? `${masteredCount}개 문제 마스터!` : "계속 도전해봐요!"}
          </div>
        </div>

        <div className="card result-card">
          <h3 className="card-title">📊 복습 결과</h3>
          <div className="result-row">
            <span>정답</span>
            <span className="result-value">
              {resultState.correctCount} / {resultState.totalQuestions}문제
            </span>
          </div>
          <div className="result-row">
            <span>정답률</span>
            <span className={`result-value ${resultState.accuracy >= 70 ? "text-green" : "text-red"}`}>
              {resultState.accuracy}%
            </span>
          </div>
          <div className="result-row">
            <span>마스터 완료</span>
            <span className="result-value text-green">
              {masteredCount > 0 ? `✅ ${masteredCount}개 오답 목록에서 제거` : "0개"}
            </span>
          </div>
          <div className="result-row">
            <span>남은 오답</span>
            <span className="result-value">
              {stillWrongCount > 0 ? `📌 ${stillWrongCount}개 남음` : "🎉 모두 마스터!"}
            </span>
          </div>
        </div>

        <WrongReviewCard wrongQuestions={wrongQuestions} />

        <div className="btn-list">
          {stillWrongCount > 0 && (
            <button className="btn btn-review btn-large" onClick={onStartReview}>
              📚 다시 복습하기
              <span className="btn-sub">남은 오답 {stillWrongCount}개</span>
            </button>
          )}
          <button className="btn btn-secondary btn-large" onClick={onGoStageSelect}>🗺️ 스테이지 선택</button>
          <button className="btn btn-ghost btn-large" onClick={onGoHome}>🏠 홈으로</button>
        </div>
      </div>
    );
  }

  if (isTrial) {
    return (
      <div className="screen">
        <div className={`result-title-banner ${trialPassed ? "result-clear" : "result-fail"}`}>
          <div className="result-title-icon">{trialPassed ? "🔓" : "🚫"}</div>
          <div className="result-title-text">
            {trialPassed ? "도약 시험 통과!" : "도약 시험 실패"}
          </div>
          {stage && <div className="result-stage-name">{stage.title}</div>}
          <div className="result-reason-text">
            {trialPassed ? getClearReasonText() : getFailReasonText()}
          </div>
        </div>

        <div className="card result-card">
          <h3 className="card-title">📊 시험 결과</h3>
          {showAnsweredNote && (
            <div className="result-row">
              <span>풀이</span>
              <span className="result-value">{answered} / {totalQuestions}문제</span>
            </div>
          )}
          <div className="result-row">
            <span>정답</span>
            <span className="result-value">{correctCount}개 (목표 {requiredCorrect}개)</span>
          </div>
          <div className="result-row">
            <span>정답률</span>
            <span className={`result-value ${accuracy >= (passAccuracy ?? 80) ? "text-green" : "text-red"}`}>
              {accuracy}%
            </span>
          </div>
          <div className="result-row">
            <span>통과 조건</span>
            <span className="result-value text-muted">정답률 {passAccuracy ?? 80}% 이상</span>
          </div>
          <div className="result-row">
            <span>결과</span>
            <span className={`result-value ${trialPassed ? "text-green" : "text-red"}`}>
              {trialPassed ? "✅ 해금됨" : "❌ 해금 실패"}
            </span>
          </div>
        </div>

        {trialPassed && (
          <div className="card result-card trial-pass-card">
            <div className="trial-pass-msg">이제 해당 스테이지에 도전할 수 있습니다!</div>
          </div>
        )}

        <div className="result-notice">보상 없음 (도약 시험)</div>

        <WrongReviewCard wrongQuestions={wrongQuestions} />

        <div className="btn-list">
          {trialPassed && (
            <button className="btn btn-primary btn-large" onClick={() => onStartStage(resultState.stageId)}>
              ⚔️ 해금된 스테이지 도전하기
            </button>
          )}
          {!trialPassed && (
            <button className="btn btn-outline btn-large" onClick={() => onStartTrial(resultState.stageId)}>
              🧪 다시 도전
            </button>
          )}
          <button className="btn btn-secondary btn-large" onClick={onGoStageSelect}>🗺️ 스테이지 선택</button>
          <button className="btn btn-ghost btn-large" onClick={onGoHome}>🏠 홈으로</button>
        </div>
      </div>
    );
  }

  // 일반 스테이지 결과
  return (
    <div className="screen">
      <div className={`result-title-banner ${isCleared ? "result-clear" : "result-fail"}`}>
        <div className="result-title-icon">{isCleared ? "🏆" : "💀"}</div>
        <div className="result-title-text">{isCleared ? "Stage Clear!" : "Quest Failed"}</div>
        {stage && <div className="result-stage-name">{stage.title}</div>}
        <div className="result-reason-text">
          {isCleared ? getClearReasonText() : getFailReasonText()}
        </div>
        {isCleared && isFirstClear && <div className="first-clear-badge">🌟 첫 클리어!</div>}
        {isCleared && !isFirstClear && isBestAccuracy && <div className="first-clear-badge">📈 최고 기록 갱신!</div>}
        {isCleared && accuracy === 100 && <div className="perfect-result-badge">✨ PERFECT!</div>}
      </div>

      <div className="card result-card">
        <h3 className="card-title">📊 전투 결과</h3>
        {showAnsweredNote && (
          <div className="result-row">
            <span>풀이</span>
            <span className="result-value">{answered} / {totalQuestions}문제</span>
          </div>
        )}
        <div className="result-row">
          <span>정답</span>
          <span className="result-value">
            {correctCount}개
            {requiredCorrect != null && (
              <span className={`result-sub ${correctCount >= requiredCorrect ? "text-green" : "text-muted"}`}>
                {" "}(목표 {requiredCorrect}개)
              </span>
            )}
          </span>
        </div>
        <div className="result-row">
          <span>정답률</span>
          <span className={`result-value ${accuracy >= 60 ? "text-green" : "text-red"}`}>{accuracy}%</span>
        </div>
        <div className="result-row">
          <span>남은 HP</span>
          <span className="result-value">{remainingPlayerHp}</span>
        </div>
      </div>

      <div className="card result-card">
        <h3 className="card-title">🎁 획득 보상</h3>
        <div className="result-row">
          <span>경험치</span>
          <span className="result-value text-blue">+{earnedExp} EXP</span>
        </div>
        <div className="result-row">
          <span>골드</span>
          <span className="result-value text-yellow">
            {isCleared && earnedGold > 0 ? `+${earnedGold}G` : "0G"}
          </span>
        </div>
        {isCleared && earnedGold === 0 && (
          <div className="result-note">이미 클리어한 스테이지라 Gold 보상은 없습니다.</div>
        )}
      </div>

      {resultState.dailyGoalAchieved && (
        <div className="card daily-goal-achieved-card">
          <div className="daily-goal-achieved-title">🎯 일일 목표 달성!</div>
          <div className="daily-goal-achieved-desc">오늘 20문제를 풀었습니다. 💰 +5G 보상!</div>
        </div>
      )}

      {leveledUp && (
        <div className="card level-up-card">
          <div className="level-up-title">🎉 레벨업!</div>
          <div className="level-up-detail">Lv.{previousLevel} → Lv.{newLevel}</div>
          {previousTitle !== newTitle && (
            <div className="level-up-title-change">칭호: {previousTitle} → {newTitle}</div>
          )}
        </div>
      )}

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
          <span className="result-value">{player.exp} / {getRequiredExp(player.level)}</span>
        </div>
        <div className="result-row">
          <span>Gold</span>
          <span className="result-value">💰 {player.gold}G</span>
        </div>
      </div>

      <WrongReviewCard wrongQuestions={wrongQuestions} />

      <div className="btn-list">
        {canNextStage && (
          <button className="btn btn-primary btn-large" onClick={() => onStartStage(nextStage.id)}>
            ▶️ 다음: {nextStage.title}
          </button>
        )}
        <button className="btn btn-secondary btn-large" onClick={() => onStartStage(resultState.stageId)}>
          🔄 다시 도전
        </button>
        <button className="btn btn-outline btn-large" onClick={onGoStageSelect}>🗺️ 스테이지 선택</button>
        <button className="btn btn-ghost btn-large" onClick={onGoHome}>🏠 홈으로</button>
      </div>
    </div>
  );
}

function WrongReviewCard({ wrongQuestions }) {
  const [open, setOpen] = useState(false);
  if (!wrongQuestions || wrongQuestions.length === 0) return null;

  return (
    <div className="card result-card">
      <button className="wrong-review-toggle" onClick={() => setOpen((v) => !v)}>
        <span>❌ 오답 복습 ({wrongQuestions.length}개)</span>
        <span className="wrong-review-chevron">{open ? "▲" : "▼"}</span>
      </button>
      {open && (
        <div className="wrong-review-list">
          {wrongQuestions.map((q) => {
            const correctChoice = q.choices.find((c) => c.id === q.correctChoiceId);
            return (
              <div key={q.id} className="wrong-review-item">
                <div className="wrong-review-prompt">{q.prompt}</div>
                <div className="wrong-review-answer">✅ 정답: {correctChoice?.text ?? "—"}</div>
                {q.explanation && (
                  <div className="wrong-review-explanation">{q.explanation}</div>
                )}
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
