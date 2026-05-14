# 데이터 작성 가이드

이 문서는 `questions.js`, `stages.js`, `vocabulary.js`에 새 데이터를 추가하는 방법을 설명합니다.

---

## 1. 새 vocabulary 항목 추가

`src/data/vocabulary.js`에 추가합니다.

```js
// 키: 고유 id (영문 소문자, camelCase 권장)
shukudai: {
  id: "shukudai",           // 키와 동일하게 설정
  surface: "宿題",          // 실제 문장에서 사용하는 표기. 매칭 기준이 됨
  reading: "しゅくだい",
  meaning: "숙제",
  type: "noun",             // noun | verb | i_adj | na_adj | pronoun | proper_noun
  kanji: [
    {
      char: "宿",
      meaning: "숙소, 묵다",
      readingInWord: "しゅく",  // 이 단어 안에서의 발음
      onyomi: "シュク",
      kunyomi: "やど・やどる",
    },
    {
      char: "題",
      meaning: "제목, 문제",
      readingInWord: "だい",
      onyomi: "ダイ",
      kunyomi: "",
    },
  ],
},
```

### 규칙

- **surface는 prompt 안의 문자열과 정확히 일치해야 한다.**  
  예: prompt에 `宿題を出す`가 있으면 surface는 `宿題`이어야 하며, `宿 題`(공백 포함)이면 매칭되지 않는다.
- **같은 단어는 vocabulary.js에서 재사용한다.** 여러 문제에서 동일한 단어가 나와도 vocabulary 항목은 하나만 작성한다.
- **긴 단어를 우선 등록하는 것이 좋다.**  
  텍스트 매칭은 긴 surface 우선 방식으로 동작한다. `映画`와 `画` 모두 등록되어 있으면 `映画`가 먼저 매칭된다.
- kanji 배열이 없거나 비어 있어도 동작한다. (히라가나/가타카나 단어에는 빈 배열 또는 생략 가능)

---

## 2. 새 question 추가

`src/data/questions.js`에 추가합니다.

```js
{
  id: "q075",                 // 기존과 중복되지 않는 고유 id
  category: "particle",       // particle | conjugation | adjective | location | time | expression | conjunction | reading
  level: 2,                   // 1~5 (참고용)
  prompt: "빈칸에 알맞은 조사는?\n私は毎朝コーヒー（　）飲みます。",
  promptType: "text",
  choices: [
    { id: "a", text: "を" },
    { id: "b", text: "に" },
    { id: "c", text: "で" },
    { id: "d", text: "が" },
  ],
  correctChoiceId: "a",       // 반드시 choices 배열에 있는 id와 일치해야 함
  explanation: "「飲む」는 타동사이므로 목적격 조사 「を」를 씁니다.",
  vocabIds: ["watashi", "maiasa", "nomu"],  // vocabulary.js의 키 배열 (없으면 생략)
  tags: ["particle", "wo", "n4"],
},
```

### correctChoiceId 주의사항

- choices 배열에 존재하지 않는 id를 쓰면 `validateQuestions`가 경고를 출력한다.
- choices 내 id가 중복되면 정답 판정이 불안정해진다. `"a"`, `"b"`, `"c"`, `"d"` 4개를 유지한다.
- choices는 반드시 4개여야 한다.

### vocabIds 연결 방법

1. `vocabulary.js`에서 해당 단어의 키를 확인한다.
2. `vocabIds` 배열에 그 키를 추가한다.
3. **surface가 prompt 안에 없어도 앱은 죽지 않는다** — 단, 툴팁 강조가 작동하지 않는다. explanation이나 선택지에만 쓰이는 단어는 vocabIds에 포함해도 되지만, AnnotatedText에서는 매칭되지 않는다.
4. 앱 시작 시 `validateVocabulary`가 자동으로 검증하고 문제가 있으면 console.warn을 출력한다.

---

## 3. 새 stage 추가

`src/data/stages.js`에 추가합니다.

```js
{
  id: "stage_009",
  order: 9,
  title: "경어의 궁전",
  area: "경어 궁전",
  description: "敬語(けいご)... 상대에게 경의를 표하는 표현을 익혀라.",
  requiredStageId: "stage_008",       // null이면 처음부터 해금
  questionIds: ["q075", "q076", ...], // 후보 풀 전체 목록
  questionCount: 6,                   // 실제 출제 수 (null이면 전체 출제)
  difficulty: "N3",
  recommendedLevel: 7,
  monster: { name: "경어 도깨비", emoji: "👺", hp: 260, theme: "boss" },
  rewards: { exp: 220, gold: 110 },
},
```

### questionIds와 questionCount

- `questionIds`: 이 스테이지에서 출제될 **후보 풀** 전체 목록. 실제 출제 수보다 많게 유지하면 매 도전마다 다른 문제가 나온다.
- `questionCount`: 후보 풀에서 실제로 출제할 수. 생략하거나 0이면 후보 풀 전체를 출제한다.
- 예: `questionIds`에 10개, `questionCount: 6` → 매 도전마다 10개 중 6개 랜덤 출제.

---

## 4. 데이터 흐름 요약

```
stages.js (questionIds 후보 풀 + questionCount)
    ↓ getRandomQuestionsByStage()
questions.js (각 문제에 vocabIds 배열 포함)
    ↓ getVocabularyByIds()
vocabulary.js (surface, reading, meaning, kanji)
    ↓
AnnotatedText     → 문제 문장 안 단어 클릭 툴팁
VocabNotesPanel   → 답변 후 단어/한자 노트 표시
```

---

## 5. 검증

앱 시작 시 아래 함수들이 자동 실행되어 console에 경고를 출력합니다. 앱은 계속 동작합니다.

| 함수 | 검증 항목 |
|---|---|
| `validateQuestions` | 중복 id, choices 개수(4개), correctChoiceId 존재 여부 |
| `validateStages` | questionIds 참조 문제 존재 여부 |
| `validateVocabulary` | vocabIds → vocabulary 존재 여부, surface 비어있는지, vocab surface가 prompt에 없는지 |
