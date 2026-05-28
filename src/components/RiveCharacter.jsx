import { useEffect, useRef } from "react";
import { useRive, Layout, Fit, Alignment } from "@rive-app/react-canvas";

// Vite base URL (e.g. "/NihongoQuest/") — ensures correct path in production
const BASE = import.meta.env.BASE_URL.replace(/\/$/, "");

// ── Character adapters ────────────────────────────────────────────────────────
// Each adapter maps our battle events (attack/hit/die/heal) to
// the specific Rive state machine inputs in each .riv file.

// Player: goblin file with Direction=2 (face right toward monster)
// CSS class "rive-player-tint" applies a blue hue-rotate so it looks like
// a hero character rather than the same green goblin enemy.
const PLAYER_ADAPTER = {
  src: `${BASE}/rive/goblin.riv`,
  artboard: "goblin solos",
  setup(inp) {
    // Direction 2 = face right (toward the monster on the right)
    if (inp.Direction) inp.Direction.value = 2;
  },
  fire(state, inp) {
    if (state === "attack") inp.attack?.fire();
    if (state === "die")    inp.dead?.fire();
  },
};

const GOBLIN_ADAPTER = {
  src: `${BASE}/rive/goblin.riv`,
  artboard: "goblin solos",
  setup(inp) {
    // Direction 4 = face left (toward player on left side)
    if (inp.Direction) inp.Direction.value = 4;
  },
  fire(state, inp) {
    if (state === "attack") inp.attack?.fire();
    if (state === "die")    inp.dead?.fire();
  },
};

const DEATH_KNIGHT_ADAPTER = {
  src: `${BASE}/rive/death_knight.riv`,
  artboard: null,
  setup(inp) {
    // Try common direction/facing inputs
    if (inp.Direction) inp.Direction.value = 4;
    if (inp.FaceLeft)  inp.FaceLeft.value = true;
  },
  fire(state, inp) {
    // Try all common naming conventions since we don't have the SM spec
    if (state === "attack") {
      inp.attack?.fire();
      inp.Attack?.fire();
      inp.atk?.fire();
    }
    if (state === "die") {
      inp.dead?.fire();
      inp.Dead?.fire();
      inp.death?.fire();
      inp.Death?.fire();
      if (inp.IsDead  != null) inp.IsDead.value  = true;
      if (inp.isDead  != null) inp.isDead.value  = true;
    }
  },
};

export function getCharacterAdapter(isPlayer, monsterTheme) {
  if (isPlayer) return PLAYER_ADAPTER;
  const bossTheme = monsterTheme === "boss" || monsterTheme === "castle";
  return bossTheme ? DEATH_KNIGHT_ADAPTER : GOBLIN_ADAPTER;
}

// ── Component ─────────────────────────────────────────────────────────────────

export default function RiveCharacter({
  adapter,
  animState = "idle",
  className = "",
}) {
  const inputsRef   = useRef({});
  const smReadyRef  = useRef(false);
  const pendingRef  = useRef(null); // anim queued while SM loads

  const { RiveComponent, rive } = useRive({
    src: adapter.src,
    artboard: adapter.artboard || undefined,
    layout: new Layout({ fit: Fit.Contain, alignment: Alignment.BottomCenter }),
    autoplay: true,
  });

  // Once Rive instance is available, discover & activate state machine
  useEffect(() => {
    if (!rive) return;
    const smNames = rive.stateMachineNames;
    if (!smNames?.length) return;

    const smName = smNames[0];
    try {
      rive.play(smName);

      const inputs = {};
      (rive.stateMachineInputs(smName) || []).forEach((inp) => {
        inputs[inp.name] = inp;
      });
      inputsRef.current = inputs;
      adapter.setup?.(inputs);
      smReadyRef.current = true;

      // Fire any animation that was queued before SM was ready
      if (pendingRef.current) {
        adapter.fire?.(pendingRef.current, inputs);
        pendingRef.current = null;
      }
    } catch (e) {
      console.warn("[RiveCharacter] state machine setup error:", e);
    }
  }, [rive, adapter]);

  // Translate animState → Rive inputs
  useEffect(() => {
    if (animState === "idle") return;
    if (!smReadyRef.current) {
      pendingRef.current = animState;
      return;
    }
    try {
      adapter.fire?.(animState, inputsRef.current);
    } catch (e) {
      console.warn("[RiveCharacter] anim fire error:", e);
    }
  }, [animState, adapter]);

  return (
    <div className={`rive-char-canvas ${className}`}>
      <RiveComponent />
    </div>
  );
}
