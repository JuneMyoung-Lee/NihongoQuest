import { battleAssets } from "../assets/battleAssets.js";

const FALLBACK_PLAYER = { key: null, type: "emoji", emoji: "🧙", label: "플레이어" };
const FALLBACK_MONSTER = { key: null, type: "emoji", emoji: "👾", label: "몬스터" };

// ── 기본 헬퍼 ────────────────────────────────────────────────────────────────
export function getFallbackEmojiAsset(emoji, label) {
  return { key: null, type: "emoji", emoji: emoji || "❓", label: label || "" };
}

/**
 * assetKey로 battleAssets 전체를 탐색해 매칭되는 에셋을 반환.
 * 없으면 null.
 */
export function resolveBattleAsset(assetKey) {
  if (!assetKey) return null;
  try {
    for (const category of Object.values(battleAssets)) {
      for (const asset of Object.values(category)) {
        if (asset?.key === assetKey) return asset;
      }
    }
  } catch (_) {}
  return null;
}

// ── 유효성 검사 ───────────────────────────────────────────────────────────────
function _isLoadableAsset(asset) {
  if (!asset) return false;
  if (asset.type !== "image" && asset.type !== "spritesheet") return false;
  if (!asset.path) {
    console.warn(`[assetResolver] "${asset.key}" is type "${asset.type}" but has no path — emoji fallback`);
    return false;
  }
  if (asset.type === "spritesheet" && (!asset.frameWidth || !asset.frameHeight)) {
    console.warn(`[assetResolver] spritesheet "${asset.key}" missing frameWidth/frameHeight — emoji fallback`);
    return false;
  }
  return true;
}

function _resolveWithKey(assetKey, fallbackEmoji, fallbackLabel) {
  if (!assetKey) return getFallbackEmojiAsset(fallbackEmoji, fallbackLabel);

  const asset = resolveBattleAsset(assetKey);
  if (!asset) {
    console.warn(`[assetResolver] key "${assetKey}" not found in battleAssets — emoji fallback`);
    return getFallbackEmojiAsset(fallbackEmoji, fallbackLabel);
  }

  // image/spritesheet but not loadable → emoji fallback with asset's own emoji
  if ((asset.type === "image" || asset.type === "spritesheet") && !_isLoadableAsset(asset)) {
    return getFallbackEmojiAsset(asset.emoji || fallbackEmoji, asset.label || fallbackLabel);
  }

  return asset;
}

// ── 공개 API ──────────────────────────────────────────────────────────────────
export function resolvePlayerAsset(player) {
  if (!player) return { ...FALLBACK_PLAYER };
  return _resolveWithKey(
    player.avatarKey,
    player.avatar || player.emoji || FALLBACK_PLAYER.emoji,
    "플레이어"
  );
}

export function resolveMonsterAsset(monster) {
  if (!monster) return { ...FALLBACK_MONSTER };
  return _resolveWithKey(
    monster.assetKey,
    monster.emoji || FALLBACK_MONSTER.emoji,
    monster.name || "몬스터"
  );
}

/**
 * preload 대상 에셋 목록을 반환 (type: image | spritesheet, path 있는 것만).
 * BattleScene.preload()에서 사용.
 */
export function getPreloadList() {
  const result = [];
  try {
    for (const category of Object.values(battleAssets)) {
      for (const asset of Object.values(category)) {
        if (_isLoadableAsset(asset)) result.push(asset);
      }
    }
  } catch (_) {}
  return result;
}
