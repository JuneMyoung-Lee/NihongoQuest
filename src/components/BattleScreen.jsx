import { useState, useEffect, useRef } from "react";
import ProgressBar from "./ProgressBar";
import VocabNotesPanel from "./VocabNotesPanel";
import AnnotatedText from "./AnnotatedText";
import BattleArena from "./BattleArena";
import { vocabulary } from "../data/vocabulary";
import { getVocabularyByIds } from "../utils/question";

function getFallbackRules(questions) {
  const total = questions?.length ?? 0;
  const required = Math.max(1, Math.ceil(total * 0.7));
  return {
    requiredCorrect: required,
    allowedWrong: Math.max(0, total - required),
    mistakesToFail: total - required + 1,
    damageToPlayer: 50,
    damageToMonster: 20,
  };
}

function createEventId() {
  if (typeof crypto !== "undefined" && crypto.randomUUID) return crypto.randomUUID();
  return `ev_${Date.now()}_${Math.random().toString(36).slice(2)}`;
}

export default function BattleScreen({ battleState, setBattleState, player, stages, onBattleEnd, onUseItem, onExit }) {
  const stage = stages.find((s) => s.id === battleState.stageId);
  if (!stage) return <div className="screen"><p>스테이지 정보를 불러올 수 없습니다.</p></div>;

  // ── 애니메이션 state ────────────────────────────────────────────
  const [battleEvent, setBattleEvent] = useState(null);
  const [battleLog, setBattleLog] = useState([]);
  const [playerAnimState, setPlayerAnimState] = useState("idle");
  const [monsterAnimState, setMonsterAnimState] = useState("idle");

  function addToLog(entry) {
    setBattleLog((prev) => [...prev, entry].slice(-3));
  }

  // 포션 사용 감지 (playerHp 증가 → heal 연출)
  const prevPlayerHpRef = useRef(null);
  useEffect(() => {
    if (prevPlayerHpRef.current === null) {
      prevPlayerHpRef.current = battleState.playerHp;
      return;
    }
    const delta = battleState.playerHp - prevPlayerHpRef.current;
    if (delta > 0) {
      setBattleEvent({ id: createEventId(), type: "heal", target: "player", amount: delta });
      setPlayerAnimState("heal");
    }
    prevPlayerHpRef.current = battleState.playerHp;
  }, [battleState.playerHp]);

  // 아이템 피드백 메시지 → 전투 로그
  const prevFeedbackRef = useRef("");
  useEffect(() => {
    const msg = battleState.feedbackMessage;
    if (!battleState.hasAnswered && msg && msg !== prevFeedbackRef.current) {
      prevFeedbackRef.current = msg;
      if (msg.startsWith("💊") || msg.startsWith("💡")) {
        addToLog(msg);
      }
    }
  }, [battleState.feedbackMessage, battleState.hasAnswered]);

  // ── 구조분해 ────────────────────────────────────────────────────
  const {
    mode, questions, currentQuestionIndex, playerHp, playerMaxHp,
    monsterHp, monsterMaxHp, correctCount, hasAnswered,
    selectedChoiceId, isCurrentAnswerCorrect, feedbackMessage, hiddenChoiceIds,
    wrongCount = 0, isFinished = false,
  } = battleState;

  const rules = battleState.battleRules ?? getFallbackRules(questions);
  const isTrial = mode === "trial";
  const currentQuestion = questions[currentQuestionIndex];
  const isLastQuestion = currentQuestionIndex >= questions.length - 1;
  const totalQuestions = questions.length;
  const inventory = player?.inventory ?? { hints: 0, potions: 0 };
  const monsterDisplay = isTrial
    ? { name: "문지기 스핑크스", emoji: "🦉", hp: monsterMaxHp, theme: "tower" }
    : stage.monster;
  const themeClass = `theme-${monsterDisplay.theme ?? "forest"}`;
  const vocabItems = getVocabularyByIds(currentQuestion.vocabIds, vocabulary);

  // ── 전투 로직 ───────────────────────────────────────────────────
  function handleChoiceClick(choiceId) {
    if (hasAnswered || isFinished) return;
    if (hiddenChoiceIds.includes(choiceId)) return;

    const isCorrect = choiceId === currentQuestion.correctChoiceId;
    const newCorrectCount = isCorrect ? correctCount + 1 : correctCount;
    const newWrongCount = isCorrect ? wrongCount : wrongCount + 1;
    const newMonsterHp = isCorrect ? Math.max(0, monsterHp - rules.damageToMonster) : monsterHp;
    const newPlayerHp = isCorrect ? playerHp : Math.max(0, playerHp - rules.damageToPlayer);
    const newWrongIds = isCorrect
      ? battleState.wrongQuestionIds
      : [...new Set([...battleState.wrongQuestionIds, currentQuestion.id])];

    const monsterDefeated = newMonsterHp <= 0;
    const playerDead = newPlayerHp <= 0;
    const newIsFinished = monsterDefeated || playerDead || isLastQuestion;

    let msg = "";
    if (isCorrect) {
      msg = monsterDefeated ? "✅ 정답! 몬스터를 처치했습니다!" : "✅ 정답입니다!";
    } else {
      const correctText = currentQuestion.choices.find((c) => c.id === currentQuestion.correctChoiceId)?.text ?? "";
      msg = playerDead
        ? `❌ 오답! HP가 0이 됐습니다. 정답: ${correctText}`
        : `❌ 오답! 정답: ${correctText}`;
    }

    const eventId = createEventId();
    if (isCorrect) {
      setPlayerAnimState("attack");
      setMonsterAnimState("hit");
      setBattleEvent({ id: eventId, type: "damage", source: "player", target: "monster", amount: rules.damageToMonster });
      addToLog(`✅ 정답! ${monsterDisplay.name}에게 ${rules.damageToMonster} 데미지!`);
    } else {
      setMonsterAnimState("attack");
      setPlayerAnimState("hit");
      setBattleEvent({ id: eventId, type: "damage", source: "monster", target: "player", amount: rules.damageToPlayer });
      addToLog(`❌ 오답! 플레이어가 ${rules.damageToPlayer} 데미지를 받았습니다.`);
    }

    setBattleState((prev) => ({
      ...prev,
      playerHp: newPlayerHp,
      monsterHp: newMonsterHp,
      correctCount: newCorrectCount,
      wrongCount: newWrongCount,
      answeredQuestionIds: [...prev.answeredQuestionIds, currentQuestion.id],
      wrongQuestionIds: newWrongIds,
      hasAnswered: true,
      selectedChoiceId: choiceId,
      isCurrentAnswerCorrect: isCorrect,
      isFinished: newIsFinished,
      feedbackMessage: msg,
    }));
  }

  function handleNext() {
    if (!hasAnswered) return;
    if (isFinished) {
      onBattleEnd(battleState);
      return;
    }
    prevFeedbackRef.current = "";
    setBattleEvent(null);
    setBattleState((prev) => ({
      ...prev,
      hasAnswered: false,
      selectedChoiceId: null,
      isCurrentAnswerCorrect: null,
      feedbackMessage: "",
      hiddenChoiceIds: [],
      currentQuestionIndex: prev.currentQuestionIndex + 1,
    }));
  }

  function handleExit() {
    if (window.confirm("전투를 포기하시겠습니까? 진행 상황이 저장되지 않습니다.")) {
      onExit();
    }
  }

  function getChoiceClass(choiceId) {
    if (hiddenChoiceIds.includes(choiceId)) return "choice-btn choice-hidden";
    if (!hasAnswered) return "choice-btn";
    if (choiceId === currentQuestion.correctChoiceId) return "choice-btn correct";
    if (choiceId === selectedChoiceId) return "choice-btn wrong";
    return "choice-btn choice-disabled";
  }

  const wrongDangerClass = wrongCount >= rules.mistakesToFail ? "goal-danger"
    : wrongCount >= rules.mistakesToFail - 1 ? "goal-warning" : "";
  const correctAchievedClass = correctCount >= rules.requiredCorrect ? "goal-achieved" : "";

  return (
    <div className="screen">
      {/* 헤더 */}
      <header className="battle-header">
        <button className="btn btn-ghost btn-small" onClick={handleExit}>✕</button>
        <span className="battle-stage-title">{isTrial ? "🧪 도약 시험" : stage.title}</span>
        <span className="battle-progress">{currentQuestionIndex + 1}/{totalQuestions}</span>
      </header>

      {/* 도약 시험 배너 */}
      {isTrial && (
        <div className="trial-banner">
          🧪 도약 시험 · 통과 조건: 정답률 {rules.passAccuracy}% 이상 · 아이템 사용 불가
        </div>
      )}

      {/* 배틀 아레나 */}
      <BattleArena
        playerHp={playerHp}
        playerMaxHp={playerMaxHp}
        monsterHp={monsterHp}
        monsterMaxHp={monsterMaxHp}
        monsterDisplay={monsterDisplay}
        isTrial={isTrial}
        playerAnimState={playerAnimState}
        monsterAnimState={monsterAnimState}
        battleEvent={battleEvent}
        onPlayerAnimComplete={() => setPlayerAnimState("idle")}
        onMonsterAnimComplete={() => setMonsterAnimState("idle")}
        themeClass={themeClass}
      />

      {/* 클리어 목표 */}
      <div className="battle-goal-card">
        <div className="battle-goal-row">
          <span className="battle-goal-label">🎯 정답</span>
          <span className={`battle-goal-value ${correctAchievedClass}`}>{correctCount} / {rules.requiredCorrect}</span>
          <span className="battle-goal-sep">·</span>
          <span className="battle-goal-label">⚠️ 오답</span>
          <span className={`battle-goal-value ${wrongDangerClass}`}>{wrongCount} / {rules.mistakesToFail}</span>
        </div>
      </div>

      {/* 전투 로그 */}
      {battleLog.length > 0 && (
        <div className="battle-log">
          {battleLog.map((entry, i) => (
            <div key={i} className={`battle-log-entry${i === battleLog.length - 1 ? " battle-log-latest" : ""}`}>
              {entry}
            </div>
          ))}
        </div>
      )}

      {/* 아이템 */}
      {!isTrial && (
        <div className="item-bar">
          <button
            className="item-btn"
            onClick={() => onUseItem("hints")}
            disabled={hasAnswered || isFinished || (inventory.hints ?? 0) <= 0}
            title="힌트: 오답 선택지 1개 숨김"
          >
            💡 힌트 ×{inventory.hints ?? 0}
          </button>
          <button
            className="item-btn"
            onClick={() => onUseItem("potions")}
            disabled={playerHp >= playerMaxHp || isFinished || (inventory.potions ?? 0) <= 0}
            title="포션: HP +30 회복"
          >
            💊 포션 ×{inventory.potions ?? 0}
          </button>
        </div>
      )}

      {/* 문제 */}
      <div className="card question-card">
        <AnnotatedText
          key={`${battleState.battleSessionId ?? ""}-${currentQuestion.id}`}
          text={currentQuestion.prompt}
          vocabItems={vocabItems}
        />
        <div className="choices-grid">
          {currentQuestion.choices.map((choice) => (
            <button
              key={`${battleState.battleSessionId ?? ""}-${currentQuestion.id}-${choice.id}`}
              className={getChoiceClass(choice.id)}
              onClick={() => handleChoiceClick(choice.id)}
              disabled={hasAnswered || isFinished || hiddenChoiceIds.includes(choice.id)}
            >
              {hiddenChoiceIds.includes(choice.id) ? "—" : choice.text}
            </button>
          ))}
        </div>

        {hasAnswered && (
          <div className={`feedback-box ${isCurrentAnswerCorrect ? "feedback-correct" : "feedback-wrong"}`}>
            <div className="feedback-message">{feedbackMessage}</div>
            <div className="feedback-explanation">{currentQuestion.explanation}</div>
          </div>
        )}

        {hasAnswered && <VocabNotesPanel vocabItems={vocabItems} />}

        {!hasAnswered && feedbackMessage && (
          <div className="feedback-box feedback-info">
            <div className="feedback-message">{feedbackMessage}</div>
          </div>
        )}
      </div>

      {/* 다음 버튼 */}
      <button
        className="btn btn-primary btn-large btn-full"
        onClick={handleNext}
        disabled={!hasAnswered}
      >
        {isFinished ? "결과 보기 →" : "다음 문제 →"}
      </button>
    </div>
  );
}
