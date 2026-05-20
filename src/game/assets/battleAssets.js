/**
 * battleAssets.js — 배틀 씬 에셋 매니페스트
 *
 * type 종류:
 *   "emoji"       — Phaser Text 오브젝트로 이모지 렌더링 (현재 기본값)
 *   "image"       — Phaser Image. path 필수. preload에서 this.load.image()
 *   "spritesheet" — Phaser Sprite. path, frameWidth, frameHeight 필수
 *   "graphics"    — Phaser Graphics로 직접 그림 (이펙트용)
 *
 * image/spritesheet 타입은 path가 없으면 자동으로 emoji fallback.
 * 에셋 추가 방법은 public/assets/battle/README.md 참고.
 */

export const battleAssets = {
  // ── 플레이어 ──────────────────────────────────────────────────────
  players: {
    defaultMage: {
      key: "player_default_mage",
      type: "emoji",
      emoji: "🧙",
      label: "견습 마법사",
    },
    // 추후 예시 (이미지 타입):
    // heroKnight: {
    //   key: "player_hero_knight",
    //   type: "image",
    //   emoji: "⚔️",
    //   label: "기사",
    //   path: "/assets/battle/players/hero-knight.png",
    // },
  },

  // ── 몬스터 ──────────────────────────────────────────────────────────
  monsters: {
    raccoonSentence: {
      key: "monster_raccoon_sentence",
      type: "emoji",
      emoji: "🦝",
      label: "문장 너구리",
    },

    // placeholder SVG 예시 — 실제 이미지 교체 시 type을 "image"로 변경하고 path 추가
    foxGrammar: {
      key: "monster_fox_grammar",
      type: "image",
      emoji: "🦊",
      label: "조사 여우",
      path: "/assets/battle/monsters/placeholder-fox.svg",
    },

    wolfConjugation: {
      key: "monster_wolf_conjugation",
      type: "emoji",
      emoji: "🐺",
      label: "활용 늑대",
    },
    ghostAdjective: {
      key: "monster_ghost_adjective",
      type: "emoji",
      emoji: "👻",
      label: "형용사 유령",
    },
    golemSpacetime: {
      key: "monster_golem_spacetime",
      type: "emoji",
      emoji: "🗿",
      label: "시공 골렘",
    },
    knightRules: {
      key: "monster_knight_rules",
      type: "emoji",
      emoji: "🛡️",
      label: "규칙 기사",
    },
    crowMemory: {
      key: "monster_crow_memory",
      type: "emoji",
      emoji: "🐦‍⬛",
      label: "기억 까마귀",
    },
    snakeConnector: {
      key: "monster_snake_connector",
      type: "emoji",
      emoji: "🐍",
      label: "접속 뱀",
    },
    dragonReading: {
      key: "monster_dragon_reading",
      type: "emoji",
      emoji: "🐉",
      label: "독해 드래곤",
    },
    chimeraGrammar: {
      key: "monster_chimera_grammar",
      type: "emoji",
      emoji: "🧬",
      label: "문법 키메라",
    },
    golemLogic: {
      key: "monster_golem_logic",
      type: "emoji",
      emoji: "⚙️",
      label: "논리 골렘",
    },
    dragonAbyss: {
      key: "monster_dragon_abyss",
      type: "emoji",
      emoji: "🐉",
      label: "심연 용",
    },
    bossReading: {
      key: "monster_boss_reading",
      type: "emoji",
      emoji: "👑",
      label: "독해 마왕",
    },
    raccoonVerb: {
      key: "monster_raccoon_verb",
      type: "emoji",
      emoji: "🦝",
      label: "동사 너구리",
    },
    owlTime: {
      key: "monster_owl_time",
      type: "emoji",
      emoji: "🦉",
      label: "시간 부엉이",
    },
    lionCompare: {
      key: "monster_lion_compare",
      type: "emoji",
      emoji: "🦁",
      label: "비교 사자",
    },
    knightObligation: {
      key: "monster_knight_obligation",
      type: "emoji",
      emoji: "🛡️",
      label: "의무 기사",
    },
    spiderConditional: {
      key: "monster_spider_conditional",
      type: "emoji",
      emoji: "🕷️",
      label: "조건 거미",
    },
    foxHaze: {
      key: "monster_fox_haze",
      type: "emoji",
      emoji: "🦊",
      label: "안개 여우",
    },
    chimeraPerspective: {
      key: "monster_chimera_perspective",
      type: "emoji",
      emoji: "🧬",
      label: "관점 키메라",
    },
    golemCausality: {
      key: "monster_golem_causality",
      type: "emoji",
      emoji: "🗿",
      label: "인과 골렘",
    },
    dragonDeepAbyss: {
      key: "monster_dragon_deepabyss",
      type: "emoji",
      emoji: "🐉",
      label: "심연의 용",
    },
    bossContext: {
      key: "monster_boss_context",
      type: "emoji",
      emoji: "👑",
      label: "문맥 마왕",
    },
    sphinxTrial: {
      key: "monster_sphinx_trial",
      type: "emoji",
      emoji: "🦁",
      label: "문지기 스핑크스",
    },
  },

  // ── 이펙트 (graphics 타입 — preload 불필요) ──────────────────────
  effects: {
    slashBasic: {
      key: "effect_slash_basic",
      type: "graphics",
      label: "기본 슬래시",
    },
    orbPurple: {
      key: "effect_orb_purple",
      type: "graphics",
      label: "보라색 오브",
    },
    orbRed: {
      key: "effect_orb_red",
      type: "graphics",
      label: "빨간색 오브",
    },
  },
};
