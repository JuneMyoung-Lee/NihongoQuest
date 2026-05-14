// Fisher-Yates 셔플. 원본 배열을 변경하지 않고 새 배열 반환.
export function shuffleArray(array) {
  if (!Array.isArray(array) || array.length === 0) return [];
  const arr = [...array];
  for (let i = arr.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [arr[i], arr[j]] = [arr[j], arr[i]];
  }
  return arr;
}

// questionIds 배열에서 중복 id 제거 (중복 발견 시 console.warn)
export function dedupeQuestionIds(questionIds) {
  if (!Array.isArray(questionIds)) return [];
  const seen = new Set();
  return questionIds.filter((id) => {
    if (seen.has(id)) {
      console.warn(`[question] questionIds에 중복 id: "${id}"`);
      return false;
    }
    seen.add(id);
    return true;
  });
}

// question 배열에서 id 기준 중복 제거
export function dedupeQuestionsById(questions) {
  if (!Array.isArray(questions)) return [];
  const seen = new Set();
  return questions.filter((q) => {
    if (!q?.id || seen.has(q.id)) return false;
    seen.add(q.id);
    return true;
  });
}

// question 배열에서 prompt+correctChoiceId 기준 중복 제거 (id가 다른 동일 문제 방지)
export function dedupeQuestionsByPrompt(questions) {
  if (!Array.isArray(questions)) return [];
  const seen = new Set();
  return questions.filter((q) => {
    if (!q?.prompt) return true;
    const key = `${q.prompt}|||${q.correctChoiceId ?? ""}`;
    if (seen.has(key)) return false;
    seen.add(key);
    return true;
  });
}

// 전투 시작용: without replacement 방식으로 questionCount개 추출 + choices 셔플.
// 원본 question 객체는 mutation하지 않음.
export function getRandomQuestionsByStage(stage, questions) {
  if (!stage || !stage.questionIds || !questions) return [];

  const questionMap = new Map(questions.map((q) => [q.id, q]));

  // 1. 중복 id 제거 (중복 있으면 warn)
  const uniqueIds = dedupeQuestionIds(stage.questionIds);

  // 2. 실제 question 객체 조회 (없는 id는 경고 후 제외)
  const pool = uniqueIds.reduce((acc, id) => {
    if (questionMap.has(id)) {
      acc.push(questionMap.get(id));
    } else {
      console.warn(`[question] 스테이지 "${stage.id}"에 존재하지 않는 문제 ID: ${id}`);
    }
    return acc;
  }, []);

  // 3. id 기준 중복 재확인 (방어적)
  const dedupedById = dedupeQuestionsById(pool);

  // 4. prompt+correctChoiceId 기준 중복 제거
  const dedupedByPrompt = dedupeQuestionsByPrompt(dedupedById);

  // 5. Fisher-Yates 셔플 (without replacement)
  const shuffled = shuffleArray(dedupedByPrompt);

  // 6. questionCount만큼 slice
  const count =
    stage.questionCount && stage.questionCount > 0
      ? Math.min(stage.questionCount, shuffled.length)
      : shuffled.length;

  const selected = shuffled.slice(0, count);

  // 7. 각 문제의 choices 셔플 (새 객체로 복사, 원본 mutation 없음)
  return selected.map((q) => ({
    ...q,
    choices: shuffleArray(q.choices ?? []),
  }));
}

// 도약 시험용: without replacement 방식으로 최대 count개 추출 + choices 셔플.
export function getTrialQuestionsByStage(stage, questions, count = 5) {
  if (!stage || !stage.questionIds || !questions) return [];

  const questionMap = new Map(questions.map((q) => [q.id, q]));

  const uniqueIds = dedupeQuestionIds(stage.questionIds);

  const pool = uniqueIds.reduce((acc, id) => {
    if (questionMap.has(id)) acc.push(questionMap.get(id));
    return acc;
  }, []);

  const dedupedById = dedupeQuestionsById(pool);
  const dedupedByPrompt = dedupeQuestionsByPrompt(dedupedById);

  const selected = shuffleArray(dedupedByPrompt).slice(0, count);

  return selected.map((q) => ({
    ...q,
    choices: shuffleArray(q.choices ?? []),
  }));
}

// vocabIds 배열로 vocabulary 객체에서 항목 조회. 없는 id는 경고 후 제외.
export function getVocabularyByIds(vocabIds, vocabulary) {
  if (!Array.isArray(vocabIds) || vocabIds.length === 0 || !vocabulary) return [];
  return vocabIds.reduce((acc, id) => {
    if (vocabulary[id]) {
      acc.push(vocabulary[id]);
    } else {
      console.warn(`[vocab] 존재하지 않는 vocabulary ID: "${id}"`);
    }
    return acc;
  }, []);
}

// 기존 코드와의 하위 호환 유지
export function getQuestionsByStage(stage, questions) {
  if (!stage || !stage.questionIds || !questions) return [];
  const questionMap = new Map(questions.map((q) => [q.id, q]));
  return stage.questionIds.reduce((acc, id) => {
    if (questionMap.has(id)) {
      acc.push(questionMap.get(id));
    } else {
      console.warn(`[question] 스테이지 "${stage.id}"에 존재하지 않는 문제 ID: ${id}`);
    }
    return acc;
  }, []);
}

export function getCorrectChoiceText(question) {
  if (!question || !question.choices) return "";
  const choice = question.choices.find((c) => c.id === question.correctChoiceId);
  return choice ? choice.text : "";
}

export function validateQuestions(questions) {
  if (!Array.isArray(questions)) {
    console.error("[validate] questions가 배열이 아닙니다.");
    return false;
  }
  let valid = true;
  const ids = new Set();
  questions.forEach((q) => {
    if (ids.has(q.id)) {
      console.warn(`[validate] 중복된 문제 ID: ${q.id}`);
      valid = false;
    }
    ids.add(q.id);
    if (!Array.isArray(q.choices) || q.choices.length !== 4) {
      console.warn(`[validate] 문제 ${q.id}의 choices가 4개가 아닙니다.`);
      valid = false;
    }
    const choiceIds = (q.choices || []).map((c) => c.id);
    if (!choiceIds.includes(q.correctChoiceId)) {
      console.warn(`[validate] 문제 ${q.id}의 correctChoiceId("${q.correctChoiceId}")가 choices에 없습니다.`);
      valid = false;
    }
  });
  return valid;
}

const VALID_JLPT_LEVELS = new Set(["N5", "N4", "N3", "N2", "N1"]);

export function validateStages(stages, questions) {
  if (!Array.isArray(stages)) {
    console.error("[validate] stages가 배열이 아닙니다.");
    return false;
  }

  const questionIds = new Set((questions || []).map((q) => q.id));
  const stageIds = new Set();
  let valid = true;

  stages.forEach((s) => {
    // id 누락·중복
    if (!s.id) {
      console.warn("[validate] stage.id 누락");
      valid = false;
      return;
    }
    if (stageIds.has(s.id)) {
      console.warn(`[validate] 스테이지 id 중복: "${s.id}"`);
      valid = false;
    }
    stageIds.add(s.id);

    // title
    if (!s.title) {
      console.warn(`[validate] 스테이지 "${s.id}"의 title 누락`);
      valid = false;
    }

    // jlptLevel
    if (!s.jlptLevel || !VALID_JLPT_LEVELS.has(s.jlptLevel)) {
      console.warn(`[validate] 스테이지 "${s.id}"의 jlptLevel이 없거나 유효하지 않음: "${s.jlptLevel}"`);
      valid = false;
    }

    // groupOrder / stageOrderInGroup
    if (s.groupOrder == null) {
      console.warn(`[validate] 스테이지 "${s.id}"의 groupOrder 누락`);
    }
    if (s.stageOrderInGroup == null) {
      console.warn(`[validate] 스테이지 "${s.id}"의 stageOrderInGroup 누락`);
    }

    // questionIds 배열 여부
    if (!Array.isArray(s.questionIds)) {
      console.warn(`[validate] 스테이지 "${s.id}"의 questionIds가 배열이 아닙니다.`);
      valid = false;
      return;
    }

    // questionIds 중복 및 존재 여부
    const seenQIds = new Set();
    s.questionIds.forEach((id) => {
      if (seenQIds.has(id)) {
        console.warn(`[validate] 스테이지 "${s.id}"의 questionIds에 중복 id: "${id}"`);
        valid = false;
      }
      seenQIds.add(id);
      if (!questionIds.has(id)) {
        console.warn(`[validate] 스테이지 "${s.id}"의 questionId "${id}"가 questions에 없습니다.`);
        valid = false;
      }
    });

    // questionCount > unique 문제 수
    if (s.questionCount != null && s.questionCount > seenQIds.size) {
      console.warn(
        `[validate] 스테이지 "${s.id}"의 questionCount(${s.questionCount})가 실제 고유 문제 수(${seenQIds.size})보다 큽니다.`
      );
    }

    // monster
    if (!s.monster?.name) {
      console.warn(`[validate] 스테이지 "${s.id}"의 monster.name 누락`);
    }
    if (!s.monster?.emoji) {
      console.warn(`[validate] 스테이지 "${s.id}"의 monster.emoji 누락`);
    }
    if (!s.monster?.hp || s.monster.hp <= 0) {
      console.warn(`[validate] 스테이지 "${s.id}"의 monster.hp가 없거나 0 이하`);
      valid = false;
    }

    // rewards
    if (s.rewards?.exp < 0) {
      console.warn(`[validate] 스테이지 "${s.id}"의 rewards.exp가 음수`);
    }
    if (s.rewards?.gold < 0) {
      console.warn(`[validate] 스테이지 "${s.id}"의 rewards.gold가 음수`);
    }
  });

  // requiredStageId 참조 검증 (두 번째 패스 — 모든 id 수집 후 체크)
  stages.forEach((s) => {
    if (s.requiredStageId && !stageIds.has(s.requiredStageId)) {
      console.warn(
        `[validate] 스테이지 "${s.id}"의 requiredStageId "${s.requiredStageId}"가 존재하지 않습니다.`
      );
      valid = false;
    }
  });

  return valid;
}

// vocabulary 연결 검증. 앱을 죽이지 않고 console.warn만 사용.
export function validateVocabulary(questions, vocabulary) {
  if (!Array.isArray(questions) || !vocabulary || typeof vocabulary !== "object") return;

  const vocabKeys = new Set(Object.keys(vocabulary));

  Object.values(vocabulary).forEach((v) => {
    if (!v || !v.id) return;
    if (!v.surface) {
      console.warn(`[validate] vocabulary "${v.id}"의 surface가 비어 있습니다.`);
    }
  });

  questions.forEach((q) => {
    if (!Array.isArray(q.vocabIds) || q.vocabIds.length === 0) return;
    q.vocabIds.forEach((id) => {
      if (!vocabKeys.has(id)) {
        console.warn(`[validate] 문제 "${q.id}"의 vocabId "${id}"가 vocabulary에 없습니다.`);
        return;
      }
      const v = vocabulary[id];
      if (v && v.surface && typeof q.prompt === "string" && !q.prompt.includes(v.surface)) {
        console.warn(
          `[validate] 문제 "${q.id}" prompt에 vocab "${id}" (surface: "${v.surface}")가 없습니다. explanation/choice 용도일 수 있습니다.`
        );
      }
    });
  });
}
