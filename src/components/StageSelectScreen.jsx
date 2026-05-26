import { useState, useRef, useEffect, Fragment } from "react";
import { isStageUnlocked, canAttemptTrial } from "../utils/gameLogic";

/* ── 상수 ───────────────────────────────────────────────────────── */
const JP_LEVELS = ["N5", "N4", "N3", "N2", "N1"];
const NODES_PER_ROW = 3;

const LEVEL_META = {
  N5: { color: "#22c55e", glow: "rgba(34,197,94,0.35)",  label: "N5 입문", emoji: "🌱", desc: "일본어 첫걸음" },
  N4: { color: "#3b82f6", glow: "rgba(59,130,246,0.35)", label: "N4 초급", emoji: "💧", desc: "기초 문법 완성" },
  N3: { color: "#a855f7", glow: "rgba(168,85,247,0.35)", label: "N3 중급", emoji: "⚡", desc: "실전 표현 도전" },
  N2: { color: "#f59e0b", glow: "rgba(245,158,11,0.35)", label: "N2 중고급", emoji: "🔥", desc: "고급 문법 정복" },
  N1: { color: "#ef4444", glow: "rgba(239,68,68,0.35)",  label: "N1 고급", emoji: "💎", desc: "최고난이도" },
  BIZ:{ color: "#0ea5e9", glow: "rgba(14,165,233,0.35)", label: "BIZ 영어", emoji: "💼", desc: "실전 비즈니스" },
};

/* ── 맵 세그먼트 생성 ────────────────────────────────────────────── */
// 반환: { type:'banner'|'row'|'turn', ... }  순서 = N5→N1 (시각적 아래→위)
function buildSegments(stages, category) {
  const levelGroups = {};
  stages.forEach((s) => {
    if (!levelGroups[s.jlptLevel]) levelGroups[s.jlptLevel] = [];
    levelGroups[s.jlptLevel].push(s);
  });

  const levels =
    category === "jp"
      ? JP_LEVELS.filter((l) => levelGroups[l]?.length)
      : ["BIZ"].filter((l) => levelGroups[l]?.length);

  const segs = [];
  let rowIdx = 0;

  levels.forEach((level, li) => {
    const lvlStages = levelGroups[level] || [];
    const meta = LEVEL_META[level];
    segs.push({ type: "banner", level, meta });

    const rows = [];
    for (let i = 0; i < lvlStages.length; i += NODES_PER_ROW)
      rows.push(lvlStages.slice(i, i + NODES_PER_ROW));

    rows.forEach((rowStages, ri) => {
      const isReverse = rowIdx % 2 === 1;
      const isLastRow  = ri === rows.length - 1;
      const isLastLevel = li === levels.length - 1;

      segs.push({ type: "row", stages: rowStages, isReverse, rowIdx, color: meta.color });

      if (!isLastRow || !isLastLevel) {
        segs.push({ type: "turn", side: isReverse ? "left" : "right", color: meta.color });
      }
      rowIdx++;
    });
  });

  // DOM에서는 역순(N1→N5)으로 렌더링 → 시각적으로 N5가 아래쪽
  return segs.slice().reverse();
}

/* ── 메인 컴포넌트 ───────────────────────────────────────────────── */
export default function StageSelectScreen({ player, stages, onStartStage, onStartTrial, onGoHome }) {
  const [category, setCategory]       = useState("jp");
  const [selectedStage, setSelectedStage] = useState(null);
  const mapRef = useRef(null);

  const jpStages = stages
    .filter((s) => JP_LEVELS.includes(s.jlptLevel))
    .sort((a, b) => {
      const li = JP_LEVELS.indexOf(a.jlptLevel) - JP_LEVELS.indexOf(b.jlptLevel);
      return li !== 0 ? li : (a.stageOrderInGroup ?? a.order ?? 0) - (b.stageOrderInGroup ?? b.order ?? 0);
    });

  const bizStages = stages
    .filter((s) => s.jlptLevel === "BIZ")
    .sort((a, b) => (a.order ?? 0) - (b.order ?? 0));

  const currentStages = category === "jp" ? jpStages : bizStages;
  const segments = buildSegments(currentStages, category);

  // 카테고리 바뀌면 스크롤을 맨 아래(N5 위치)로
  useEffect(() => {
    if (mapRef.current) {
      mapRef.current.scrollTop = mapRef.current.scrollHeight;
    }
  }, [category]);

  const handleCat = (cat) => {
    setCategory(cat);
    setSelectedStage(null);
  };

  return (
    <div className="screen map-screen">
      {/* 헤더 */}
      <header className="screen-header map-header">
        <button className="btn btn-ghost btn-small" onClick={onGoHome}>← 홈</button>
        <h2 className="screen-title">스테이지 맵</h2>
        <div style={{ width: 52 }} />
      </header>

      {/* 카테고리 토글 */}
      <div className="map-cat-toggle">
        <button
          className={`map-cat-btn${category === "jp" ? " map-cat-active" : ""}`}
          onClick={() => handleCat("jp")}
        >
          🇯🇵&nbsp;일본어
        </button>
        <button
          className={`map-cat-btn${category === "biz" ? " map-cat-active" : ""}`}
          onClick={() => handleCat("biz")}
        >
          💼&nbsp;비즈니스 영어
        </button>
      </div>

      {/* 맵 스크롤 영역 */}
      <div className="map-scroll" ref={mapRef}>
        <div className="map-inner">
          {segments.map((seg, i) => {
            if (seg.type === "banner")
              return <LevelBanner key={`banner-${seg.level}`} meta={seg.meta} />;

            if (seg.type === "turn")
              return (
                <div key={`turn-${i}`} className={`map-turn map-turn-${seg.side}`}>
                  <div className="map-turn-arc" style={{ borderColor: seg.color }} />
                </div>
              );

            return (
              <MapRow
                key={`row-${seg.rowIdx}`}
                stages={seg.stages}
                isReverse={seg.isReverse}
                pathColor={seg.color}
                player={player}
                selectedId={selectedStage?.id}
                onSelect={setSelectedStage}
              />
            );
          })}

          {/* 최상단 도달 표시 */}
          <div className="map-top-flag">🏆 최고 레벨</div>
        </div>
      </div>

      {/* 스테이지 상세 패널 */}
      {selectedStage && (
        <DetailPanel
          stage={selectedStage}
          player={player}
          onClose={() => setSelectedStage(null)}
          onStart={(id) => { setSelectedStage(null); onStartStage(id); }}
          onTrial={(id) => { setSelectedStage(null); onStartTrial(id); }}
        />
      )}
    </div>
  );
}

/* ── 레벨 배너 ───────────────────────────────────────────────────── */
function LevelBanner({ meta }) {
  return (
    <div className="map-banner" style={{ borderColor: meta.color }}>
      <span className="map-banner-emoji">{meta.emoji}</span>
      <div>
        <div className="map-banner-label" style={{ color: meta.color }}>{meta.label}</div>
        <div className="map-banner-desc">{meta.desc}</div>
      </div>
    </div>
  );
}

/* ── 맵 행 (노드들) ──────────────────────────────────────────────── */
function MapRow({ stages, isReverse, pathColor, player, selectedId, onSelect }) {
  // 역방향 행은 노드 순서를 뒤집어서 시각적으로 오른쪽→왼쪽
  const display = isReverse ? [...stages].reverse() : stages;

  return (
    <div className={`map-row${isReverse ? " map-row-rev" : ""}`}>
      {display.map((stage, vi) => {
        const isCleared  = player.clearedStageIds?.includes(stage.id);
        const isUnlocked = isStageUnlocked(stage, player);
        const canTrial   = canAttemptTrial(stage, player);
        const isSelected = selectedId === stage.id;

        const state = isCleared ? "cleared"
                    : isUnlocked ? "unlocked"
                    : canTrial   ? "trial"
                    :              "locked";

        const pathBg = state !== "locked" ? pathColor : undefined;

        return (
          <Fragment key={stage.id}>
            {vi > 0 && (
              <div
                className={`map-path-h map-path-${state}`}
                style={pathBg ? { background: pathBg } : undefined}
              />
            )}
            <button
              className={`map-node map-node-${state}${isSelected ? " map-node-sel" : ""}`}
              onClick={() => onSelect(stage)}
              aria-label={stage.title}
            >
              <span className="map-node-icon">{stage.monster.emoji}</span>
              <span className="map-node-badge">
                {isCleared ? "✓" : state === "locked" ? "🔒" : state === "trial" ? "🧪" : "!"}
              </span>
            </button>
          </Fragment>
        );
      })}
    </div>
  );
}

/* ── 스테이지 상세 패널 (바텀 시트) ─────────────────────────────── */
function DetailPanel({ stage, player, onClose, onStart, onTrial }) {
  const isCleared  = player.clearedStageIds?.includes(stage.id);
  const isUnlocked = isStageUnlocked(stage, player);
  const canTrial   = canAttemptTrial(stage, player);
  const prog       = player.stageProgress?.[stage.id];

  const level = stage.jlptLevel;
  const meta  = LEVEL_META[level] ?? LEVEL_META.N5;

  return (
    <div className="detail-overlay" onClick={onClose}>
      <div className="detail-panel" onClick={(e) => e.stopPropagation()}>
        {/* 드래그 핸들 */}
        <div className="detail-handle" />

        {/* 헤더 */}
        <div className="detail-head">
          <span className="detail-emoji">{stage.monster.emoji}</span>
          <div className="detail-title-wrap">
            <span className="detail-title">{stage.title}</span>
            <span className="detail-area">{stage.area}</span>
          </div>
          <span
            className="detail-lvl-badge"
            style={{ background: meta.color }}
          >
            {level}
          </span>
        </div>

        {/* 상태 뱃지 */}
        <div className="detail-status-row">
          {isCleared  && <span className="detail-status ds-cleared">✅ 클리어</span>}
          {!isCleared && isUnlocked && <span className="detail-status ds-avail">⚔️ 도전 가능</span>}
          {!isCleared && !isUnlocked && canTrial && <span className="detail-status ds-trial">🧪 도약 시험 가능</span>}
          {!isCleared && !isUnlocked && !canTrial && <span className="detail-status ds-locked">🔒 잠김</span>}
          {prog?.perfectCleared && <span className="detail-status ds-perfect">✨ PERFECT</span>}
        </div>

        {/* 설명 */}
        <p className="detail-desc">{stage.description}</p>

        {/* 메타 정보 */}
        <div className="detail-meta">
          <span>👾 {stage.monster.name} (HP {stage.monster.hp})</span>
          <span>🎁 EXP +{stage.rewards.exp}</span>
          <span>💰 +{stage.rewards.gold}G</span>
          {stage.recommendedLevel && <span>⭐ 권장 Lv.{stage.recommendedLevel}</span>}
        </div>

        {/* 진행 현황 */}
        {prog && (
          <div className="detail-prog">
            <span className="detail-prog-label">최고 정답률</span>
            <div className="detail-prog-track">
              <div className="detail-prog-fill" style={{ width: `${prog.bestAccuracy}%`, background: meta.color }} />
            </div>
            <span className="detail-prog-pct">{prog.bestAccuracy}%</span>
          </div>
        )}

        {/* 액션 버튼 */}
        <div className="detail-actions">
          {(isCleared || isUnlocked) && (
            <button
              className={`btn ${isCleared ? "btn-secondary" : "btn-primary"} btn-full`}
              onClick={() => onStart(stage.id)}
            >
              {isCleared ? "🔄 다시 도전" : "⚔️ 도전하기"}
            </button>
          )}
          {!isCleared && !isUnlocked && canTrial && (
            <button className="btn btn-outline btn-full" onClick={() => onTrial(stage.id)}>
              🧪 도약 시험&nbsp;
              <span style={{ fontSize: "0.75rem", opacity: 0.8 }}>(정답률 80%↑ 통과)</span>
            </button>
          )}
          {!isCleared && !isUnlocked && !canTrial && (
            <button className="btn btn-locked btn-full" disabled>
              🔒 이전 스테이지를 클리어하세요
            </button>
          )}
        </div>
      </div>
    </div>
  );
}
