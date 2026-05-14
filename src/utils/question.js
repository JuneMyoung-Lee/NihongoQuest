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

// 전투 시작용: 후보 풀에서 questionCount개 랜덤 추출 + choices 셔플.
// 원본 question 객체는 mutation하지 않음.
export function getRandomQuestionsByStage(stage, questions) {
  if (!stage || !stage.questionIds || !questions) return [];

  const questionMap = new Map(questions.map((q) => [q.id, q]));

  // 1. 후보 조회 (없는 ID는 경고 후 제외)
  const pool = stage.questionIds.reduce((acc, id) => {
    if (questionMap.has(id)) {
      acc.push(questionMap.get(id));
    } else {
      console.warn(`[question] 스테이지 "${stage.id}"에 존재하지 않는 문제 ID: ${id}`);
    }
    return acc;
  }, []);

  // 2. 풀 셔플
  const shuffledPool = shuffleArray(pool);

  // 3. questionCount개만큼 slice
  //    - questionCount 없거나 0 이하 → 전체 사용
  //    - questionCount > pool.length → 가능한 전체 사용
  const count =
    stage.questionCount && stage.questionCount > 0
      ? Math.min(stage.questionCount, shuffledPool.length)
      : shuffledPool.length;

  const selected = shuffledPool.slice(0, count);

  // 4. 각 문제의 choices도 셔플 (새 객체로 복사, 원본 mutation 없음)
  return selected.map((q) => ({
    ...q,
    choices: shuffleArray(q.choices),
  }));
}

// 도약 시험용: 후보 풀에서 최대 count개 랜덤 추출 + choices 셔플.
export function getTrialQuestionsByStage(stage, questions, count = 5) {
  if (!stage || !stage.questionIds || !questions) return [];

  const questionMap = new Map(questions.map((q) => [q.id, q]));

  const pool = stage.questionIds.reduce((acc, id) => {
    if (questionMap.has(id)) acc.push(questionMap.get(id));
    return acc;
  }, []);

  const selected = shuffleArray(pool).slice(0, count);

  return selected.map((q) => ({
    ...q,
    choices: shuffleArray(q.choices),
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

// vocabItems 내 kanji 배열을 모아 char 기준 중복 제거 후 반환.
export function getKanjiNotesFromVocabulary(vocabItems) {
  if (!Array.isArray(vocabItems) || vocabItems.length === 0) return [];
  const seen = new Set();
  return vocabItems.flatMap((item) => (Array.isArray(item.kanji) ? item.kanji : [])).filter((k) => {
    if (!k || !k.char) return false;
    if (seen.has(k.char)) return false;
    seen.add(k.char);
    return true;
  });
}

// 기존 코드와의 하위 호환 유지 (validate 등에서 사용)
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

export function validateStages(stages, questions) {
  if (!Array.isArray(stages)) {
    console.error("[validate] stages가 배열이 아닙니다.");
    return false;
  }
  const questionIds = new Set((questions || []).map((q) => q.id));
  let valid = true;
  stages.forEach((s) => {
    (s.questionIds || []).forEach((id) => {
      if (!questionIds.has(id)) {
        console.warn(`[validate] 스테이지 "${s.id}"의 questionId "${id}"가 questions에 없습니다.`);
        valid = false;
      }
    });
  });
  return valid;
}

// vocabulary 연결 검증. 앱을 죽이지 않고 console.warn만 사용.
export function validateVocabulary(questions, vocabulary) {
  if (!Array.isArray(questions) || !vocabulary || typeof vocabulary !== "object") return;

  const vocabKeys = new Set(Object.keys(vocabulary));

  // vocab 항목 자체 검증
  Object.values(vocabulary).forEach((v) => {
    if (!v || !v.id) return;
    if (!v.surface) {
      console.warn(`[validate] vocabulary "${v.id}"의 surface가 비어 있습니다.`);
    }
  });

  // question.vocabIds → vocabulary 연결 검증
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
