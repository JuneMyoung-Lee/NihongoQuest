# Battle Assets

이 폴더는 Phaser 배틀 씬에서 사용하는 2D 이미지/스프라이트 에셋을 보관합니다.

---

## 저작권 정책

**상용 게임(포켓몬, 드래곤퀘스트, 파이널판타지 등)의 에셋을 절대 사용하지 마십시오.**

허용되는 에셋:
- 직접 제작한 원본 이미지 / SVG
- CC0 (퍼블릭 도메인) 라이선스 에셋
- CC BY 라이선스 에셋 (출처 표기 필수)
- 구매 후 라이선스가 명확히 확인된 상용 에셋 (라이선스 파일 함께 보관)

**에셋을 추가할 때는 반드시 라이선스를 이 README에 기록하세요.**

---

## 폴더 구조

```
battle/
├── README.md          ← 이 파일
├── monsters/          ← 몬스터 이미지
├── players/           ← 플레이어 이미지
├── effects/           ← 이펙트 스프라이트
└── backgrounds/       ← 배경 이미지 (현재 Phaser Graphics로 대체 중)
```

---

## 파일 이름 규칙

- 소문자 + 하이픈 사용: `monster-fox-grammar.png`
- 스프라이트 시트: `monster-fox-grammar-sheet.png`
- 메타데이터 JSON (atlas): `monster-fox-grammar-atlas.json`
- placeholder는 `placeholder-` 접두사: `placeholder-fox.svg`

---

## battleAssets.js 등록 방법

`src/game/assets/battleAssets.js`에 에셋을 등록합니다.

### 단일 이미지 (PNG/SVG)

```js
foxGrammar: {
  key: "monster_fox_grammar",   // Phaser 텍스처 키 (고유해야 함)
  type: "image",
  emoji: "🦊",                  // 로드 실패 시 fallback
  label: "조사 여우",
  path: "/assets/battle/monsters/monster-fox-grammar.png",
}
```

### 스프라이트 시트

```js
foxGrammarAnimated: {
  key: "monster_fox_grammar_anim",
  type: "spritesheet",
  emoji: "🦊",
  label: "조사 여우 (애니)",
  path: "/assets/battle/monsters/monster-fox-grammar-sheet.png",
  frameWidth: 64,
  frameHeight: 64,
}
```

### Atlas (Texture Packer 등)

현재 지원되지 않음. 지원 추가 시 `BattleScene.preload()`에 `this.load.atlas()` 호출 추가.

---

## Sprite 추가 후 BattleScene 동작

1. `battleAssets.js`에 에셋 등록 (`type: "image"` 또는 `"spritesheet"`)
2. `BattleScene.preload()`가 `getPreloadList()`로 자동 감지해 로드
3. `_spawnActors()`에서 `resolveMonsterAsset()`/`resolvePlayerAsset()`이 에셋 타입 결정
4. `createActor()`에서 `scene.textures.exists(key)`가 true이면 Image/Sprite 사용
5. 로드 실패 또는 texture 없으면 emoji Text로 자동 fallback

---

## 현재 에셋 목록

| 파일 | 타입 | 용도 | 라이선스 |
|---|---|---|---|
| `monsters/placeholder-fox.svg` | SVG placeholder | 조사 여우 데모 | 자체 제작 (CC0) |

---

## 권장 스프라이트 사양

| 항목 | 권장값 |
|---|---|
| 몬스터 크기 | 64×64 px 이상 |
| 플레이어 크기 | 48×48 px 이상 |
| 포맷 | PNG (알파 채널 필수) 또는 SVG |
| 스프라이트 시트 프레임 | 64×64 px / 프레임 |
| 애니메이션 프레임 수 | idle 4프레임, attack 4프레임 |
