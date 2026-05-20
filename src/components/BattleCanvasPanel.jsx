import { Component, Suspense, lazy, useMemo } from "react";
import { createBattleSnapshot } from "../game/systems/battleSceneAdapter.js";

const PhaserGame = lazy(() =>
  import("../game/PhaserGame.jsx").catch(() => ({
    default: () => <div className="battle-canvas-fallback"><span>⚔️ 배틀 준비 중...</span></div>,
  }))
);

class BattleCanvasErrorBoundary extends Component {
  constructor(props) {
    super(props);
    this.state = { hasError: false };
  }
  static getDerivedStateFromError() {
    return { hasError: true };
  }
  componentDidCatch(error, info) {
    console.error("[BattleCanvasPanel] Phaser error:", error, info);
  }
  render() {
    if (this.state.hasError) {
      return (
        <div className="battle-canvas-fallback">
          <span>⚔️ 배틀 로딩 중...</span>
        </div>
      );
    }
    return this.props.children;
  }
}

export default function BattleCanvasPanel({ battleState, currentStage, player, theme, battleEvent }) {
  const appTheme = theme || "dark";
  const battleSnapshot = useMemo(
    () => createBattleSnapshot({ battleState, currentStage, player }),
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [
      battleState?.battleSessionId,
      battleState?.playerHp,
      battleState?.monsterHp,
      battleState?.correctCount,
      battleState?.wrongCount,
      battleState?.mode,
      currentStage?.id,
      player?.name,
      player?.avatarKey,
    ]
  );

  return (
    <div className="battle-canvas-panel">
      <BattleCanvasErrorBoundary>
        <Suspense fallback={<div className="battle-canvas-fallback"><span>⚔️ 배틀 로딩 중...</span></div>}>
          <PhaserGame
            battleSnapshot={battleSnapshot}
            battleEvent={battleEvent}
            appTheme={appTheme}
          />
        </Suspense>
      </BattleCanvasErrorBoundary>
    </div>
  );
}
