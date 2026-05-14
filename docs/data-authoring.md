# 데이터 작성 가이드

이 문서는 `questions.js`, `stages.js`, `vocabulary.js`에 새 데이터를 추가하는 방법을 설명합니다.

---

## 1. 새 vocabulary 항목 추가

`src/data/vocabulary.js`에 추가합니다.

```js
// 키: 고유 id (영문 소문자, camelCase 권장)
eiga: {
  id: "eiga",
  surface: "映画",       // 문제 문장에 실제로 등장하는 문자열
  reading: "えいが",     // 단어 전체 발음
  meaning: "영화",       // 문맥상 자연스러운 한국어 뜻
  type: "noun",          // noun | verb | i_adj | na_adj | pronoun | proper_noun | expression | conjunction | adverb (선택)
},
```

### 핵심 규칙

- **surface는 prompt 안의 문자열과 정확히 일치해야 한다.**  
  예: prompt에 `映画を見ます`가 있으면 surface는 `映画`이어야 함.
- **reading은 단어 전체 발음을 히라가나로 적는다.**  
  `映画` → `えいが`
- **meaning은 문맥상 자연스러운 한국어로 적는다.**
- **개별 한자 정보(kanji 필드)는 필수가 아니다.** 넣지 않아도 된다.
- **같은 단어는 vocabulary.js에서 재사용한다.** 여러 문제에서 같은 단어가 나와도 항목은 하나만.
- **긴 단어를 먼저 등록하는 것이 좋다.**  
  텍스트 매칭은 긴 surface 우선 방식으로 동작한다. `映画`와 `画` 모두 등록되면 `映画`가 먼저 매칭된다.

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
3. **surface가 prompt 안에 없어도 앱은 죽지 않는다** — 단, 클릭 툴팁 강조가 작동하지 않는다. 해설이나 선택지에만 쓰이는 단어도 vocabIds에 포함해서 단어 노트에 표시할 수 있다.
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

- `questionIds`: 이 스테이지에서 출제될 **후보 풀** 전체 목록.
- `questionCount`: 후보 풀에서 실제로 출제할 수. 생략하거나 0이면 후보 풀 전체를 출제한다.
- 예: `questionIds`에 10개, `questionCount: 6` → 매 도전마다 10개 중 6개 랜덤 출제.

---

## 4. 단어 노트 표시 방식

답변 후 문제 화면에 **단어 노트**가 표시된다.

```
[단어 노트]

映画  えいが  영화  명사
昨日  きのう  어제  명사
勉強  べんきょう  공부  명사
```

- `surface` / `reading` / `meaning` 순서로 한 줄에 표시된다.
- `type` 필드가 있으면 품사가 작게 표시된다.
- 개별 한자 정보는 표시되지 않는다.

문제 문장 안 밑줄 단어를 탭하면 **단어 카드**가 인라인으로 열린다.

```
映画
えいが
영화
명사
```

---

## 5. 데이터 흐름 요약

```
stages.js (questionIds 후보 풀 + questionCount)
    ↓ getRandomQuestionsByStage()
questions.js (각 문제에 vocabIds 배열 포함)
    ↓ getVocabularyByIds()
vocabulary.js (surface, reading, meaning, type)
    ↓
AnnotatedText     → 문제 문장 안 단어 클릭 → 단어 카드
VocabNotesPanel   → 답변 후 단어 노트 표시
```

---

## 6. 검증

앱 시작 시 아래 함수들이 자동 실행되어 console에 경고를 출력합니다. 앱은 계속 동작합니다.

| 함수 | 검증 항목 |
|---|---|
| `validateQuestions` | 중복 id, choices 개수(4개), correctChoiceId 존재 여부 |
| `validateStages` | questionIds 참조 문제 존재 여부 |
| `validateVocabulary` | vocabIds → vocabulary 존재 여부, surface 비어있는지, vocab surface가 prompt에 없는지 |
