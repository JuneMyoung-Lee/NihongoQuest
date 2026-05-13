import { useState, useEffect } from "react";
import "./App.css";

import { stages } from "./data/stages";
import { questions } from "./data/questions";

import { loadSaveData, saveGame, resetSaveData } from "./utils/storage";
import { refreshDailyStats } from "./utils/date";
import { applyExp, mergeUnique, getNextStage, isStageUnlocked } from "./utils/gameLogic";
import { getQuestionsByStage, validateQuestions, validateStages } from "./utils/question";

import HomeScreen from "./components/HomeScreen";
import StageSelectScreen from "./components/StageSelectScreen";
import BattleScreen from "./components/BattleScreen";
import ResultScreen from "./components/ResultScreen";

const SCREEN = {
  HOME: "home",
  STAGE_SELECT: "stageSelect",
  BATTLE: "battle",
  RESULT: "result",
};

export default function App() {
  const [screen, setScreen] = useState(SCREEN.HOME);
  const [player, setPlayer] = useState(null);
  const [selectedStageId, setSelectedStageId] = useState(null);
  const [battleState, setBattleState] = useState(null);
  const [resultState, setResultState] = useState(null);
  const [errorMessage, setErrorMessage] = useState("");

  useEffect(() => {
    validateQuestions(questions);
    validateStages(stages, questions);

    const saved = loadSaveData();
    const refreshed = refreshDailyStats(saved.player);
    setPlayer(refreshed);
    saveGame(refreshed);
  }, []);

  function startStage(stageId) {
    const stage = stages.find((s) => s.id === stageId);
    if (!stage) {
      setErrorMessage("존재하지 않는 스테이지입니다.");
      return;
    }
    if (!isStageUnlocked(stage, player)) {
      setErrorMessage("아직 해금되지 않은 스테이지입니다.");
      return;
    }

    const stageQuestions = getQuestionsByStage(stage, questions);
    if (stageQuestions.length === 0) {
      setErrorMessage("이 스테이지에 문제가 없습니다.");
      return;
    }

    setErrorMessage("");
    setSelectedStageId(stageId);
    setBattleState({
      mode: "stage",
      stageId,
      questions: stageQuestions,
      currentQuestionIndex: 0,
      playerHp: player.maxHp,
      playerMaxHp: player.maxHp,
      monsterHp: stage.monster.hp,
      monsterMaxHp: stage.monster.hp,
      correctCount: 0,
      answeredQuestionIds: [],
      wrongQuestionIds: [],
      hasAnswered: false,
      selectedChoiceId: null,
      isCurrentAnswerCorrect: null,
      feedbackMessage: "",
    });
    setResultState(null);
    setScreen(SCREEN.BATTLE);
  }

  function applyBattleResultToPlayer(currentPlayer, result) {
    let updated = {
      ...currentPlayer,
      clearedStageIds: [...currentPlayer.clearedStageIds],
      wrongQuestionIds: [...currentPlayer.wrongQuestionIds],
      stats: { ...currentPlayer.stats },
    };

    updated.stats.totalAnswered += result.totalQuestions;
    updated.stats.totalCorrect += result.correctCount;
    updated.stats.todayAnswered += result.totalQuestions;

    if (result.isCleared) {
      updated.stats.todayClearedStages += 1;
      updated.clearedStageIds = mergeUnique(
        updated.clearedStageIds,
        [result.stageId]
      );
    }

    updated.wrongQuestionIds = mergeUnique(
      updated.wrongQuestionIds,
      result.wrongQuestionIds
    );

    if (!updated.stats.lastPlayedDate) {
      updated.stats.lastPlayedDate = new Date().toISOString().slice(0, 10);
    }
    if (updated.stats.streakDays === 0) {
      updated.stats.streakDays = 1;
    }

    const previousLevel = updated.level;
    const previousTitle = updated.title;
    updated.gold += result.earnedGold;
    updated = applyExp(updated, result.earnedExp);

    const leveledUp = updated.level > previousLevel;
    const newLevel = updated.level;
    const newTitle = updated.title;

    const ok = saveGame(updated);
    if (!ok) {
      setErrorMessage("저장에 실패했습니다. 브라우저 저장공간을 확인해주세요.");
    }
    setPlayer(updated);

    return { leveledUp, previousLevel, newLevel, previousTitle, newTitle };
  }

  function handleBattleEnd(finalBattleState) {
    const stage = stages.find((s) => s.id === finalBattleState.stageId);
    if (!stage) return;

    const totalQuestions = finalBattleState.questions.length;
    const correctCount = finalBattleState.correctCount;
    const accuracy = totalQuestions > 0
      ? Math.round((correctCount / totalQuestions) * 100)
      : 0;
    const isCleared = accuracy >= 60 && finalBattleState.playerHp > 0;

    const earnedExp = isCleared
      ? stage.rewards.exp
      : Math.floor(stage.rewards.exp * 0.3);
    const earnedGold = isCleared ? stage.rewards.gold : 0;

    const result = {
      stageId: finalBattleState.stageId,
      mode: finalBattleState.mode,
      totalQuestions,
      correctCount,
      accuracy,
      isCleared,
      earnedExp,
      earnedGold,
      wrongQuestionIds: finalBattleState.wrongQuestionIds,
      remainingPlayerHp: finalBattleState.playerHp,
      saved: false,
      previousLevel: player.level,
      newLevel: player.level,
      previousTitle: player.title,
      newTitle: player.title,
      leveledUp: false,
    };

    setResultState(result);
    setScreen(SCREEN.RESULT);
  }

  function handleResultSaved(result) {
    const { leveledUp, previousLevel, newLevel, previousTitle, newTitle } =
      applyBattleResultToPlayer(player, result);

    setResultState((prev) => ({
      ...prev,
      saved: true,
      leveledUp,
      previousLevel,
      newLevel,
      previousTitle,
      newTitle,
    }));
  }

  function handleReset() {
    if (!window.confirm("모든 진행 데이터를 초기화하시겠습니까?")) return;
    resetSaveData();
    const fresh = loadSaveData();
    setPlayer(fresh.player);
    setScreen(SCREEN.HOME);
    setErrorMessage("");
  }

  if (!player) {
    return <div className="app-loading">로딩 중...</div>;
  }

  const nextStage = resultState
    ? getNextStage(resultState.stageId, stages, player)
    : null;

  return (
    <div className="app-container">
      {errorMessage && (
        <div className="error-banner">
          ⚠️ {errorMessage}
          <button className="error-close" onClick={() => setErrorMessage("")}>✕</button>
        </div>
      )}

      {screen === SCREEN.HOME && (
        <HomeScreen
          player={player}
          stages={stages}
          onStartQuest={startStage}
          onGoStageSelect={() => setScreen(SCREEN.STAGE_SELECT)}
          onReset={handleReset}
          setErrorMessage={setErrorMessage}
        />
      )}

      {screen === SCREEN.STAGE_SELECT && (
        <StageSelectScreen
          player={player}
          stages={stages}
          onStartStage={startStage}
          onGoHome={() => setScreen(SCREEN.HOME)}
        />
      )}

      {screen === SCREEN.BATTLE && battleState && (
        <BattleScreen
          battleState={battleState}
          setBattleState={setBattleState}
          stages={stages}
          onBattleEnd={handleBattleEnd}
          onExit={() => setScreen(SCREEN.STAGE_SELECT)}
        />
      )}

      {screen === SCREEN.RESULT && resultState && (
        <ResultScreen
          resultState={resultState}
          player={player}
          stages={stages}
          nextStage={nextStage}
          onResultSaved={handleResultSaved}
          onStartStage={startStage}
          onGoStageSelect={() => setScreen(SCREEN.STAGE_SELECT)}
          onGoHome={() => setScreen(SCREEN.HOME)}
        />
      )}
    </div>
  );
}
