import { MAX_RECENT_PACKS, STORAGE_KEYS } from '../shared/constants.js';
import { upgradeLegacyContextPack } from '../shared/context-pack.js';
import { assertValidContextPack } from '../shared/context-pack-validation.js';

export function createStorageApi({
  storage = globalThis.chrome?.storage?.local,
  now = () => new Date().toISOString(),
} = {}) {
  async function saveContextPack(pack) {
    const validatedPack = assertValidContextPack(upgradeLegacyContextPack(pack));
    const withSavedAt = assertValidContextPack({
      ...validatedPack,
      savedAt: now(),
    });
    const data = await storage.get({
      [STORAGE_KEYS.recentPacks]: [],
    });
    const recent = [
      withSavedAt,
      ...(data[STORAGE_KEYS.recentPacks] || []).filter((item) => item.id !== withSavedAt.id),
    ].slice(0, MAX_RECENT_PACKS);

    await storage.set({
      [STORAGE_KEYS.latestPack]: withSavedAt,
      [STORAGE_KEYS.recentPacks]: recent,
      [STORAGE_KEYS.activePackId]: withSavedAt.id,
    });

    return withSavedAt;
  }

  async function getLatestContextPack() {
    const data = await storage.get({
      [STORAGE_KEYS.latestPack]: null,
    });
    return data[STORAGE_KEYS.latestPack] ? upgradeLegacyContextPack(data[STORAGE_KEYS.latestPack]) : null;
  }

  async function getRecentContextPacks() {
    const data = await storage.get({
      [STORAGE_KEYS.recentPacks]: [],
    });
    return (data[STORAGE_KEYS.recentPacks] || []).map((pack) => upgradeLegacyContextPack(pack));
  }

  async function getContextPackById(id) {
    if (!id) {
      return null;
    }

    const recent = await getRecentContextPacks();
    return recent.find((pack) => pack.id === id) || null;
  }

  async function getActiveContextPack() {
    const data = await storage.get({
      [STORAGE_KEYS.latestPack]: null,
      [STORAGE_KEYS.recentPacks]: [],
      [STORAGE_KEYS.activePackId]: '',
    });

    const activeId = data[STORAGE_KEYS.activePackId] || '';
    const recent = (data[STORAGE_KEYS.recentPacks] || []).map((pack) => upgradeLegacyContextPack(pack));
    if (activeId) {
      const activePack = recent.find((pack) => pack.id === activeId);
      if (activePack) {
        return activePack;
      }
    }

    return data[STORAGE_KEYS.latestPack] ? upgradeLegacyContextPack(data[STORAGE_KEYS.latestPack]) : null;
  }

  async function setActiveContextPack(id) {
    const pack = await getContextPackById(id);
    if (!pack) {
      return null;
    }

    await storage.set({
      [STORAGE_KEYS.activePackId]: pack.id,
    });

    return pack;
  }

  return {
    saveContextPack,
    getLatestContextPack,
    getRecentContextPacks,
    getContextPackById,
    getActiveContextPack,
    setActiveContextPack,
  };
}
