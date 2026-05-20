import Phaser from "phaser";
import { EventBus, EVENTS } from "../EventBus.js";
import { getBattleTheme } from "../systems/battleTheme.js";
import { resolvePlayerAsset, resolveMonsterAsset, getPreloadList } from "../systems/assetResolver.js";
import {
  shouldReduceMotion, dur,
  createActor, updateActorHp,
  playActorEnter, playActorAttack, playActorHit, playActorHeal,
  playProjectile, playImpactBurst,
  playDamageText, playHealText, playHintText, playHintSparkle,
  playClearEffect, playFailEffect,
} from "../systems/battleEffects.js";

export class BattleScene extends Phaser.Scene {
  constructor() {
    super({ key: "BattleScene" });
    this._snapshot      = null;
    this._colors        = null;
    this._currentTheme  = "default";
    this._currentAppTheme = "dark";
    this._playerActor   = null;
    this._monsterActor  = null;
    this._lastEventId   = null;
    this._sceneReady    = false;
    this._boundHandlers = {};
    this._bossPhase2    = false;

    // Layers
    this._bgLayer     = null;
    this._groundLayer = null;
    this._actorLayer  = null;
    this._effectLayer = null;
    this._uiLayer     = null;
    this._floatLayer  = null;

    // Graphics objects
    this._bgGfx     = null;
    this._decorGfx  = null;
    this._groundGfx = null;
  }

  // ── Lifecycle ──────────────────────────────────────────────────────────────
  preload() {
    // image/spritesheet 타입 에셋만 로드 (없으면 0개 → 아무것도 안 함)
    const toLoad = getPreloadList();
    if (toLoad.length === 0) return;

    this.load.on("loaderror", (fileObj) => {
      console.warn(`[BattleScene] Asset load failed: "${fileObj?.key}" — emoji fallback 사용`);
    });

    toLoad.forEach((asset) => {
      try {
        if (asset.type === "image") {
          this.load.image(asset.key, asset.path);
        } else if (asset.type === "spritesheet") {
          this.load.spritesheet(asset.key, asset.path, {
            frameWidth: asset.frameWidth,
            frameHeight: asset.frameHeight,
          });
        }
      } catch (e) {
        console.warn(`[BattleScene] preload error for "${asset.key}":`, e);
      }
    });
  }

  create() {
    try {
      this._initLayers();
      this._colors = getBattleTheme({ appTheme: "dark", monsterTheme: "default" });
      // _redrawBackground 는 SCENE_READY → BATTLE_THEME 수신 시 올바른 appTheme으로 즉시 그려짐
      this._registerHandlers();
      this._sceneReady = true;
      EventBus.emit(EVENTS.SCENE_READY, { scene: this });
    } catch (e) {
      console.error("[BattleScene] create error:", e);
      EventBus.emit(EVENTS.SCENE_ERROR, { error: e?.message || String(e) });
    }
  }

  shutdown() {
    this._sceneReady = false;
    this._unregisterHandlers();
    this._playerActor  = null;
    this._monsterActor = null;
  }

  // ── Layer init ─────────────────────────────────────────────────────────────
  _initLayers() {
    this._bgLayer     = this.add.container(0, 0).setDepth(0);
    this._groundLayer = this.add.container(0, 0).setDepth(1);
    this._actorLayer  = this.add.container(0, 0).setDepth(2);
    this._effectLayer = this.add.container(0, 0).setDepth(3);
    this._uiLayer     = this.add.container(0, 0).setDepth(4);
    this._floatLayer  = this.add.container(0, 0).setDepth(5);

    this._bgGfx     = this.add.graphics();
    this._decorGfx  = this.add.graphics();
    this._groundGfx = this.add.graphics();

    this._bgLayer.add([this._bgGfx, this._decorGfx]);
    this._groundLayer.add(this._groundGfx);
  }

  // ── EventBus wiring ────────────────────────────────────────────────────────
  _registerHandlers() {
    this._boundHandlers = {
      [EVENTS.BATTLE_UPDATE]:  (s) => this._onUpdate(s),
      [EVENTS.BATTLE_EVENT]:   (e) => this._onEvent(e),
      [EVENTS.BATTLE_THEME]:   (t) => this._onTheme(t),
      [EVENTS.BATTLE_RESIZE]:  (r) => this._onResize(r),
      [EVENTS.BATTLE_DESTROY]: ()  => this._onDestroy(),
    };
    Object.entries(this._boundHandlers).forEach(([ev, fn]) => EventBus.on(ev, fn));
  }

  _unregisterHandlers() {
    Object.entries(this._boundHandlers).forEach(([ev, fn]) => EventBus.off(ev, fn));
    this._boundHandlers = {};
  }

  // ── Battle update ──────────────────────────────────────────────────────────
  _onUpdate(snapshot) {
    if (!snapshot) return;

    // Detect new battle session → full reset
    const prevSession = this._snapshot?.battleSessionId;
    if (prevSession && prevSession !== snapshot.battleSessionId) {
      this._lastEventId = null;
      this._bossPhase2  = false;
      this._clearActors();
    }
    this._snapshot = snapshot;

    if (!this._playerActor || !this._monsterActor) {
      this._spawnActors(snapshot);
    } else {
      updateActorHp(this._playerActor, snapshot.player.hp, snapshot.player.maxHp, this._colors, this);
      updateActorHp(this._monsterActor, snapshot.monster.hp, snapshot.monster.maxHp, this._colors, this);
      // Update emoji text only when Text type — Image/Sprite has no setText()
      if (this._playerActor.emojiText?.active && this._playerActor.emojiText.type === "Text") {
        this._playerActor.emojiText.setText(snapshot.player.emoji || "🧙");
      }
      if (this._monsterActor.emojiText?.active && this._monsterActor.emojiText.type === "Text") {
        this._monsterActor.emojiText.setText(snapshot.monster.emoji || "👾");
      }

      // Boss phase 2 trigger at ≤50% HP
      if (this._currentTheme === "boss" && !this._bossPhase2 && snapshot.monster.hp > 0) {
        const hpRatio = snapshot.monster.hp / snapshot.monster.maxHp;
        if (hpRatio <= 0.5) {
          this._bossPhase2 = true;
          this._triggerBossPhase2();
        }
      }
    }
  }

  // ── Battle event ───────────────────────────────────────────────────────────
  _onEvent(battleEvent) {
    if (!battleEvent || !this._sceneReady) return;
    if (battleEvent.id && battleEvent.id === this._lastEventId) return; // deduplicate
    if (battleEvent.id) this._lastEventId = battleEvent.id;

    const { type, source, target, amount } = battleEvent;

    try {
      switch (type) {
        case "damage":
          if (source === "player" && target === "monster") {
            this._doPlayerAttack(amount);
          } else if (source === "monster" && target === "player") {
            this._doMonsterAttack(amount);
          }
          break;
        case "heal":
          this._doHeal(amount);
          break;
        case "hint":
          this._doHint();
          break;
        case "clear":
          playClearEffect(this, this._monsterActor, this._effectLayer, this._floatLayer);
          break;
        case "fail":
          playFailEffect(this, this._playerActor, this._effectLayer, this._floatLayer);
          break;
        case "reset":
          this._lastEventId = null;
          this._clearActors();
          break;
        default:
          console.warn("[BattleScene] Unknown event type:", type);
      }
    } catch (e) {
      console.error("[BattleScene] event handler error:", e);
    }

    EventBus.emit(EVENTS.ANIMATION_COMPLETE, { eventId: battleEvent.id });
  }

  // ── Theme change ───────────────────────────────────────────────────────────
  _onTheme({ appTheme, monsterTheme } = {}) {
    this._currentAppTheme = appTheme || "dark";
    this._currentTheme    = monsterTheme || "default";
    this._colors = getBattleTheme({
      appTheme: this._currentAppTheme,
      monsterTheme: this._currentTheme,
    });
    this._redrawBackground(this._currentTheme);
    this._refreshActorColors();
  }

  // ── Resize ─────────────────────────────────────────────────────────────────
  _onResize({ width, height } = {}) {
    try {
      const w = Math.max(240, width  || 480);
      const h = Math.max(180, height || 260);
      this.scale.resize(w, h);
      this._redrawBackground(this._currentTheme);
      this._repositionActors();
    } catch (e) {
      console.error("[BattleScene] resize error:", e);
    }
  }

  _onDestroy() {
    this.scene.stop();
  }

  // ── Background + decorations ───────────────────────────────────────────────
  _redrawBackground(theme) {
    const w = this.scale.width;
    const h = this.scale.height;
    const { bgTop, bgBottom, ground, groundAlpha } = this._colors;

    // Gradient fill
    this._bgGfx.clear();
    this._bgGfx.fillGradientStyle(bgTop, bgTop, bgBottom, bgBottom, 1);
    this._bgGfx.fillRect(0, 0, w, h);

    // Theme decorations
    this._decorGfx.clear();
    this._drawDecorations(theme, w, h);

    // Ground platforms
    this._groundGfx.clear();
    this._groundGfx.fillStyle(ground, groundAlpha);
    this._groundGfx.fillEllipse(w * 0.22, h * 0.80, 70, 12);
    this._groundGfx.fillEllipse(w * 0.78, h * 0.60, 62, 10);
  }

  _drawDecorations(theme, w, h) {
    const g = this._decorGfx;

    switch (theme) {
      case "forest":
        g.fillStyle(0x16a34a, 0.14);
        for (let i = 0; i < 5; i++) {
          g.fillEllipse((0.08 + i * 0.19) * w, (0.07 + (i % 2) * 0.11) * h, 18 + i * 5, 11 + i * 2);
        }
        g.fillStyle(0x15803d, 0.09);
        for (let i = 0; i < 3; i++) {
          g.fillEllipse((0.18 + i * 0.28) * w, (0.2 + i * 0.05) * h, 28, 14);
        }
        break;

      case "cave":
        g.fillStyle(0x44403c, 0.32);
        for (let i = 0; i < 6; i++) {
          const rx = (0.04 + i * 0.16) * w;
          const rh = (0.07 + (i % 3) * 0.05) * h;
          g.fillTriangle(rx, h, rx + 16, h - rh, rx + 32, h);
        }
        g.fillStyle(0x57534e, 0.28);
        for (let i = 0; i < 4; i++) {
          const sx = (0.08 + i * 0.24) * w;
          const sh = (0.05 + (i % 2) * 0.04) * h;
          g.fillTriangle(sx, 0, sx + 12, sh, sx + 24, 0);
        }
        break;

      case "mansion":
        g.fillStyle(0xddd6fe, 0.05);
        for (let i = 0; i < 4; i++) {
          g.fillEllipse((0.12 + i * 0.23) * w, (0.18 + (i % 2) * 0.28) * h, 18, 28);
        }
        g.lineStyle(1, 0x7c3aed, 0.18);
        for (let i = 0; i < 3; i++) {
          g.strokeRect((0.08 + i * 0.36) * w, 0.09 * h, 14, 20);
        }
        break;

      case "tower":
        g.lineStyle(1, 0x7dd3fc, 0.13);
        for (let i = 0; i < 8; i++) {
          const lx = (0.04 + i * 0.14) * w;
          g.lineBetween(lx, 0, lx, h);
        }
        g.lineStyle(1, 0x7dd3fc, 0.09);
        g.lineBetween(0, h * 0.33, w, h * 0.33);
        g.lineBetween(0, h * 0.66, w, h * 0.66);
        break;

      case "castle":
        g.fillStyle(0x78716c, 0.22);
        for (let i = 0; i < 10; i++) {
          if (i % 2 === 0) g.fillRect(i * (w / 10), 0, w / 10 - 3, h * 0.11);
        }
        g.lineStyle(2, 0xf59e0b, 0.18);
        g.lineBetween(0, h * 0.11, w, h * 0.11);
        break;

      case "boss":
        // Lightning bolts
        g.lineStyle(2, 0xef4444, 0.22);
        for (let i = 0; i < 3; i++) {
          const bx = (0.14 + i * 0.32) * w;
          const by = 0.1 * h;
          g.lineBetween(bx, by, bx - 8, by + h * 0.28);
          g.lineBetween(bx - 8, by + h * 0.28, bx + 6, by + h * 0.28);
          g.lineBetween(bx + 6, by + h * 0.28, bx - 4, by + h * 0.65);
        }
        g.fillStyle(0xef4444, 0.07);
        g.fillCircle(w * 0.5, h * 0.5, h * 0.38);
        break;

      case "road":
        g.lineStyle(1, 0xa78bfa, 0.14);
        for (let i = 0; i < 5; i++) {
          const off = i * 0.05;
          g.lineBetween(w * (0.28 - off), h, w * 0.5, 0);
          g.lineBetween(w * (0.72 + off), h, w * 0.5, 0);
        }
        break;

      case "valley":
        g.fillStyle(0x374151, 0.28);
        g.fillTriangle(0, h * 0.65, w * 0.26, h * 0.1, w * 0.52, h * 0.65);
        g.fillTriangle(w * 0.28, h * 0.65, w * 0.54, h * 0.14, w * 0.8, h * 0.65);
        g.fillStyle(0x1f2937, 0.18);
        g.fillTriangle(w * 0.5, h * 0.65, w * 0.76, h * 0.18, w, h * 0.65);
        break;

      default:
        break;
    }
  }

  // ── Actor management ───────────────────────────────────────────────────────
  _spawnActors(snapshot) {
    const w = this.scale.width;
    const h = this.scale.height;

    // assetResolver로 에셋 결정 (없으면 emoji fallback)
    const playerAsset  = resolvePlayerAsset({
      avatarKey: snapshot.player.avatarKey,
      avatar:    snapshot.player.emoji,
    });
    const monsterAsset = resolveMonsterAsset({
      assetKey: snapshot.monster.assetKey,
      emoji:    snapshot.monster.emoji,
      name:     snapshot.monster.name,
    });

    this._playerActor = createActor(this, {
      emoji:     playerAsset.emoji || snapshot.player.emoji || "🧙",
      name:      snapshot.player.name || "플레이어",
      hp:        snapshot.player.hp,
      maxHp:     snapshot.player.maxHp,
      isMonster: false,
      colors:    this._colors,
      assetType: playerAsset.type,
      assetKey:  playerAsset.key,
    }, this._actorLayer);
    this._playerActor.container.setPosition(w * 0.22, h * 0.74);

    this._monsterActor = createActor(this, {
      emoji:     monsterAsset.emoji || snapshot.monster.emoji || "👾",
      name:      snapshot.monster.name || "몬스터",
      hp:        snapshot.monster.hp,
      maxHp:     snapshot.monster.maxHp,
      isMonster: true,
      colors:    this._colors,
      assetType: monsterAsset.type,
      assetKey:  monsterAsset.key,
    }, this._actorLayer);
    this._monsterActor.container.setPosition(w * 0.78, h * 0.55);

    playActorEnter(this._playerActor,  "left",  this);
    playActorEnter(this._monsterActor, "right", this);

    if (this._currentTheme === "boss") {
      this.time.delayedCall(dur(400), () => this._playBossSpawn());
    }
  }

  _clearActors() {
    if (this._playerActor?.container?.active)  this._playerActor.container.destroy();
    if (this._monsterActor?.container?.active) this._monsterActor.container.destroy();
    this._playerActor  = null;
    this._monsterActor = null;
    this._bossPhase2   = false;
    if (this._effectLayer) this._effectLayer.removeAll(true);
    if (this._floatLayer)  this._floatLayer.removeAll(true);
  }

  _repositionActors() {
    const w = this.scale.width;
    const h = this.scale.height;
    if (this._playerActor?.container?.active)  this._playerActor.container.setPosition(w * 0.22, h * 0.74);
    if (this._monsterActor?.container?.active) this._monsterActor.container.setPosition(w * 0.78, h * 0.55);
  }

  _refreshActorColors() {
    const c = this._colors;
    [this._playerActor, this._monsterActor].forEach((actor) => {
      if (!actor) return;
      if (actor.nameText?.active) actor.nameText.setStyle({
        fill: c.nameFill,
        stroke: c.textStroke || "#000000",
        strokeThickness: c.strokeWeight ?? 3,
      });
      if (actor.hpText?.active) actor.hpText.setStyle({
        fill: c.hpNumFill,
        stroke: c.textStroke || "#000000",
        strokeThickness: (c.strokeWeight ?? 3) - 1,
      });
      if (actor.hpTrack?.active) actor.hpTrack.setFillStyle(c.hpTrack, 0.85);
    });
  }

  // ── Effect dispatchers ─────────────────────────────────────────────────────
  _doPlayerAttack(amount) {
    const { _playerActor: pl, _monsterActor: mo } = this;
    if (!pl || !mo) return;

    playActorAttack(pl, "right", this);

    const fromX = pl.container.x + 20;
    const fromY = pl.container.y - 22;
    const toX   = mo.container.x - 20;
    const toY   = mo.container.y - 22;

    this.time.delayedCall(dur(90), () => {
      playProjectile(this, fromX, fromY, toX, toY, 0x8b5cf6, this._effectLayer, (ix, iy) => {
        playImpactBurst(this, ix, iy, 0x8b5cf6, this._effectLayer);
        playActorHit(mo, this);
        playDamageText(this, toX, toY - 12, amount ?? "?", this._floatLayer);
      });
    });
  }

  _doMonsterAttack(amount) {
    const { _playerActor: pl, _monsterActor: mo } = this;
    if (!pl || !mo) return;

    playActorAttack(mo, "left", this);

    const fromX = mo.container.x - 20;
    const fromY = mo.container.y - 22;
    const toX   = pl.container.x + 20;
    const toY   = pl.container.y - 22;

    this.time.delayedCall(dur(90), () => {
      playProjectile(this, fromX, fromY, toX, toY, 0xef4444, this._effectLayer, (ix, iy) => {
        playImpactBurst(this, ix, iy, 0xef4444, this._effectLayer);
        playActorHit(pl, this);
        playDamageText(this, toX, toY - 12, amount ?? "?", this._floatLayer);
      });
    });
  }

  _doHeal(amount) {
    const pl = this._playerActor;
    if (!pl) return;
    playActorHeal(pl, this, this._effectLayer);
    playHealText(this, pl.container.x, pl.container.y - 32, amount ?? "", this._floatLayer);
  }

  _doHint() {
    const cx = this.scale.width  / 2;
    const cy = this.scale.height / 2;
    playHintSparkle(this, cx, cy, this._effectLayer);
    playHintText(this, cx, cy + 10, this._floatLayer);
  }

  // ── Boss special effects ───────────────────────────────────────────────────
  _playBossSpawn() {
    if (!this._sceneReady || shouldReduceMotion()) return;
    const w = this.scale.width;
    const h = this.scale.height;

    const overlay = this.add.rectangle(w / 2, h / 2, w, h, 0xef4444, 0).setDepth(90);
    this.tweens.add({
      targets: overlay,
      alpha: { from: 0, to: 0.22 },
      duration: dur(180),
      yoyo: true,
      repeat: 1,
      onComplete: () => overlay.destroy(),
    });

    const txt = this.add.text(w / 2, h * 0.32, "⚔️ 보스 등장!", {
      fontSize: "22px",
      fontFamily: "sans-serif",
      color: "#fca5a5",
      stroke: "#7f1d1d",
      strokeThickness: 4,
      align: "center",
    }).setOrigin(0.5).setAlpha(0).setDepth(91);
    if (this._floatLayer) this._floatLayer.add(txt);

    this.tweens.add({
      targets: txt,
      alpha: 1,
      scaleX: { from: 0.6, to: 1 },
      scaleY: { from: 0.6, to: 1 },
      duration: dur(220),
      ease: "Back.Out",
      onComplete: () => {
        this.time.delayedCall(dur(900), () => {
          this.tweens.add({ targets: txt, alpha: 0, duration: dur(300), onComplete: () => txt.destroy() });
        });
      },
    });

    // Shake monster on spawn
    if (this._monsterActor?.container?.active) {
      const origX = this._monsterActor.container.x;
      this.tweens.add({
        targets: this._monsterActor.container,
        x: { from: origX - 8, to: origX + 8 },
        duration: dur(60),
        yoyo: true,
        repeat: 3,
        onComplete: () => { if (this._monsterActor?.container?.active) this._monsterActor.container.x = origX; },
      });
    }
  }

  _triggerBossPhase2() {
    if (!this._sceneReady || shouldReduceMotion()) return;
    const w = this.scale.width;
    const h = this.scale.height;

    // Red screen flash ×2
    const overlay = this.add.rectangle(w / 2, h / 2, w, h, 0xef4444, 0).setDepth(90);
    this.tweens.add({
      targets: overlay,
      alpha: { from: 0, to: 0.35 },
      duration: dur(120),
      yoyo: true,
      repeat: 2,
      onComplete: () => overlay.destroy(),
    });

    // Enrage warning text
    const txt = this.add.text(w / 2, h * 0.28, "😡 분노 발동!\n공격력 UP!", {
      fontSize: "18px",
      fontFamily: "sans-serif",
      color: "#fbbf24",
      stroke: "#7c2d12",
      strokeThickness: 4,
      align: "center",
    }).setOrigin(0.5).setAlpha(0).setDepth(91);
    if (this._floatLayer) this._floatLayer.add(txt);

    this.tweens.add({
      targets: txt,
      alpha: 1,
      scaleX: { from: 1.4, to: 1 },
      scaleY: { from: 1.4, to: 1 },
      duration: dur(200),
      ease: "Back.Out",
      onComplete: () => {
        this.time.delayedCall(dur(1200), () => {
          this.tweens.add({ targets: txt, alpha: 0, duration: dur(300), onComplete: () => txt.destroy() });
        });
      },
    });

    // Monster pulse effect
    if (this._monsterActor?.container?.active) {
      const origX = this._monsterActor.container.x;
      this.tweens.chain({
        targets: this._monsterActor.container,
        tweens: [
          { x: origX - 12, duration: dur(50) },
          { x: origX + 12, duration: dur(50) },
          { x: origX - 12, duration: dur(50) },
          { x: origX + 12, duration: dur(50) },
          { x: origX,      duration: dur(50) },
        ],
      });
      this.tweens.add({
        targets: this._monsterActor.container,
        scaleX: { from: 1, to: 1.15 },
        scaleY: { from: 1, to: 1.15 },
        duration: dur(300),
        yoyo: true,
        ease: "Sine.InOut",
      });
    }

    // Redraw background with phase2 intensity
    this._redrawBackground("boss");
    const extra = this._bgGfx;
    if (extra?.active) {
      this.tweens.add({
        targets: extra,
        alpha: { from: 1, to: 0.7 },
        duration: dur(200),
        yoyo: true,
        repeat: 2,
      });
    }
  }
}
