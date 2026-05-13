const STORAGE_KEY = "nihongoQuest:v1";
const CURRENT_VERSION = 1;

export function createDefaultSaveData() {
  return {
    version: CURRENT_VERSION,
    updatedAt: new Date().toISOString(),
    player: {
      level: 1,
      exp: 0,
      gold: 0,
      title: "일본어 견습생",
      maxHp: 100,
      clearedStageIds: [],
      wrongQuestionIds: [],
      stats: {
        totalAnswered: 0,
        totalCorrect: 0,
        todayAnswered: 0,
        todayClearedStages: 0,
        streakDays: 0,
        lastPlayedDate: null,
      },
    },
  };
}

export function isValidSaveData(data) {
  if (!data || typeof data !== "object") return false;
  if (data.version !== CURRENT_VERSION) return false;
  const p = data.player;
  if (!p || typeof p !== "object") return false;
  if (typeof p.level !== "number") return false;
  if (typeof p.exp !== "number") return false;
  if (typeof p.gold !== "number") return false;
  if (!Array.isArray(p.clearedStageIds)) return false;
  if (!Array.isArray(p.wrongQuestionIds)) return false;
  if (!p.stats || typeof p.stats !== "object") return false;
  return true;
}

export function loadSaveData() {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return createDefaultSaveData();
    const parsed = JSON.parse(raw);
    if (!isValidSaveData(parsed)) {
      console.warn("[storage] 저장 데이터가 유효하지 않아 기본값으로 초기화합니다.");
      return createDefaultSaveData();
    }
    return parsed;
  } catch (e) {
    console.error("[storage] 저장 데이터 파싱 실패:", e);
    return createDefaultSaveData();
  }
}

export function saveGame(player) {
  try {
    const data = {
      version: CURRENT_VERSION,
      updatedAt: new Date().toISOString(),
      player,
    };
    localStorage.setItem(STORAGE_KEY, JSON.stringify(data));
    return true;
  } catch (e) {
    console.error("[storage] 저장 실패:", e);
    return false;
  }
}

export function resetSaveData() {
  try {
    localStorage.removeItem(STORAGE_KEY);
    return true;
  } catch (e) {
    console.error("[storage] 초기화 실패:", e);
    return false;
  }
}
