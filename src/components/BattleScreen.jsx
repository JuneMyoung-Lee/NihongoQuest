import ProgressBar from "./ProgressBar";
import VocabNotesPanel from "./VocabNotesPanel";
import AnnotatedText from "./AnnotatedText";
import { vocabulary } from "../data/vocabulary";
import { getVocabularyByIds, getKanjiNotesFromVocabulary } from "../utils/question";

export default function BattleScreen({ battleState, setBattleState, player, stages, onBattleEnd, onUseItem, onExit }) {
  const stage = stages.find((s) => s.id === battleState.stageId);
  if (!stage) return <div className="screen"><p>스테이지 정보를 불러올 수 없습니다.</p></div>;

  const {
    mode, questions, currentQuestionIndex, playerHp, playerMaxHp,
    monsterHp, monsterMaxHp, correctCount, hasAnswered,
    selectedChoiceId, isCurrentAnswerCorrect, feedbackMessage, hiddenChoiceIds,
  } = battleState;

  const isTrial = mode === "trial";
  const currentQuestion = questions[currentQuestionIndex];
  const isLastQuestion = currentQuestionIndex >= questions.length - 1;
  const totalQuestions = questions.length;
  const inventory = player?.inventory ?? { hints: 0, potions: 0 };

  const monsterDisplay = isTrial
    ? { name: "문지기 스핑크스", emoji: "🦉", hp: 100 }
    : stage.monster;

  const vocabItems = getVocabularyByIds(currentQuestion.vocabIds, vocabulary);
  const kanjiNotes = getKanjiNotesFromVocabulary(vocabItems);

  function handleChoiceClick(choiceId) {
    if (hasAnswered) return;
    if (hiddenChoiceIds.includes(choiceId)) return;

    const isCorrect = choiceId === currentQuestion.correctChoiceId;
    const newMonsterHp = isCorrect ? Math.max(0, monsterHp - 20) : monsterHp;
    const newPlayerHp = isCorrect ? playerHp : Math.max(0, playerHp - (isTrial ? 20 : 10));
    const newWrongIds = isCorrect
      ? battleState.wrongQuestionIds
      : [...new Set([...battleState.wrongQuestionIds, currentQuestion.id])];

    setBattleState((prev) => ({
      ...prev,
      playerHp: newPlayerHp,
      monsterHp: newMonsterHp,
      correctCount: isCorrect ? prev.correctCount + 1 : prev.correctCount,
      answeredQuestionIds: [...prev.answeredQuestionIds, currentQuestion.id],
      wrongQuestionIds: newWrongIds,
      hasAnswered: true,
      selectedChoiceId: choiceId,
      isCurrentAnswerCorrect: isCorrect,
      feedbackMessage: isCorrect
        ? "✅ 정답입니다!"
        : `❌ 오답! 정답: ${currentQuestion.choices.find((c) => c.id === currentQuestion.correctChoiceId)?.text ?? ""}`,
    }));
  }

  function handleNext() {
    if (!hasAnswered) return;

    const updatedState = {
      ...battleState,
      hasAnswered: false,
      selectedChoiceId: null,
      isCurrentAnswerCorrect: null,
      feedbackMessage: "",
      hiddenChoiceIds: [],
    };

    if (battleState.playerHp <= 0 || isLastQuestion) {
      onBattleEnd({ ...updatedState, currentQuestionIndex });
      return;
    }

    setBattleState({ ...updatedState, currentQuestionIndex: currentQuestionIndex + 1 });
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

  return (
    <div className="screen">
      {/* 헤더 */}
      <header className="battle-header">
        <button className="btn btn-ghost btn-small" onClick={handleExit}>✕</button>
        <span className="battle-stage-title">{isTrial ? "🧪 도약 시험" : stage.title}</span>
        <span className="battle-progress">{currentQuestionIndex + 1}/{totalQuestions}</span>
      </header>

      {/* 도약 시험 안내 배너 */}
      {isTrial && (
        <div className="trial-banner">
          🧪 도약 시험 · 통과 조건: 정답률 80% 이상 · 아이템 사용 불가
        </div>
      )}

      {/* HP 상태 */}
      <div className={`card battle-status monster-card theme-${stage.monster.theme}`}>
        <div className="hp-row">
          <div className="hp-block">
            <div className="hp-label">🧑 플레이어</div>
            <div className="hp-value">{playerHp} / {playerMaxHp}</div>
            <ProgressBar current={playerHp} max={playerMaxHp} colorClass="player-hp-bar" />
          </div>
          <div className="battle-vs">VS</div>
          <div className="hp-block">
            <div className="hp-label">{monsterDisplay.emoji} {monsterDisplay.name}</div>
            <div className="hp-value">{monsterHp} / {monsterMaxHp}</div>
            <ProgressBar current={monsterHp} max={monsterMaxHp} colorClass="monster-hp-bar" />
          </div>
        </div>
      </div>

      {/* 진행 바 */}
      <div className="question-progress">
        <ProgressBar current={correctCount} max={totalQuestions} colorClass="correct-bar" />
        <div className="question-progress-label">정답 {correctCount}/{totalQuestions}</div>
      </div>

      {/* 아이템 */}
      {!isTrial && (
        <div className="item-bar">
          <button
            className="item-btn"
            onClick={() => onUseItem("hints")}
            disabled={hasAnswered || (inventory.hints ?? 0) <= 0}
            title="힌트: 오답 선택지 1개 숨김"
          >
            💡 힌트 ×{inventory.hints ?? 0}
          </button>
          <button
            className="item-btn"
            onClick={() => onUseItem("potions")}
            disabled={playerHp >= playerMaxHp || (inventory.potions ?? 0) <= 0}
            title="포션: HP +30 회복"
          >
            💊 포션 ×{inventory.potions ?? 0}
          </button>
        </div>
      )}

      {/* 문제 */}
      <div className="card question-card">
        <AnnotatedText key={currentQuestion.id} text={currentQuestion.prompt} vocabItems={vocabItems} />
        <div className="choices-grid">
          {currentQuestion.choices.map((choice) => (
            <button
              key={choice.id}
              className={getChoiceClass(choice.id)}
              onClick={() => handleChoiceClick(choice.id)}
              disabled={hasAnswered || hiddenChoiceIds.includes(choice.id)}
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

        {hasAnswered && <VocabNotesPanel vocabItems={vocabItems} kanjiNotes={kanjiNotes} />}

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
        {isLastQuestion || battleState.playerHp <= 0 ? "결과 보기 →" : "다음 문제 →"}
      </button>
    </div>
  );
}
