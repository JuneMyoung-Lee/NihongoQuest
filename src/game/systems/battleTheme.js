const DARK_THEME = {
  bgTop:        0x1e293b,
  bgBottom:     0x312e81,
  ground:       0x4338ca,
  groundAlpha:  0.7,
  hpGood:       0x22c55e,
  hpWarn:       0xf59e0b,
  hpDanger:     0xef4444,
  hpTrack:      0x475569,
  nameFill:     "#f1f5f9",
  hpNumFill:    "#e2e8f0",
  textStroke:   "#000000",
  strokeWeight: 3,
};

const LIGHT_THEME = {
  bgTop:        0xe0f2fe,
  bgBottom:     0xede9fe,
  ground:       0x818cf8,
  groundAlpha:  0.6,
  hpGood:       0x16a34a,
  hpWarn:       0xd97706,
  hpDanger:     0xdc2626,
  hpTrack:      0x94a3b8,
  nameFill:     "#1e293b",
  hpNumFill:    "#334155",
  textStroke:   "#ffffff",
  strokeWeight: 2,
};

// 다크 모드 — 각 테마별 대비감 있는 배경 (상단 밝음 → 하단 어두움)
const DARK_OVERLAYS = {
  forest:  { bgTop: 0x15803d, bgBottom: 0x14532d },
  cave:    { bgTop: 0x57534e, bgBottom: 0x292524 },
  mansion: { bgTop: 0x6d28d9, bgBottom: 0x3b0764 },
  tower:   { bgTop: 0x0369a1, bgBottom: 0x0c4a6e },
  castle:  { bgTop: 0x92400e, bgBottom: 0x451a03 },
  road:    { bgTop: 0x6d28d9, bgBottom: 0x3b0764 },
  valley:  { bgTop: 0x991b1b, bgBottom: 0x450a0a },
  boss:    { bgTop: 0x9f1239, bgBottom: 0x4c0519 },
  default: null,
};

// 라이트 모드 — 파스텔 계열로 테마별 분위기 유지
const LIGHT_OVERLAYS = {
  forest:  { bgTop: 0xd1fae5, bgBottom: 0xa7f3d0 },
  cave:    { bgTop: 0xe7e5e4, bgBottom: 0xd6d3d1 },
  mansion: { bgTop: 0xf5f3ff, bgBottom: 0xddd6fe },
  tower:   { bgTop: 0xe0f2fe, bgBottom: 0xbae6fd },
  castle:  { bgTop: 0xfef3c7, bgBottom: 0xfde68a },
  road:    { bgTop: 0xfaf5ff, bgBottom: 0xe9d5ff },
  valley:  { bgTop: 0xfce7f3, bgBottom: 0xfbcfe8 },
  boss:    { bgTop: 0xffe4e6, bgBottom: 0xfecdd3 },
  default: null,
};

export function getBattleTheme({ appTheme = "dark", monsterTheme = "default" }) {
  const isLight = appTheme === "light";
  const base    = isLight ? { ...LIGHT_THEME } : { ...DARK_THEME };
  const overlays = isLight ? LIGHT_OVERLAYS : DARK_OVERLAYS;
  const overlay  = overlays[monsterTheme] || null;
  if (overlay) {
    base.bgTop    = overlay.bgTop;
    base.bgBottom = overlay.bgBottom;
  }
  return base;
}
