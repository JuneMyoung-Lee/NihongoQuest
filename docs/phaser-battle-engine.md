# Phaser 배틀 엔진 아키텍처

## 개요

React 기반 게임 로직은 그대로 유지하면서 Phaser 4를 배틀 화면의 **시각 연출 전용**으로 사용합니다.  
정답 판정, 점수 계산, localStorage 저장 등의 모든 게임 로직은 React가 담당합니다.

---

## 파일 구조

```
src/game/
├── EventBus.js                    # React ↔ Phaser pub/sub 버스
├── PhaserGame.jsx                 # Phaser.Game 생명주기 관리 (React 컴포넌트)
├── scenes/
│   └── BattleScene.js            # Phaser 씬: 6-layer 구조 + 모든 연출
└── systems/
    ├── battleSceneAdapter.js     # battleState → battleSnapshot 변환
    ├── battleEffects.js          # Actor 팩토리 + tween 이펙트 헬퍼 모음
    └── battleTheme.js            # 테마별 색상 팔레트

src/components/
└── BattleCanvasPanel.jsx         # React wrapper (lazy load + error boundary)
```

---

## 데이터 흐름

```
React (App.jsx)
  └─► BattleScreen.jsx
        │  battleState (React state)
        │  battleEvent (정답/오답 이벤트 객체)
        └─► BattleCanvasPanel.jsx
              │  createBattleSnapshot() → battleSnapshot
              └─► PhaserGame.jsx
                    │  EventBus.emit(BATTLE_UPDATE, snapshot)
                    │  EventBus.emit(BATTLE_EVENT, event)
                    │  EventBus.emit(BATTLE_THEME, theme)
                    └─► BattleScene.js
                          _onUpdate()  → HP 바 tween, 레이블 갱신
                          _onEvent()   → 이펙트 실행 (dedup 포함)
                          _onTheme()   → 배경/색상 재적용
```

---

## BattleScene 레이어 구조

```
depth 0 – bgLayer       : 배경 그라디언트 + 테마 장식 (Graphics)
depth 1 – groundLayer   : 발판 타원 (Graphics)
depth 2 – actorLayer    : 플레이어/몬스터 Container
depth 3 – effectLayer   : 투사체, 버스트, 오버레이
depth 4 – uiLayer       : (향후 UI 전용 요소)
depth 5 – floatLayer    : 부유 텍스트 (-데미지, +회복, HINT, CLEAR, FAILED)
```

모든 레이어 Container는 world position (0,0)에 배치되므로, 하위 오브젝트의 x/y = world 좌표.

---

## Actor 구조

`createActor(scene, config, parentLayer)` 반환 객체:

```js
{
  container,  // Phaser.GameObjects.Container  — 이동/scale/alpha 조작 대상
  shadow,     // Ellipse                       — 발 아래 그림자
  emojiText,  // Text                          — 캐릭터 이모지
  nameText,   // Text                          — 이름 라벨
  hpTrack,    // Rectangle                     — HP 바 배경
  hpBarFill,  // Rectangle (scaleX 0→1)        — HP 바 fill (tween 대상)
  hpText,     // Text                          — HP 숫자
}
```

### HP 바 tween 방식

`hpBarFill`은 전체 너비(HP_BAR_W=96px) Rectangle이고, `scaleX` 를 0~1 범위로 tween해 시각적 너비를 표현합니다.  
origin(0,0) + 좌측 끝 배치 → scaleX가 줄면 오른쪽에서 줄어드는 것처럼 보입니다.

---

## 지원하는 battleEvent type

| type | source/target | 연출 |
|---|---|---|
| `damage` | player → monster | 플레이어 돌진 + 보라 투사체 + 버스트 + 몬스터 흔들림 + 데미지 텍스트 |
| `damage` | monster → player | 몬스터 돌진 + 빨간 투사체 + 버스트 + 플레이어 흔들림 + 데미지 텍스트 |
| `heal` | — → player | 녹색 링 펄스 + 회복 텍스트 |
| `hint` | — | 중앙 스파클 + HINT 텍스트 |
| `clear` | — | 몬스터 fade+scale out + 컨페티 + CLEAR! 텍스트 |
| `fail` | — | 플레이어 dim + 화면 어두워짐 + FAILED 텍스트 |
| `reset` | — | lastEventId 초기화 + actor 정리 |
| *unknown* | — | `console.warn`만, 앱 죽지 않음 |

**중복 이벤트 방지**: `_lastEventId`로 같은 `event.id`가 두 번 들어오면 무시.  
**새 전투 감지**: `battleSessionId` 변경 시 자동으로 `_lastEventId` 초기화 + actor 재생성.

---

## 테마별 배경 장식 (`_drawDecorations`)

모두 `Phaser.GameObjects.Graphics` 로만 그립니다. 외부 이미지 없음.

| theme | 배경 그라디언트 | 장식 |
|---|---|---|
| `forest` | 짙은 초록 | 흩어진 잎 모양 타원 |
| `cave` | 어두운 갈색/회색 | 하단 삼각 바위 + 상단 종유석 |
| `mansion` | 짙은 보라/남색 | 유령 타원 + 창문 테두리 |
| `tower` | 파랑/어두운 청색 | 수직/수평 라인 격자 |
| `castle` | 남색/갈색 | 상단 성벽 총안 + 금색 테두리 |
| `boss` | 붉은 보라/검정 | 번개 지그재그 + 붉은 오라 원 |
| `road` | 보라/남색 | 원근법 수렴선 |
| `valley` | 어두운 붉은/회색 | 산 실루엣 삼각형 |
| `default` | 다크/라이트 모드 기본값 | 장식 없음 |

라이트 모드는 `battleTheme.js`의 `LIGHT_THEME` 색상이 적용됩니다.

---

## Reduced Motion 정책

`shouldReduceMotion()` (battleEffects.js) → `window.matchMedia("prefers-reduced-motion: reduce")`

| 동작 | 일반 | reduced |
|---|---|---|
| tween duration | 원본 ms | `min(ms, 50)` |
| camera shake | 활성 | 비활성 |
| 투사체 | 이동 | 즉시 onComplete 호출 |
| 버스트 파티클 | 활성 | 비활성 (`return` 즉시) |
| 컨페티 | 활성 | 비활성 |
| HP bar tween | 340ms | 50ms |
| 상태 변화 (HP 수치, 텍스트) | 항상 표시 | 항상 표시 |

CSS 에서도 `.battle-canvas-panel { display: none }` (App.css) 으로 추가 제어.

---

## EventBus 이벤트 목록

| 상수 | 방향 | 용도 |
|---|---|---|
| `BATTLE_INIT` | React → Phaser | 예약 |
| `BATTLE_UPDATE` | React → Phaser | battleSnapshot 전달 |
| `BATTLE_EVENT` | React → Phaser | 이펙트 트리거 |
| `BATTLE_THEME` | React → Phaser | 테마 변경 |
| `BATTLE_RESIZE` | React → Phaser | 캔버스 크기 변경 |
| `BATTLE_DESTROY` | React → Phaser | Phaser.Game 정리 요청 |
| `SCENE_READY` | Phaser → React | BattleScene 초기화 완료 |
| `ANIMATION_COMPLETE` | Phaser → React | 이벤트별 애니메이션 완료 |
| `SCENE_ERROR` | Phaser → React | 씬 오류 발생 |

---

## battleSnapshot 구조

```js
{
  battleSessionId: string,
  mode: "stage" | "trial",
  stageId: string | null,
  player:  { name, emoji, hp, maxHp },
  monster: { name, emoji, hp, maxHp, theme },
  rules:   { requiredCorrect, correctCount, wrongCount, passAccuracy }
}
```

---

## 중요 제약사항

- Phaser는 **정답 판정 금지** — 모든 게임 로직은 React에 있음
- Phaser는 **localStorage 접근 금지**
- Phaser는 **캔버스 클릭으로 정답 선택 불가**
- 저작권 있는 이미지/이름/에셋 사용 금지 (이모지 + Graphics만)
- TypeScript 사용 금지

---

## 결과 화면 전환 지연

`isFinished === true` 상태에서 "결과 보기" 클릭 시:
- 기본: **700ms** 지연 후 `onBattleEnd()` 호출
- `prefers-reduced-motion: reduce`: **80ms** 로 단축

---

## 빌드 특성

- `PhaserGame.jsx` 는 `React.lazy()` 로 동적 import → 별도 청크 분리 (`PhaserGame-*.js`, ~1.37MB gzip 357KB)
- `BattleCanvasPanel` = lazy + Suspense + ErrorBoundary 3중 안전망
- `prefers-reduced-motion` 시 CSS로 패널 숨김 + Phaser 연산 최소화

---

## Asset Pipeline

### 파일 구조

```
public/assets/battle/
├── README.md           ← 저작권 정책 + 에셋 추가 방법
├── monsters/           ← 몬스터 이미지 (현재: placeholder-fox.svg)
├── players/            ← 플레이어 이미지
├── effects/            ← 이펙트 스프라이트
└── backgrounds/        ← 배경 이미지

src/game/
├── assets/
│   └── battleAssets.js     ← 에셋 매니페스트 (key, type, emoji, path 등)
└── systems/
    └── assetResolver.js    ← 에셋 조회 + fallback 결정
```

### 에셋 타입

| type | 렌더링 | preload 필요 | path 필요 |
|---|---|---|---|
| `emoji` | Phaser Text | ✗ | ✗ |
| `graphics` | Phaser Graphics (이펙트) | ✗ | ✗ |
| `image` | Phaser Image | ✓ | ✓ |
| `spritesheet` | Phaser Sprite | ✓ | ✓ + frameWidth/Height |

### 에셋 결정 흐름

```
battleSnapshot (monster.assetKey / player.avatarKey)
  └─► resolveMonsterAsset() / resolvePlayerAsset()
        │  assetKey 있음 → resolveBattleAsset(key) → battleAssets 탐색
        │  없음 / key 불명 → getFallbackEmojiAsset(emoji, label)
        │  image/spritesheet + path 없음 → emoji fallback
        └─► asset { key, type, emoji, path? }

BattleScene._spawnActors()
  └─► createActor(..., { assetType, assetKey })
        │  type=image/spritesheet + scene.textures.exists(key) → Image/Sprite
        └─► 그 외 또는 로드 실패 → scene.add.text(emoji) fallback
```

### 저작권 정책

**상용 게임 에셋(포켓몬, DQ, FF 등) 절대 금지.**
허용: 자체 제작, CC0, CC BY (출처 표기), 라이선스 확인된 구매 에셋.
상세: `public/assets/battle/README.md`

### 스프라이트 에셋 추가 방법

1. `public/assets/battle/monsters/monster-fox-grammar.png` 추가
2. `battleAssets.js`에서 해당 항목의 `type: "image"`, `path` 지정
3. 빌드/재실행 → `BattleScene.preload()`가 `getPreloadList()`로 자동 감지 후 로드
4. 로드 성공 시 Sprite, 실패 시 emoji로 자동 fallback

### player.avatarKey / monster.assetKey 데이터 경로

- `player.avatarKey`: `storage.js` defaultPlayer → `normalizePlayer()`에서 기본값 보정
- `stage.monster.assetKey`: `stages.js` 전 23개 스테이지에 등록
- 시험 몬스터: `battleSceneAdapter.js`의 isTrial 분기에 하드코딩
- `battleSnapshot`을 통해 PhaserGame → BattleScene으로 전달

### 현재 상태 (v1)

- 모든 에셋 기본값: `type: "emoji"` (이모지 Text로 표시)
- `monster_fox_grammar`만 `type: "image"` + SVG placeholder — 시스템 동작 검증 데모
- preload → texture miss → emoji fallback 경로가 완전히 구현됨
- React 게임 로직, EventBus 구조, BattleCanvasPanel은 변경 없이 유지됨
