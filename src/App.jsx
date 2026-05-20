import { useState, useEffect } from "react";
import "./App.css";
import { getInitialTheme, saveTheme, applyThemeToDocument } from "./utils/theme";

import { stages } from "./data/stages";
import { questions } from "./data/questions";

import { loadSaveData, saveGame, resetSaveData } from "./utils/storage";
import { refreshDailyStats } from "./utils/date";
import {
  applyExp, mergeUnique, getNextStage, isStageUnlocked,
  canAttemptTrial, applyPurchase, getReplayReward,
  updateStageProgress,
} from "./utils/gameLogic";
import { getRandomQuestionsByStage, getTrialQuestionsByStage, validateQuestions, validateStages, validateVocabulary } from "./utils/question";
import { createBattleRules } from "./utils/battleRules";
import { vocabulary } from "./data/vocabulary";

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

function createBattleSessionId() {
  if (typeof crypto !== "undefined" && crypto.randomUUID) {
    return crypto.randomUUID();
  }
  return `battle_${Date.now()}_${Math.random().toString(36).slice(2)}`;
}

export default function App() {
  const [screen, setScreen] = useState(SCREEN.HOME);
  const [player, setPlayer] = useState(null);
  const [battleState, setBattleState] = useState(null);
  const [resultState, setResultState] = useState(null);
  const [errorMessage, setErrorMessage] = useState("");
  const [theme, setTheme] = useState(getInitialTheme);

  useEffect(() => {
    applyThemeToDocument(theme);
    saveTheme(theme);
  }, [theme]);

  useEffect(() => {
    window.scrollTo({ top: 0, behavior: "instant" });
  }, [screen]);

  useEffect(() => {
    validateQuestions(questions);
    validateStages(stages, questions);
    validateVocabulary(questions, vocabulary);

    const saved = loadSaveData();
    const refreshed = refreshDailyStats(saved.player);
    setPlayer(refreshed);
    saveGame(refreshed);
  }, []);

  function startStage(stageId) {
    const stage = stages.find((s) => s.id === stageId);
    if (!stage) { setErrorMessage("존재하지 않는 스테이지입니다."); return; }
    if (!isStageUnlocked(stage, player)) { setErrorMessage("아직 해금되지 않은 스테이지입니다."); return; }

    const stageQuestions = getRandomQuestionsByStage(stage, questions);
    if (stageQuestions.length === 0) { setErrorMessage("이 스테이지에 문제가 없습니다."); return; }

    const rules = createBattleRules({ stage, questions: stageQuestions, player, mode: "stage" });

    setErrorMessage("");
    setBattleState({
      battleSessionId: createBattleSessionId(),
      mode: "stage",
      stageId,
      questions: stageQuestions,
      battleRules: rules,
      currentQuestionIndex: 0,
      playerHp: rules.playerMaxHp,
      playerMaxHp: rules.playerMaxHp,
      monsterHp: rules.monsterMaxHp,
      monsterMaxHp: rules.monsterMaxHp,
      correctCount: 0,
      wrongCount: 0,
      answeredQuestionIds: [],
      wrongQuestionIds: [],
      hasAnswered: false,
      selectedChoiceId: null,
      isCurrentAnswerCorrect: null,
      feedbackMessage: "",
      hiddenChoiceIds: [],
      isFinished: false,
    });
    setResultState(null);
    setScreen(SCREEN.BATTLE);
  }

  function startTrial(stageId) {
    const stage = stages.find((s) => s.id === stageId);
    if (!stage) { setErrorMessage("존재하지 않는 스테이지입니다."); return; }
    if (!canAttemptTrial(stage, player)) { setErrorMessage("도약 시험 조건을 만족하지 못합니다."); return; }

    // 도약의 증표 소모 처리 (order > 3이고 레벨 조건 미충족 시)
    const level = player.level;
    const tickets = player.inventory?.trialTickets ?? 0;
    const needsTicket = stage.order > 3 && level < Math.ceil(stage.order / 2);

    if (needsTicket) {
      if (tickets <= 0) { setErrorMessage("도약의 증표가 없습니다."); return; }
      if (!window.confirm(`도약의 증표 1개를 사용합니다. 현재 보유: ${tickets}개`)) return;
      const updated = {
        ...player,
        inventory: { ...player.inventory, trialTickets: tickets - 1 },
        economy: { ...player.economy, totalGoldSpent: (player.economy?.totalGoldSpent ?? 0) },
      };
      setPlayer(updated);
      saveGame(updated);
    }

    const trialQuestions = getTrialQuestionsByStage(stage, questions, 5);
    if (trialQuestions.length === 0) { setErrorMessage("이 스테이지에 문제가 없습니다."); return; }

    const trialRules = createBattleRules({ stage, questions: trialQuestions, player, mode: "trial" });

    setErrorMessage("");
    setBattleState({
      battleSessionId: createBattleSessionId(),
      mode: "trial",
      stageId,
      questions: trialQuestions,
      battleRules: trialRules,
      currentQuestionIndex: 0,
      playerHp: trialRules.playerMaxHp,
      playerMaxHp: trialRules.playerMaxHp,
      monsterHp: trialRules.monsterMaxHp,
      monsterMaxHp: trialRules.monsterMaxHp,
      correctCount: 0,
      wrongCount: 0,
      answeredQuestionIds: [],
      wrongQuestionIds: [],
      hasAnswered: false,
      selectedChoiceId: null,
      isCurrentAnswerCorrect: null,
      feedbackMessage: "",
      hiddenChoiceIds: [],
      isFinished: false,
    });
    setResultState(null);
    setScreen(SCREEN.BATTLE);
  }

  function startReview() {
    const wrongIds = player.wrongQuestionIds ?? [];
    const reviewQs = wrongIds
      .map((id) => questions.find((q) => q.id === id))
      .filter(Boolean);

    if (reviewQs.length === 0) {
      setErrorMessage("복습할 오답이 없습니다. 먼저 스테이지에 도전해보세요!");
      return;
    }

    const REVIEW_MAX = 10;
    const shuffled = [...reviewQs].sort(() => Math.random() - 0.5).slice(0, REVIEW_MAX);
    const totalQ = shuffled.length;
    const requiredCorrect = Math.max(1, Math.ceil(totalQ * 0.7));
    const monsterHp = requiredCorrect * 30;

    const rules = {
      totalQuestions: totalQ,
      passAccuracy: 70,
      requiredCorrect,
      allowedWrong: totalQ,
      mistakesToFail: totalQ + 1,
      playerMaxHp: player.maxHp ?? 100,
      monsterMaxHp: monsterHp,
      damageToPlayer: 0,
      damageToMonster: Math.max(1, Math.ceil(monsterHp / requiredCorrect)),
    };

    setErrorMessage("");
    setBattleState({
      battleSessionId: createBattleSessionId(),
      mode: "review",
      stageId: null,
      questions: shuffled,
      battleRules: rules,
      currentQuestionIndex: 0,
      playerHp: rules.playerMaxHp,
      playerMaxHp: rules.playerMaxHp,
      monsterHp: rules.monsterMaxHp,
      monsterMaxHp: rules.monsterMaxHp,
      correctCount: 0,
      wrongCount: 0,
      answeredQuestionIds: [],
      wrongQuestionIds: [],
      hasAnswered: false,
      selectedChoiceId: null,
      isCurrentAnswerCorrect: null,
      feedbackMessage: "",
      hiddenChoiceIds: [],
      isFinished: false,
    });
    setResultState(null);
    setScreen(SCREEN.BATTLE);
  }

  function handleUseItem(itemType) {
    if (!player || !battleState) return;
    if (battleState.mode === "trial" || battleState.mode === "review") {
      setErrorMessage("이 모드에서는 아이템을 사용할 수 없습니다.");
      return;
    }

    if (itemType === "hints") {
      if (battleState.hasAnswered) return;
      const count = player.inventory?.hints ?? 0;
      if (count <= 0) return;

      const currentQ = battleState.questions[battleState.currentQuestionIndex];
      const wrongChoices = currentQ.choices
        .filter((c) => c.id !== currentQ.correctChoiceId && !battleState.hiddenChoiceIds.includes(c.id));
      if (wrongChoices.length === 0) return;

      const toHide = wrongChoices[Math.floor(Math.random() * wrongChoices.length)].id;
      const updatedPlayer = {
        ...player,
        inventory: { ...player.inventory, hints: count - 1 },
      };
      setPlayer(updatedPlayer);
      saveGame(updatedPlayer);
      setBattleState((prev) => ({
        ...prev,
        hiddenChoiceIds: [...prev.hiddenChoiceIds, toHide],
        feedbackMessage: "💡 힌트 사용! 오답 선택지 1개를 숨겼습니다.",
      }));
    } else if (itemType === "potions") {
      const count = player.inventory?.potions ?? 0;
      if (count <= 0) return;
      if (battleState.playerHp >= battleState.playerMaxHp) return;

      const newHp = Math.min(battleState.playerHp + 30, battleState.playerMaxHp);
      const updatedPlayer = {
        ...player,
        inventory: { ...player.inventory, potions: count - 1 },
      };
      setPlayer(updatedPlayer);
      saveGame(updatedPlayer);
      setBattleState((prev) => ({
        ...prev,
        playerHp: newHp,
        feedbackMessage: `💊 포션 사용! HP ${prev.playerHp} → ${newHp}`,
      }));
    }
  }

  function handlePurchase(itemType) {
    if (!player) return;
    const result = applyPurchase(player, itemType);
    if (!result.success) { setErrorMessage(result.message); return; }
    const updated = {
      ...result.player,
      economy: {
        ...result.player.economy,
        totalGoldEarned: player.economy?.totalGoldEarned ?? 0,
      },
    };
    setPlayer(updated);
    saveGame(updated);
  }

  function handleBattleEnd(finalBattleState) {
    // 오답 복습 모드
    if (finalBattleState.mode === "review") {
      const answeredCount = finalBattleState.answeredQuestionIds?.length ?? 0;
      const correctCount  = finalBattleState.correctCount;
      const wrongCount    = finalBattleState.wrongCount ?? 0;
      const accuracy      = answeredCount > 0 ? Math.round((correctCount / answeredCount) * 100) : 0;
      const sessionWrongSet = new Set(finalBattleState.wrongQuestionIds ?? []);
      const masteredIds = (finalBattleState.answeredQuestionIds ?? []).filter(
        (id) => !sessionWrongSet.has(id),
      );
      const remainingWrongCount = Math.max(
        0,
        (player.wrongQuestionIds?.length ?? 0) - masteredIds.length,
      );
      setResultState({
        mode: "review",
        stageId: null,
        totalQuestions: finalBattleState.questions?.length ?? 0,
        answeredCount,
        correctCount,
        wrongCount,
        accuracy,
        masteredIds,
        remainingWrongCount,
        wrongQuestionIds: finalBattleState.wrongQuestionIds ?? [],
        saved: false,
        earnedExp: 0,
        earnedGold: 0,
      });
      setScreen(SCREEN.RESULT);
      return;
    }

    const stage = stages.find((s) => s.id === finalBattleState.stageId);
    if (!stage) return;

    const rules = finalBattleState.battleRules;
    const totalQuestions = finalBattleState.questions?.length ?? 0;
    const answeredCount = finalBattleState.answeredQuestionIds?.length ?? 0;
    const correctCount = finalBattleState.correctCount;
    const wrongCount = finalBattleState.wrongCount ?? Math.max(0, answeredCount - correctCount);
    const accuracy = answeredCount > 0 ? Math.round((correctCount / answeredCount) * 100) : 0;
    const isCleared = finalBattleState.monsterHp <= 0;
    const requiredCorrect = rules?.requiredCorrect ?? Math.max(1, Math.ceil(totalQuestions * 0.7));
    const passAccuracy = rules?.passAccuracy ?? 70;

    const clearReason = isCleared ? "monsterDefeated" : null;
    const failReason = !isCleared
      ? (finalBattleState.playerHp <= 0 ? "playerDead" : "notEnoughCorrect")
      : null;

    if (finalBattleState.mode === "trial") {
      setResultState({
        mode: "trial",
        stageId: finalBattleState.stageId,
        totalQuestions,
        answeredCount,
        correctCount,
        wrongCount,
        accuracy,
        isCleared: false,
        trialPassed: isCleared,
        requiredCorrect,
        passAccuracy,
        clearReason,
        failReason,
        earnedExp: 0,
        earnedGold: 0,
        wrongQuestionIds: finalBattleState.wrongQuestionIds,
        remainingPlayerHp: finalBattleState.playerHp,
        remainingMonsterHp: finalBattleState.monsterHp,
        saved: false,
        previousLevel: player.level,
        newLevel: player.level,
        previousTitle: player.title,
        newTitle: player.title,
        leveledUp: false,
      });
    } else {
      const alreadyCleared = player.clearedStageIds.includes(finalBattleState.stageId);
      const prevBest = player.stageProgress?.[finalBattleState.stageId]?.bestAccuracy ?? 0;
      const isBestUpdated = accuracy > prevBest;
      const reward = getReplayReward(stage, alreadyCleared, isBestUpdated && isCleared);

      setResultState({
        mode: "stage",
        stageId: finalBattleState.stageId,
        totalQuestions,
        answeredCount,
        correctCount,
        wrongCount,
        accuracy,
        isCleared,
        trialPassed: false,
        requiredCorrect,
        passAccuracy,
        clearReason,
        failReason,
        earnedExp: isCleared ? reward.exp : Math.floor(stage.rewards.exp * 0.3),
        earnedGold: isCleared ? reward.gold : 0,
        isFirstClear: reward.isFirstClear,
        isBestAccuracy: isBestUpdated && isCleared,
        wrongQuestionIds: finalBattleState.wrongQuestionIds,
        remainingPlayerHp: finalBattleState.playerHp,
        remainingMonsterHp: finalBattleState.monsterHp,
        saved: false,
        previousLevel: player.level,
        newLevel: player.level,
        previousTitle: player.title,
        newTitle: player.title,
        leveledUp: false,
      });
    }
    setScreen(SCREEN.RESULT);
  }

  function handleResultSaved(result) {
    let updated = { ...player };

    if (result.mode === "review") {
      const masteredSet = new Set(result.masteredIds ?? []);
      updated.wrongQuestionIds = (player.wrongQuestionIds ?? []).filter(
        (id) => !masteredSet.has(id),
      );
      updated.stats = {
        ...updated.stats,
        totalAnswered: updated.stats.totalAnswered + (result.answeredCount ?? 0),
        totalCorrect:  updated.stats.totalCorrect  + result.correctCount,
        todayAnswered: updated.stats.todayAnswered  + (result.answeredCount ?? 0),
      };
      const ok = saveGame(updated);
      if (!ok) setErrorMessage("저장에 실패했습니다.");
      setPlayer(updated);
      setResultState((prev) => ({ ...prev, saved: true }));
      return;
    }

    if (result.mode === "trial") {
      // 도약 시험: stats만 업데이트, clearedStageIds에는 넣지 않음
      const trialAnswered = result.answeredCount ?? result.totalQuestions;
      updated.stats = {
        ...updated.stats,
        totalAnswered: updated.stats.totalAnswered + trialAnswered,
        totalCorrect: updated.stats.totalCorrect + result.correctCount,
        todayAnswered: updated.stats.todayAnswered + trialAnswered,
      };
      if (result.trialPassed) {
        updated.unlockedStageIds = mergeUnique(updated.unlockedStageIds, [result.stageId]);
      }
      updated.wrongQuestionIds = mergeUnique(updated.wrongQuestionIds, result.wrongQuestionIds);
      saveGame(updated);
      setPlayer(updated);
      setResultState((prev) => ({ ...prev, saved: true }));
      return;
    }

    // 일반 스테이지
    const DAILY_GOAL = 20;
    const prevTodayAnswered = updated.stats.todayAnswered;
    const stageAnswered = result.answeredCount ?? result.totalQuestions;
    updated.stats = {
      ...updated.stats,
      totalAnswered: updated.stats.totalAnswered + stageAnswered,
      totalCorrect: updated.stats.totalCorrect + result.correctCount,
      todayAnswered: updated.stats.todayAnswered + stageAnswered,
    };

    // 일일 목표 달성 보상 (+5G)
    const newTodayAnswered = updated.stats.todayAnswered;
    let dailyGoalAchieved = false;
    if (!updated.stats.dailyGoalClaimed && prevTodayAnswered < DAILY_GOAL && newTodayAnswered >= DAILY_GOAL) {
      updated.gold += 5;
      updated.stats.dailyGoalClaimed = true;
      updated.economy = { ...updated.economy, totalGoldEarned: (updated.economy?.totalGoldEarned ?? 0) + 5 };
      dailyGoalAchieved = true;
    }

    if (result.isCleared) {
      updated.stats.todayClearedStages += 1;
      updated.clearedStageIds = mergeUnique(updated.clearedStageIds, [result.stageId]);
    }

    updated.wrongQuestionIds = mergeUnique(updated.wrongQuestionIds, result.wrongQuestionIds);

    if (!updated.stats.lastPlayedDate) updated.stats.lastPlayedDate = new Date().toISOString().slice(0, 10);
    if (updated.stats.streakDays === 0) updated.stats.streakDays = 1;

    const previousLevel = updated.level;
    const previousTitle = updated.title;

    updated.gold += result.earnedGold;
    if (result.earnedGold > 0) {
      updated.economy = {
        ...updated.economy,
        totalGoldEarned: (updated.economy?.totalGoldEarned ?? 0) + result.earnedGold,
      };
    }
    updated = applyExp(updated, result.earnedExp);

    // stageProgress 업데이트
    const progressUpdated = updateStageProgress(updated, result);
    updated = { ...progressUpdated };
    delete updated._isBestAccuracy;

    const leveledUp = updated.level > previousLevel;
    const newLevel = updated.level;
    const newTitle = updated.title;

    const ok = saveGame(updated);
    if (!ok) setErrorMessage("저장에 실패했습니다. 브라우저 저장공간을 확인해주세요.");
    setPlayer(updated);

    setResultState((prev) => ({
      ...prev,
      dailyGoalAchieved,
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
          onStartReview={startReview}
          onReset={handleReset}
          onPurchase={handlePurchase}
          setErrorMessage={setErrorMessage}
          theme={theme}
          onThemeToggle={() => setTheme((t) => (t === "dark" ? "light" : "dark"))}
        />
      )}

      {screen === SCREEN.STAGE_SELECT && (
        <StageSelectScreen
          player={player}
          stages={stages}
          onStartStage={startStage}
          onStartTrial={startTrial}
          onGoHome={() => setScreen(SCREEN.HOME)}
        />
      )}

      {screen === SCREEN.BATTLE && battleState && (
        <BattleScreen
          key={battleState.battleSessionId}
          battleState={battleState}
          setBattleState={setBattleState}
          player={player}
          stages={stages}
          onBattleEnd={handleBattleEnd}
          onUseItem={handleUseItem}
          onExit={() => battleState.mode === "review" ? setScreen(SCREEN.HOME) : setScreen(SCREEN.STAGE_SELECT)}
          appTheme={theme}
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
          onStartTrial={startTrial}
          onStartReview={startReview}
          onGoStageSelect={() => setScreen(SCREEN.STAGE_SELECT)}
          onGoHome={() => setScreen(SCREEN.HOME)}
        />
      )}
    </div>
  );
}
