import { useEffect, useRef } from "react";
import Phaser from "phaser";
import { BattleScene } from "./scenes/BattleScene.js";
import { EventBus, EVENTS } from "./EventBus.js";

const CANVAS_HEIGHT = 260;

export default function PhaserGame({ battleSnapshot, battleEvent, appTheme }) {
  const containerRef = useRef(null);
  const gameRef = useRef(null);
  const lastEventIdRef = useRef(null);
  const battleSnapshotRef = useRef(battleSnapshot);
  const appThemeRef = useRef(appTheme);

  useEffect(() => { battleSnapshotRef.current = battleSnapshot; }, [battleSnapshot]);
  useEffect(() => { appThemeRef.current = appTheme; }, [appTheme]);

  // SCENE_READY 수신 시 현재 스냅샷 재전송 — 초기 BATTLE_UPDATE가 씬 준비 전에 유실되는 경쟁 조건 해결
  useEffect(() => {
    const onReady = () => {
      const snap = battleSnapshotRef.current;
      const theme = appThemeRef.current || "dark";
      // snapshot 유무와 무관하게 테마는 항상 전송 (배경이 검게 보이는 현상 방지)
      EventBus.emit(EVENTS.BATTLE_THEME, {
        appTheme: theme,
        monsterTheme: snap?.monster?.theme || "default",
      });
      if (snap) {
        EventBus.emit(EVENTS.BATTLE_UPDATE, snap);
      }
    };
    EventBus.on(EVENTS.SCENE_READY, onReady);
    return () => EventBus.off(EVENTS.SCENE_READY, onReady);
  }, []);

  // Phaser.Game 마운트
  useEffect(() => {
    const container = containerRef.current;
    if (!container) return;

    const dpr = Math.min(window.devicePixelRatio || 1, 3);
    const width = container.clientWidth || 480;
    const height = CANVAS_HEIGHT;

    // appTheme 기반 초기 배경색 — transparent 대신 불투명 배경을 써서 검은 플래시 방지
    const initBg = (appThemeRef.current || "dark") === "light" ? "#e0f2fe" : "#1e293b";

    const config = {
      type: Phaser.CANVAS,
      width,
      height,
      backgroundColor: initBg,
      parent: container,
      scene: [BattleScene],
      scale: {
        mode: Phaser.Scale.NONE,
        width,
        height,
      },
      render: {
        antialias: true,
        pixelArt: false,
        resolution: dpr,
      },
    };

    let game;
    try {
      game = new Phaser.Game(config);
      gameRef.current = game;
    } catch (e) {
      console.error("[PhaserGame] init failed:", e);
      EventBus.emit(EVENTS.SCENE_ERROR, { error: e.message });
    }

    return () => {
      EventBus.emit(EVENTS.BATTLE_DESTROY);
      try { game?.destroy(true); } catch (_) {}
      gameRef.current = null;
    };
  }, []);

  // battleSnapshot 변경 → Phaser로 전달
  useEffect(() => {
    if (!battleSnapshot) return;
    EventBus.emit(EVENTS.BATTLE_UPDATE, battleSnapshot);
  }, [battleSnapshot]);

  // battleEvent 변경 → Phaser로 전달 (중복 방지)
  useEffect(() => {
    if (!battleEvent || battleEvent.id === lastEventIdRef.current) return;
    lastEventIdRef.current = battleEvent.id;
    EventBus.emit(EVENTS.BATTLE_EVENT, battleEvent);
  }, [battleEvent]);

  // 테마 변경
  useEffect(() => {
    if (!battleSnapshot) return;
    EventBus.emit(EVENTS.BATTLE_THEME, {
      appTheme: appTheme || "dark",
      monsterTheme: battleSnapshot.monster?.theme || "default",
    });
  }, [appTheme, battleSnapshot?.monster?.theme]);

  // 컨테이너 크기 변경 감지
  useEffect(() => {
    const container = containerRef.current;
    if (!container || !gameRef.current) return;

    const observer = new ResizeObserver((entries) => {
      const entry = entries[0];
      if (!entry) return;
      const newWidth = Math.floor(entry.contentRect.width);
      if (newWidth > 0) {
        EventBus.emit(EVENTS.BATTLE_RESIZE, { width: newWidth, height: CANVAS_HEIGHT });
      }
    });
    observer.observe(container);
    return () => observer.disconnect();
  }, []);

  return <div ref={containerRef} className="phaser-canvas-host" aria-hidden="true" />;
}
