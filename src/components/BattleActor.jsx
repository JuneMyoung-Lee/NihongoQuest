import { motion } from "motion/react";
import ProgressBar from "./ProgressBar";
import FloatingBattleText from "./FloatingBattleText";

// player: attacks right (+x), gets hit shakes left-first
// monster: attacks left (-x), gets hit shakes right-first
const PLAYER_VARIANTS = {
  idle:   { x: 0, scale: 1, filter: "brightness(1)" },
  attack: { x: [0, 26, 10, 0], transition: { duration: 0.36, ease: "easeOut", times: [0, 0.42, 0.7, 1] } },
  hit:    { x: [0, -11, 8, -5, 3, 0], filter: ["brightness(1)", "brightness(2)", "brightness(1.4)", "brightness(1)"],
            transition: { duration: 0.46, times: [0, 0.12, 0.4, 1], delay: 0.16 } },
  heal:   { scale: [1, 1.12, 1], filter: ["brightness(1)", "brightness(1.7)", "brightness(1)"],
            transition: { duration: 0.5, ease: "easeInOut" } },
};

const MONSTER_VARIANTS = {
  idle:   { x: 0, scale: 1, filter: "brightness(1)" },
  attack: { x: [0, -26, -10, 0], transition: { duration: 0.36, ease: "easeOut", times: [0, 0.42, 0.7, 1] } },
  hit:    { x: [0, 11, -8, 5, -3, 0], filter: ["brightness(1)", "brightness(2)", "brightness(1.4)", "brightness(1)"],
            transition: { duration: 0.46, times: [0, 0.12, 0.4, 1], delay: 0.16 } },
};

export default function BattleActor({ emoji, name, hp, maxHp, isPlayer, animState = "idle", onAnimComplete, battleEvent }) {
  const variants = isPlayer ? PLAYER_VARIANTS : MONSTER_VARIANTS;
  const hpColorClass = isPlayer ? "player-hp-bar" : "monster-hp-bar";

  return (
    <div className={`battle-actor ${isPlayer ? "actor-player" : "actor-monster"}`}>
      <div className="actor-info">
        <span className="actor-name">{name}</span>
        <span className="actor-hp-num">{hp} / {maxHp}</span>
      </div>
      <ProgressBar current={hp} max={maxHp} colorClass={hpColorClass} hpColors={isPlayer} />

      <div className="actor-char-wrap">
        <FloatingBattleText event={battleEvent} target={isPlayer ? "player" : "monster"} />
        <motion.div
          className={`actor-emoji ${!isPlayer ? "actor-emoji-monster" : ""}`}
          variants={variants}
          animate={animState}
          onAnimationComplete={(def) => {
            if (def !== "idle") onAnimComplete?.();
          }}
        >
          {emoji}
        </motion.div>
      </div>
    </div>
  );
}
