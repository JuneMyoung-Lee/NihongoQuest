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
  const choice = question.choices.find(
    (c) => c.id === question.correctChoiceId
  );
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
      console.warn(
        `[validate] 문제 ${q.id}의 correctChoiceId("${q.correctChoiceId}")가 choices에 없습니다.`
      );
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
        console.warn(
          `[validate] 스테이지 "${s.id}"의 questionId "${id}"가 questions에 없습니다.`
        );
        valid = false;
      }
    });
  });

  return valid;
}
