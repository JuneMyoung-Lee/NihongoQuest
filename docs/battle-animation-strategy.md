# 배틀 애니메이션 전략

## 현재 구현 방식

**React + Vite + Motion for React (CSS 보조)**

- 캐릭터 등장/공격/피격/회복 애니메이션: `motion.div` variants + `onAnimationComplete` 콜백으로 시퀀스 제어
- Floating 데미지/회복 텍스트: `AnimatePresence` + `motion.div` (key remount 방식으로 같은 이벤트 반복 재생 가능)
- HP 바 감소 애니메이션: CSS `transition: width 0.45s ease, background 0.4s ease`
- 선택지 정답/오답 표시: CSS class 방식 (`correct`, `wrong`)
- 배틀 로그: React state 최근 3개 유지, CSS transition

### Motion 도입 이유

| 기능 | CSS only | Motion |
|---|---|---|
| Floating text 자연스러운 enter/exit | `key` remount + `animation-fill-mode: forwards` 필요 | `AnimatePresence` + `initial/animate` 로 간단 |
| 공격 시퀀스 타이밍 (공격 → 피격 딜레이) | `animation-delay` 또는 JS setTimeout 필요 | variant `transition.delay` 로 선언적 처리 |
| 회복 glow 효과 | `filter` keyframe 추가 필요 | variant에 `filter` 포함 |
| 상태 복귀 (공격 완료 후 idle) | `onAnimationEnd` 이벤트 수동 처리 | `onAnimationComplete` 콜백 |

---

## A. CSS only

**장점**
- 패키지 추가 없음
- 현재 구조와 가장 안전
- 가벼움 (0KB 추가)

**단점**
- 복잡한 타이밍 제어가 어려움 (공격 → 피격 순서 제어에 setTimeout 필요)
- 같은 animation이 이미 재생 중일 때 재트리거가 어려움 (key remount 필요)
- `AnimatePresence` 없이 exit 애니메이션 구현이 복잡

**결론**: 현재 기능 수준에서는 가능하지만 "포켓몬식 배틀 느낌"에는 한계가 있음

---

## B. Motion for React (현재 선택)

**장점**
- `motion.div` + variants로 공격/피격/회복 애니메이션 선언적 관리
- `AnimatePresence`로 floating text 자연스러운 등장/퇴장
- `transition.delay`로 시퀀스 타이밍 제어
- `onAnimationComplete`로 상태 복귀 처리
- 현재 React 컴포넌트 구조를 크게 바꾸지 않아도 됨
- 패키지 크기: ~30KB gzip (framer-motion의 경량 버전)

**단점**
- 패키지 추가 필요
- 너무 복잡한 게임 루프(스프라이트 시트, 파티클, 카메라 흔들림)에는 한계
- canvas 기반 효과 없음

**결론**: 이번 작업에서 채택. React 컴포넌트 구조를 유지하면서 배틀 느낌을 크게 개선 가능

---

## C. Phaser 또는 PixiJS

**장점**
- 진짜 2D 배틀 씬, 스프라이트, 카메라 흔들림, 이펙트 구현 가능
- 장기적으로 게임성이 강한 방향
- 파티클 이펙트, 스프라이트 애니메이션, 셰이더 가능

**단점**
- 현재 React 앱 구조와 분리 필요
- 전투 화면을 캔버스 기반으로 재설계해야 함
- 학습 UI(선택지, 문제 텍스트)와 게임 씬 간 상태 동기화 비용이 큼
- 지금 단계에서는 과한 리팩토링 가능성 있음

---

## Phaser/Pixi 전환 계획 (향후 실험용)

### 현재 React + Motion으로 가능한 범위
- 캐릭터 위치 이동, 흔들림, 크기 변화 (translate, rotate, scale)
- floating damage text enter/exit
- HP bar 부드러운 감소
- 간단한 filter 효과 (brightness, opacity)
- 배틀 로그 애니메이션

### Phaser/Pixi로 전환하면 좋아지는 점
- 스프라이트 시트 기반 frame-by-frame 캐릭터 애니메이션
- 파티클 이펙트 (slash, impact, fire, lightning)
- 카메라 흔들림 (screen shake)
- 배경 스크롤, 평행이동 효과
- 진짜 "공격 판정" 타이밍 시각화
- 씬 전환 효과 (fade, wipe)

### 전환 시 필요한 구조

```
BattleCanvas.jsx        ← Phaser/Pixi 캔버스를 렌더하는 React 컴포넌트
  ├── game/Scene.js     ← Phaser Scene 또는 Pixi Application
  ├── game/PlayerActor.js  ← 플레이어 스프라이트 컨트롤러
  ├── game/MonsterActor.js ← 몬스터 스프라이트 컨트롤러
  └── game/EventBus.js  ← React ↔ Game scene 통신 버스
```

**React UI ↔ Game Scene 상태 동기화 방법**
```js
// EventBus: simple pub/sub
const EventBus = new EventEmitter();

// React에서 이벤트 발행
EventBus.emit("battle:correct", { damage: 34 });

// Phaser Scene에서 구독
EventBus.on("battle:correct", ({ damage }) => {
  this.playerSprite.play("attack");
  setTimeout(() => this.monsterSprite.play("hit"), 200);
  this.showDamageText(damage);
});
```

**Asset pipeline**
- 스프라이트 시트: `/public/sprites/player.png` + `.json` (Aseprite 또는 TexturePacker 포맷)
- 각 몬스터별 sprite: `/public/sprites/monsters/{id}.png`
- 이펙트: `/public/sprites/effects/slash.png`, `impact.png`

**현재 당장 Phaser/Pixi로 가지 않는 이유**
1. 현재 핵심 가치는 일본어 학습 콘텐츠 — 배틀 연출은 "학습 동기부여" 수준이면 충분
2. React 컴포넌트 기반 UI(문제 텍스트, 선택지, 어노테이션)를 캔버스와 연동하는 비용이 큼
3. Motion으로 70~80% 수준의 배틀 느낌은 달성 가능
4. 스프라이트/asset 제작 리소스 필요

### 최소 PoC 계획 (나중에)

1. `feature/phaser-battle` 브랜치 생성
2. `npm install phaser` 후 `BattleCanvas.jsx` 단독 파일 작성
3. 현재 BattleScreen 로직과 무관하게 캔버스만 테스트
4. EventBus로 `battle:attack`, `battle:hit`, `battle:heal` 이벤트 통신 확인
5. 동작 확인 후 BattleScreen에 `<BattleCanvas>` 컴포넌트를 점진적으로 통합
