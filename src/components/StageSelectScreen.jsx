import { useState, useRef, useEffect, Fragment } from "react";
import { isStageUnlocked, canAttemptTrial } from "../utils/gameLogic";

/* ── 상수 ───────────────────────────────────────────────────────── */
const JP_LEVELS = ["N5", "N4", "N3", "N2", "N1"];
const NODES_PER_ROW = 3;

const LEVEL_META = {
  N5: { color: "#818cf8", glow: "rgba(129,140,248,0.28)", label: "N5 입문",   emoji: "🌱", desc: "일본어 첫걸음" },
  N4: { color: "#6366f1", glow: "rgba(99,102,241,0.28)",  label: "N4 초급",   emoji: "💧", desc: "기초 문법 완성" },
  N3: { color: "#4f46e5", glow: "rgba(79,70,229,0.28)",   label: "N3 중급",   emoji: "⚡", desc: "실전 표현 도전" },
  N2: { color: "#4338ca", glow: "rgba(67,56,202,0.28)",   label: "N2 중고급", emoji: "🔥", desc: "고급 문법 정복" },
  N1: { color: "#3730a3", glow: "rgba(55,48,163,0.28)",   label: "N1 고급",   emoji: "💎", desc: "최고난이도" },
  BIZ:{ color: "#1e40af", glow: "rgba(30,64,175,0.25)",   label: "BIZ 영어",  emoji: "💼", desc: "실전 비즈니스" },
};

/* ── 맵 세그먼트 생성 ────────────────────────────────────────────── */
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
      const isReverse  = rowIdx % 2 === 1;
      const isLastRow  = ri === rows.length - 1;
      const isLastLevel = li === levels.length - 1;

      segs.push({ type: "row", stages: rowStages, isReverse, rowIdx, color: meta.color });

      if (!isLastRow || !isLastLevel) {
        segs.push({ type: "turn", side: isReverse ? "left" : "right", color: meta.color });
      }
      rowIdx++;
    });
  });

  // DOM 역순(N1→N5) → 시각적으로 N5가 아래쪽
  return segs.slice().reverse();
}

/* ── 메인 컴포넌트 ───────────────────────────────────────────────── */
export default function StageSelectScreen({ player, stages, onStartStage, onStartTrial, onGoHome }) {
  const [category, setCategory]         = useState("jp");
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

  // 현재 진행 단계(첫 번째 잠금 해제 노드)로 스크롤, 없으면 맨 아래(N5)
  useEffect(() => {
    if (!mapRef.current) return;
    // DOM 업데이트 후 두 프레임 기다림
    const raf = requestAnimationFrame(() =>
      requestAnimationFrame(() => {
        if (!mapRef.current) return;
        const cur = mapRef.current.querySelector(".map-node-unlocked, .map-node-trial");
        if (cur) {
          cur.scrollIntoView({ block: "center", behavior: "instant" });
        } else {
          mapRef.current.scrollTop = mapRef.current.scrollHeight;
        }
      })
    );
    return () => cancelAnimationFrame(raf);
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
        {/* 상단 안개 — 잠긴 높은 레벨을 살짝 숨김 */}
        <div className="map-fog-top" />

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
    <div
      className="map-banner"
      style={{ borderColor: meta.color, boxShadow: `0 0 18px ${meta.glow}` }}
    >
      <span className="map-banner-emoji">{meta.emoji}</span>
      <div>
        <div className="map-banner-label" style={{ color: meta.color }}>{meta.label}</div>
        <div className="map-banner-desc">{meta.desc}</div>
      </div>
    </div>
  );
}

/* ── 맵 행 ───────────────────────────────────────────────────────── */
function MapRow({ stages, isReverse, pathColor, player, selectedId, onSelect }) {
  /**
   * 부분 행(마지막 행이 NODES_PER_ROW 미만인 경우) 처리:
   * - isReverse 행: null을 stages 뒤에 붙인 후 reverse
   *   → 실제 스테이지가 오른쪽(우측 아크 진입점)에 위치
   *   → null 플레이스홀더가 왼쪽으로 연결되어 좌측 아크까지 회색 경로 연장
   * - 정방향 행: 항상 NODES_PER_ROW개(3개)이므로 패딩 불필요
   */
  const allSlots = isReverse
    ? [...stages, ...Array(Math.max(0, NODES_PER_ROW - stages.length)).fill(null)]
    : [...stages];
  const display = isReverse ? [...allSlots].reverse() : allSlots;

  return (
    <div className="map-row">
      {display.map((stage, vi) => {
        /* null 슬롯: 경로 모양의 회색 플레이스홀더 */
        if (stage === null) {
          return (
            <Fragment key={`ph-${vi}`}>
              {vi > 0 && <div className="map-path-h map-path-locked" />}
              <div className="map-node-ph" />
            </Fragment>
          );
        }

        const isCleared  = player.clearedStageIds?.includes(stage.id);
        const isUnlocked = isStageUnlocked(stage, player);
        const canTrial   = canAttemptTrial(stage, player);
        const isSelected = selectedId === stage.id;

        const state = isCleared  ? "cleared"
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
        <div className="detail-handle" />

        <div className="detail-head">
          <span className="detail-emoji">{stage.monster.emoji}</span>
          <div className="detail-title-wrap">
            <span className="detail-title">{stage.title}</span>
            <span className="detail-area">{stage.area}</span>
          </div>
          <span className="detail-lvl-badge" style={{ background: meta.color }}>{level}</span>
        </div>

        <div className="detail-status-row">
          {isCleared  && <span className="detail-status ds-cleared">✅ 클리어</span>}
          {!isCleared && isUnlocked  && <span className="detail-status ds-avail">⚔️ 도전 가능</span>}
          {!isCleared && !isUnlocked && canTrial  && <span className="detail-status ds-trial">🧪 도약 시험 가능</span>}
          {!isCleared && !isUnlocked && !canTrial && <span className="detail-status ds-locked">🔒 잠김</span>}
          {prog?.perfectCleared && <span className="detail-status ds-perfect">✨ PERFECT</span>}
        </div>

        <p className="detail-desc">{stage.description}</p>

        <div className="detail-meta">
          <span>👾 {stage.monster.name} (HP {stage.monster.hp})</span>
          <span>🎁 EXP +{stage.rewards.exp}</span>
          <span>💰 +{stage.rewards.gold}G</span>
          {stage.recommendedLevel && <span>⭐ 권장 Lv.{stage.recommendedLevel}</span>}
        </div>

        {prog && (
          <div className="detail-prog">
            <span className="detail-prog-label">최고 정답률</span>
            <div className="detail-prog-track">
              <div className="detail-prog-fill" style={{ width: `${prog.bestAccuracy}%`, background: meta.color }} />
            </div>
            <span className="detail-prog-pct">{prog.bestAccuracy}%</span>
          </div>
        )}

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
