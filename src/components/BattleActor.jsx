import { motion } from "motion/react";
import ProgressBar from "./ProgressBar";
import FloatingBattleText from "./FloatingBattleText";
import RiveCharacter, { getCharacterAdapter } from "./RiveCharacter";

// ── Motion variants ───────────────────────────────────────────────────────────
// The Framer Motion wrapper handles physical movement (lunge / shake).
// Rive handles internal character animation (attack frames, hit frames, etc.)

const PLAYER_VARIANTS = {
  idle:   { x: 0, scale: 1 },
  attack: {
    x: [0, 32, 14, 0],
    transition: { duration: 0.38, ease: "easeOut", times: [0, 0.38, 0.68, 1] },
  },
  hit: {
    x: [0, -14, 10, -6, 4, 0],
    transition: { duration: 0.48, times: [0, 0.1, 0.3, 0.55, 0.8, 1] },
  },
  heal: {
    scale: [1, 1.1, 1],
    transition: { duration: 0.5, ease: "easeInOut" },
  },
};

const MONSTER_VARIANTS = {
  idle:   { x: 0, scale: 1, opacity: 1 },
  attack: {
    x: [0, -32, -14, 0],
    transition: { duration: 0.38, ease: "easeOut", times: [0, 0.38, 0.68, 1] },
  },
  hit: {
    x: [0, 14, -10, 6, -4, 0],
    transition: { duration: 0.48, times: [0, 0.1, 0.3, 0.55, 0.8, 1] },
  },
  die: {
    scale: [1, 1.12, 0],
    opacity: [1, 0.7, 0],
    transition: { duration: 0.55, ease: "easeIn", times: [0, 0.3, 1] },
  },
};

// ── Component ─────────────────────────────────────────────────────────────────
export default function BattleActor({
  isPlayer,
  name,
  hp,
  maxHp,
  animState = "idle",
  onAnimComplete,
  battleEvent,
  monsterTheme,
}) {
  const variants     = isPlayer ? PLAYER_VARIANTS : MONSTER_VARIANTS;
  const hpColorClass = isPlayer ? "player-hp-bar" : "monster-hp-bar";
  const adapter      = getCharacterAdapter(isPlayer, monsterTheme);

  return (
    <div className={`battle-actor ${!isPlayer ? "actor-monster" : ""}`}>
      {/* HP info */}
      <div className="actor-info">
        <span className="actor-name">{name}</span>
        <span className="actor-hp-num">{hp} / {maxHp}</span>
      </div>

      {/* HP bar */}
      <ProgressBar current={hp} max={maxHp} colorClass={hpColorClass} hpColors={isPlayer} />

      {/* Character visual */}
      <div className="actor-char-wrap">
        <FloatingBattleText event={battleEvent} target={isPlayer ? "player" : "monster"} />
        <motion.div
          className={`actor-rive-wrap ${!isPlayer ? "actor-rive-monster" : ""}`}
          variants={variants}
          animate={animState}
          onAnimationComplete={(def) => {
            if (def !== "idle") onAnimComplete?.();
          }}
        >
          <RiveCharacter
            adapter={adapter}
            animState={animState}
            className={isPlayer ? "rive-player-tint" : ""}
          />
        </motion.div>
      </div>
    </div>
  );
}
