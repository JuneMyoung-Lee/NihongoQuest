const _listeners = {};

export const EventBus = {
  on(eventName, handler) {
    if (!_listeners[eventName]) _listeners[eventName] = [];
    _listeners[eventName].push(handler);
  },

  off(eventName, handler) {
    if (!_listeners[eventName]) return;
    _listeners[eventName] = _listeners[eventName].filter((h) => h !== handler);
  },

  emit(eventName, payload) {
    if (!_listeners[eventName]) return;
    _listeners[eventName].forEach((h) => {
      try { h(payload); } catch (e) { console.error(`[EventBus] ${eventName}:`, e); }
    });
  },

  removeAllListeners(eventName) {
    if (eventName) {
      delete _listeners[eventName];
    } else {
      Object.keys(_listeners).forEach((k) => delete _listeners[k]);
    }
  },
};

export const EVENTS = {
  BATTLE_INIT: "battle:init",
  BATTLE_UPDATE: "battle:update",
  BATTLE_EVENT: "battle:event",
  BATTLE_THEME: "battle:theme",
  BATTLE_RESIZE: "battle:resize",
  BATTLE_DESTROY: "battle:destroy",
  SCENE_READY: "battle-scene:ready",
  ANIMATION_COMPLETE: "battle-animation:complete",
  SCENE_ERROR: "battle-scene:error",
};
