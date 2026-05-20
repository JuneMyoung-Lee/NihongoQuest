// ── Reduced motion ──────────────────────────────────────────────────────────
export function shouldReduceMotion() {
  try { return window.matchMedia("(prefers-reduced-motion: reduce)").matches; }
  catch (_) { return false; }
}

/** Clamps animation duration to 50ms when reduced motion is active */
export function dur(ms) {
  return shouldReduceMotion() ? Math.min(ms, 50) : ms;
}

// ── HP bar helpers ───────────────────────────────────────────────────────────
export const HP_BAR_W = 108;
export const HP_BAR_H = 9;

export function hpColor(ratio, colors) {
  if (ratio > 0.5) return colors.hpGood;
  if (ratio > 0.25) return colors.hpWarn;
  return colors.hpDanger;
}

// ── Actor factory ────────────────────────────────────────────────────────────
/**
 * createActor(scene, config, parentLayer)
 * Returns { container, shadow, emojiText, nameText, hpTrack, hpBarFill, hpText }
 *
 * HP bar uses scaleX on hpBarFill (full-width Rectangle) so it can be tweened.
 * The fill is positioned at the left edge of the track (origin 0,0).
 */
export function createActor(scene, config, parentLayer) {
  const { emoji, name, hp, maxHp, isMonster, colors, assetType, assetKey } = config;

  const safeHp = Math.max(0, hp ?? 0);
  const safeMax = Math.max(1, maxHp ?? 100);
  const ratio = Math.min(1, safeHp / safeMax);

  const container = scene.add.container(0, 0);

  // Shadow
  const shadow = scene.add.ellipse(0, 4, isMonster ? 60 : 50, 12, 0x000000, 0.25);

  // Character: image/sprite if asset loaded, otherwise emoji text fallback
  let emojiText;
  const useSprite =
    (assetType === "image" || assetType === "spritesheet") &&
    assetKey &&
    scene.textures.exists(assetKey);

  if (useSprite) {
    try {
      emojiText =
        assetType === "spritesheet"
          ? scene.add.sprite(0, 0, assetKey, 0)
          : scene.add.image(0, 0, assetKey);
      const targetH = isMonster ? 56 : 46;
      const h = emojiText.height || 64;
      emojiText.setScale(targetH / h);
      emojiText.setOrigin(0.5, 1);
    } catch (_) {
      emojiText = null;
    }
  }

  if (!emojiText) {
    emojiText = scene.add.text(0, 0, emoji || (isMonster ? "👾" : "🧙"), {
      fontSize: isMonster ? "52px" : "42px",
    }).setOrigin(0.5, 1);
  }

  // Name label
  const nameText = scene.add.text(0, 8, name || "", {
    fontSize: "13px",
    fill: colors.nameFill,
    fontStyle: "bold",
    stroke: colors.textStroke || "#000000",
    strokeThickness: colors.strokeWeight ?? 3,
  }).setOrigin(0.5, 0);

  // HP bar track (background)
  const hpTrack = scene.add.rectangle(0, 26, HP_BAR_W, HP_BAR_H, colors.hpTrack, 0.85)
    .setOrigin(0.5, 0);

  // HP bar fill: anchored at left edge, scaleX drives the visual width
  const hpBarFill = scene.add.rectangle(
    -(HP_BAR_W / 2), 26, HP_BAR_W, HP_BAR_H,
    hpColor(ratio, colors)
  ).setOrigin(0, 0);
  hpBarFill.scaleX = ratio;

  // HP numbers
  const hpText = scene.add.text(0, 38, `${safeHp}/${safeMax}`, {
    fontSize: "11px",
    fill: colors.hpNumFill,
    stroke: colors.textStroke || "#000000",
    strokeThickness: (colors.strokeWeight ?? 3) - 1,
  }).setOrigin(0.5, 0);

  container.add([shadow, emojiText, nameText, hpTrack, hpBarFill, hpText]);
  if (parentLayer) parentLayer.add(container);

  return { container, shadow, emojiText, nameText, hpTrack, hpBarFill, hpText };
}

// ── HP bar update (tweened) ──────────────────────────────────────────────────
export function updateActorHp(actor, hp, maxHp, colors, scene) {
  if (!actor?.hpBarFill || !scene) return;

  const safeHp = Math.max(0, hp ?? 0);
  const safeMax = Math.max(1, maxHp ?? 100);
  const targetRatio = Math.min(1, safeHp / safeMax);

  scene.tweens.killTweensOf(actor.hpBarFill);
  scene.tweens.add({
    targets: actor.hpBarFill,
    scaleX: targetRatio,
    duration: dur(340),
    ease: "Power2",
    onUpdate: () => {
      if (actor.hpBarFill?.active) {
        actor.hpBarFill.setFillStyle(hpColor(actor.hpBarFill.scaleX, colors));
      }
    },
    onComplete: () => {
      if (actor.hpBarFill?.active) {
        actor.hpBarFill.setFillStyle(hpColor(targetRatio, colors));
        actor.hpBarFill.scaleX = targetRatio;
      }
    },
  });

  if (actor.hpText?.active) actor.hpText.setText(`${safeHp}/${safeMax}`);
}

// ── Actor animations ─────────────────────────────────────────────────────────
export function playActorEnter(actor, side, scene) {
  if (!actor?.container) return;
  const targetX = actor.container.x;
  actor.container.x = side === "left" ? targetX - 130 : targetX + 130;
  actor.container.alpha = 0;

  scene.tweens.add({
    targets: actor.container,
    x: targetX,
    alpha: 1,
    duration: dur(380),
    ease: "Power2",
    delay: dur(side === "left" ? 0 : 120),
  });
}

export function playActorAttack(actor, direction, scene) {
  if (!actor?.container) return;
  const startX = actor.container.x;
  const lunge = direction === "right" ? 26 : -26;

  scene.tweens.killTweensOf(actor.container);
  scene.tweens.add({
    targets: actor.container,
    x: startX + lunge,
    duration: dur(95),
    ease: "Power2",
    yoyo: true,
    onComplete: () => { if (actor.container?.active) actor.container.x = startX; },
  });
}

export function playActorHit(actor, scene) {
  if (!actor?.container) return;
  const startX = actor.container.x;

  if (shouldReduceMotion()) {
    scene.tweens.add({ targets: actor.container, alpha: 0.3, duration: 50, yoyo: true });
    return;
  }

  scene.tweens.killTweensOf(actor.container);
  scene.tweens.add({
    targets: actor.container,
    x: startX + 6,
    duration: 35,
    repeat: 4,
    yoyo: true,
    ease: "Linear",
    onComplete: () => { if (actor.container?.active) actor.container.x = startX; },
  });
  scene.cameras.main.shake(dur(160), 0.006);
}

export function playActorHeal(actor, scene, effectLayer) {
  if (!actor?.container || shouldReduceMotion()) return;

  const x = actor.container.x;
  const y = actor.container.y - 10;

  for (let i = 0; i < 2; i++) {
    const ring = scene.add.circle(x, y, 6, 0x4ade80, 0).setStrokeStyle(2, 0x4ade80, 0.9);
    if (effectLayer) effectLayer.add(ring);

    scene.tweens.add({
      targets: ring,
      scaleX: 3 + i * 1.5,
      scaleY: 3 + i * 1.5,
      alpha: 0,
      duration: dur(480 + i * 100),
      delay: dur(i * 80),
      ease: "Power1",
      onComplete: () => { if (ring?.active) ring.destroy(); },
    });
  }
}

// ── Projectile ───────────────────────────────────────────────────────────────
/**
 * Moves an energy orb from (fromX,fromY) to (toX,toY), then calls onComplete(toX,toY).
 * Adds a 2-step trail. All objects auto-destroy on completion.
 */
export function playProjectile(scene, fromX, fromY, toX, toY, color, effectLayer, onComplete) {
  if (shouldReduceMotion()) {
    onComplete?.(toX, toY);
    return;
  }

  const orb = scene.add.circle(fromX, fromY, 7, color, 1);
  const t1  = scene.add.circle(fromX, fromY, 4, color, 0.5);
  const t2  = scene.add.circle(fromX, fromY, 2, color, 0.25);
  [orb, t1, t2].forEach((o) => { if (effectLayer) effectLayer.add(o); });

  const TRAVEL = dur(265);
  scene.tweens.add({
    targets: orb,
    x: toX, y: toY,
    duration: TRAVEL,
    ease: "Linear",
    onComplete: () => {
      if (orb?.active) orb.destroy();
      onComplete?.(toX, toY);
    },
  });
  scene.tweens.add({ targets: t1, x: toX, y: toY, duration: TRAVEL, ease: "Linear", delay: dur(45),
    onComplete: () => { if (t1?.active) t1.destroy(); } });
  scene.tweens.add({ targets: t2, x: toX, y: toY, duration: TRAVEL, ease: "Linear", delay: dur(90),
    onComplete: () => { if (t2?.active) t2.destroy(); } });
}

// ── Impact burst ─────────────────────────────────────────────────────────────
export function playImpactBurst(scene, x, y, color, effectLayer) {
  if (shouldReduceMotion()) return;

  for (let i = 0; i < 7; i++) {
    const angle = (i / 7) * Math.PI * 2;
    const shard = scene.add.circle(x, y, 4, color, 0.9);
    if (effectLayer) effectLayer.add(shard);

    scene.tweens.add({
      targets: shard,
      x: x + Math.cos(angle) * 28,
      y: y + Math.sin(angle) * 28,
      alpha: 0,
      scaleX: 0.1,
      scaleY: 0.1,
      duration: dur(350),
      ease: "Power2",
      onComplete: () => { if (shard?.active) shard.destroy(); },
    });
  }

  const flash = scene.add.circle(x, y, 12, color, 0.6);
  if (effectLayer) effectLayer.add(flash);
  scene.tweens.add({
    targets: flash,
    scaleX: 2.8, scaleY: 2.8, alpha: 0,
    duration: dur(270),
    onComplete: () => { if (flash?.active) flash.destroy(); },
  });
}

// ── Floating text ─────────────────────────────────────────────────────────────
export function playDamageText(scene, x, y, amount, floatLayer) {
  _floatText(scene, x, y, `-${amount}`, "#f87171", "#7f1d1d", floatLayer);
}

export function playHealText(scene, x, y, amount, floatLayer) {
  _floatText(scene, x, y, `+${amount}`, "#4ade80", "#14532d", floatLayer);
}

export function playHintText(scene, x, y, floatLayer) {
  _floatText(scene, x, y, "💡 HINT", "#fbbf24", "#78350f", floatLayer);
}

function _floatText(scene, x, y, text, fill, stroke, floatLayer) {
  const txt = scene.add.text(x, y, text, {
    fontSize: "20px",
    fontStyle: "bold",
    fill,
    stroke: stroke || "#000000",
    strokeThickness: 4,
  }).setOrigin(0.5, 1);

  if (floatLayer) floatLayer.add(txt);

  scene.tweens.add({
    targets: txt,
    y: y - 44,
    alpha: 0,
    duration: dur(820),
    ease: "Power1",
    onComplete: () => { if (txt?.active) txt.destroy(); },
  });
}

// ── Hint sparkle ──────────────────────────────────────────────────────────────
export function playHintSparkle(scene, x, y, effectLayer) {
  if (shouldReduceMotion()) return;
  const palette = [0xfbbf24, 0xf59e0b, 0xfde68a, 0xfef3c7];

  for (let i = 0; i < 6; i++) {
    const ox = (Math.random() - 0.5) * 68;
    const oy = (Math.random() - 0.5) * 38;
    const sp = scene.add.circle(x + ox, y + oy, 2 + Math.random() * 3, palette[i % 4]);
    if (effectLayer) effectLayer.add(sp);

    scene.tweens.add({
      targets: sp,
      y: sp.y - 18,
      alpha: 0,
      scaleX: 0, scaleY: 0,
      duration: dur(520 + Math.random() * 200),
      delay: dur(i * 55),
      onComplete: () => { if (sp?.active) sp.destroy(); },
    });
  }
}

// ── Clear / Fail finishers ───────────────────────────────────────────────────
export function playClearEffect(scene, monsterActor, effectLayer, floatLayer) {
  if (monsterActor?.container?.active) {
    scene.tweens.add({
      targets: monsterActor.container,
      alpha: 0, scaleX: 0, scaleY: 0,
      duration: dur(500),
      ease: "Power3",
    });
  }

  if (!shouldReduceMotion()) {
    const cx = scene.scale.width / 2;
    const cy = scene.scale.height * 0.5;
    const palette = [0xf59e0b, 0x22c55e, 0x0ea5e9, 0x8b5cf6, 0xec4899, 0xfbbf24];

    for (let i = 0; i < 14; i++) {
      const angle = (i / 14) * Math.PI * 2;
      const dist  = 44 + Math.random() * 54;
      const piece = scene.add.rectangle(cx, cy, 5, 3, palette[i % palette.length]);
      if (effectLayer) effectLayer.add(piece);

      scene.tweens.add({
        targets: piece,
        x: cx + Math.cos(angle) * dist,
        y: cy + Math.sin(angle) * dist - 24,
        angle: 360,
        alpha: 0,
        duration: dur(680),
        delay: dur(i * 18),
        ease: "Power2",
        onComplete: () => { if (piece?.active) piece.destroy(); },
      });
    }
  }

  _floatText(scene, scene.scale.width / 2, scene.scale.height * 0.42, "CLEAR!", "#4ade80", "#14532d", floatLayer);
}

export function playFailEffect(scene, playerActor, effectLayer, floatLayer) {
  if (playerActor?.container?.active) {
    scene.tweens.add({
      targets: playerActor.container,
      alpha: 0.2,
      duration: dur(400),
      ease: "Power2",
    });
  }

  if (!shouldReduceMotion()) {
    const overlay = scene.add.rectangle(0, 0, scene.scale.width, scene.scale.height, 0x000000, 0)
      .setOrigin(0, 0)
      .setDepth(50);
    if (effectLayer) effectLayer.add(overlay);

    scene.tweens.add({
      targets: overlay,
      alpha: 0.38,
      duration: dur(480),
    });
  }

  _floatText(scene, scene.scale.width / 2, scene.scale.height * 0.42, "FAILED", "#f87171", "#7f1d1d", floatLayer);
}
