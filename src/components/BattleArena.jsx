import { useRef, useEffect } from "react";
import { AnimatePresence, motion } from "motion/react";
import BattleActor from "./BattleActor";

// ── Theme → visual palette ────────────────────────────────────────────────────
const THEME_PALETTE = {
  forest:  { sky1: "#0b2e17", sky2: "#05160c", ground: "#1a3a1f", accent: "#22c55e", mist: "rgba(34,197,94,0.07)"  },
  cave:    { sky1: "#1a0f08", sky2: "#0a0603", ground: "#2a1a0e", accent: "#a16207", mist: "rgba(120,113,108,0.1)" },
  mansion: { sky1: "#1a0533", sky2: "#0a0219", ground: "#220a42", accent: "#a855f7", mist: "rgba(168,85,247,0.08)" },
  tower:   { sky1: "#020d1f", sky2: "#01060e", ground: "#071633", accent: "#38bdf8", mist: "rgba(56,189,248,0.07)" },
  castle:  { sky1: "#1a1206", sky2: "#0d0902", ground: "#2d1f0a", accent: "#f59e0b", mist: "rgba(245,158,11,0.07)" },
  boss:    { sky1: "#280606", sky2: "#0f0202", ground: "#3d0808", accent: "#ef4444", mist: "rgba(239,68,68,0.12)"  },
  road:    { sky1: "#08091e", sky2: "#03030d", ground: "#12143a", accent: "#818cf8", mist: "rgba(129,140,248,0.08)"},
  valley:  { sky1: "#0c1218", sky2: "#05080c", ground: "#14202e", accent: "#94a3b8", mist: "rgba(100,116,139,0.08)"},
  default: { sky1: "#0a0a18", sky2: "#05050d", ground: "#12122a", accent: "#6366f1", mist: "rgba(99,102,241,0.08)" },
};

// ── Impact flash: brief screen flash when a hit lands ────────────────────────
function ImpactFlash({ event }) {
  const isDamage = event?.type === "damage";
  const color    = event?.source === "player" ? "rgba(168,85,247,0.25)" : "rgba(239,68,68,0.28)";
  return (
    <AnimatePresence>
      {isDamage && (
        <motion.div
          key={event.id}
          className="arena-impact-flash"
          style={{ background: color }}
          initial={{ opacity: 1 }}
          animate={{ opacity: 0 }}
          transition={{ duration: 0.3, ease: "easeOut" }}
        />
      )}
    </AnimatePresence>
  );
}

// ── Projectile effect ─────────────────────────────────────────────────────────
// Animated orb that flies from attacker to target
function ProjectileOrb({ event }) {
  if (event?.type !== "damage") return null;

  const fromPlayer = event.source === "player";
  const color      = fromPlayer ? "#a78bfa" : "#f87171";

  return (
    <AnimatePresence>
      <motion.div
        key={event.id}
        className="arena-projectile"
        style={{ background: color, boxShadow: `0 0 12px 4px ${color}` }}
        initial={{ left: fromPlayer ? "22%" : "78%", top: "50%", scale: 1, opacity: 1 }}
        animate={{ left: fromPlayer ? "78%" : "22%", top: "46%", scale: 0.4, opacity: 0 }}
        transition={{ duration: 0.28, ease: "easeIn" }}
      />
    </AnimatePresence>
  );
}

// ── Main arena ────────────────────────────────────────────────────────────────
export default function BattleArena({
  playerHp,
  playerMaxHp,
  monsterHp,
  monsterMaxHp,
  monsterDisplay,
  isTrial,
  playerAnimState,
  monsterAnimState,
  battleEvent,
  onPlayerAnimComplete,
  onMonsterAnimComplete,
  themeClass,
  monsterTheme,
}) {
  const pal = THEME_PALETTE[monsterTheme] || THEME_PALETTE.default;

  return (
    <div
      className={`battle-arena-v2 ${themeClass}`}
      style={{
        background: `linear-gradient(180deg, ${pal.sky1} 0%, ${pal.sky2} 100%)`,
        "--arena-accent": pal.accent,
        "--arena-mist":   pal.mist,
        "--arena-ground": pal.ground,
      }}
    >
      {/* Ambient mist layer */}
      <div className="arena-mist-layer" />

      {/* Impact flash */}
      <ImpactFlash event={battleEvent} />

      {/* Projectile */}
      <ProjectileOrb event={battleEvent} />

      {/* Ground platform */}
      <div className="arena-ground-strip" />

      {/* Characters — staggered: player bottom-left, monster top-right */}
      <div className="arena-chars-wrap">

        {/* Player — bottom-left */}
        <div className="arena-actor-slot arena-player-slot">
          <BattleActor
            isPlayer={true}
            name="플레이어"
            hp={playerHp}
            maxHp={playerMaxHp}
            animState={playerAnimState}
            onAnimComplete={onPlayerAnimComplete}
            battleEvent={battleEvent}
            monsterTheme={monsterTheme}
          />
        </div>

        {/* Monster — top-right */}
        <div className="arena-actor-slot arena-monster-slot">
          <BattleActor
            isPlayer={false}
            name={isTrial ? "문지기 스핑크스" : monsterDisplay.name}
            hp={monsterHp}
            maxHp={monsterMaxHp}
            animState={monsterAnimState}
            onAnimComplete={onMonsterAnimComplete}
            battleEvent={battleEvent}
            monsterTheme={monsterTheme}
          />
        </div>
      </div>
    </div>
  );
}
