import ProgressBar from "./ProgressBar";

export default function BattleScreen({
  battleState,
  setBattleState,
  stages,
  onBattleEnd,
  onExit,
}) {
  const stage = stages.find((s) => s.id === battleState.stageId);
  if (!stage) return <div className="screen"><p>스테이지 정보를 불러올 수 없습니다.</p></div>;

  const {
    questions,
    currentQuestionIndex,
    playerHp,
    playerMaxHp,
    monsterHp,
    monsterMaxHp,
    correctCount,
    hasAnswered,
    selectedChoiceId,
    isCurrentAnswerCorrect,
    feedbackMessage,
  } = battleState;

  const currentQuestion = questions[currentQuestionIndex];
  const isLastQuestion = currentQuestionIndex >= questions.length - 1;
  const totalQuestions = questions.length;

  function handleChoiceClick(choiceId) {
    if (hasAnswered) return;

    const isCorrect = choiceId === currentQuestion.correctChoiceId;
    let newMonsterHp = monsterHp;
    let newPlayerHp = playerHp;

    if (isCorrect) {
      newMonsterHp = Math.max(0, monsterHp - 20);
    } else {
      newPlayerHp = Math.max(0, playerHp - 10);
    }

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
    };

    // HP 0이거나 마지막 문제면 종료
    if (battleState.playerHp <= 0 || isLastQuestion) {
      onBattleEnd({
        ...updatedState,
        currentQuestionIndex,
      });
      return;
    }

    setBattleState({
      ...updatedState,
      currentQuestionIndex: currentQuestionIndex + 1,
    });
  }

  function handleExit() {
    if (window.confirm("전투를 포기하시겠습니까? 진행 상황이 저장되지 않습니다.")) {
      onExit();
    }
  }

  function getChoiceClass(choiceId) {
    if (!hasAnswered) return "choice-btn";
    if (choiceId === currentQuestion.correctChoiceId) return "choice-btn correct";
    if (choiceId === selectedChoiceId) return "choice-btn wrong";
    return "choice-btn choice-disabled";
  }

  return (
    <div className="screen">
      {/* 상단 헤더 */}
      <header className="battle-header">
        <button className="btn btn-ghost btn-small" onClick={handleExit}>✕ 나가기</button>
        <span className="battle-stage-title">{stage.title}</span>
        <span className="battle-progress">{currentQuestionIndex + 1}/{totalQuestions}</span>
      </header>

      {/* 전투 상태 */}
      <div className="card battle-status">
        <div className="hp-row">
          <div className="hp-block">
            <div className="hp-label">🧑 플레이어</div>
            <div className="hp-value">{playerHp} / {playerMaxHp}</div>
            <ProgressBar current={playerHp} max={100} colorClass="player-hp-bar" />
          </div>
          <div className="battle-vs">VS</div>
          <div className="hp-block">
            <div className="hp-label">{stage.monster.emoji} {stage.monster.name}</div>
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

      {/* 문제 영역 */}
      <div className="card question-card">
        <div className="question-prompt">{currentQuestion.prompt}</div>

        <div className="choices-grid">
          {currentQuestion.choices.map((choice) => (
            <button
              key={choice.id}
              className={getChoiceClass(choice.id)}
              onClick={() => handleChoiceClick(choice.id)}
              disabled={hasAnswered}
            >
              {choice.text}
            </button>
          ))}
        </div>

        {/* 피드백 */}
        {hasAnswered && (
          <div className={`feedback-box ${isCurrentAnswerCorrect ? "feedback-correct" : "feedback-wrong"}`}>
            <div className="feedback-message">{feedbackMessage}</div>
            <div className="feedback-explanation">{currentQuestion.explanation}</div>
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
