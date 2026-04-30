import assert from 'node:assert/strict';
import test from 'node:test';

import { createStorageApi } from '../extension/lib/background/storage.js';
import { createContextPack } from '../extension/lib/shared/context-pack.js';

function createMemoryStorage() {
  const data = {};
  return {
    async get(defaults) {
      const result = {};
      for (const [key, fallback] of Object.entries(defaults)) {
        result[key] = Object.hasOwn(data, key) ? data[key] : fallback;
      }
      return result;
    },
    async set(values) {
      Object.assign(data, values);
    },
  };
}

function buildPack(id, title) {
  return createContextPack({
    page: {
      title,
      url: `https://example.com/${id}`,
      hostname: 'example.com',
    },
    goal: `Continue ${title}.`,
    now: () => '2026-04-21T00:00:00.000Z',
    uuid: () => id,
  });
}

test('storage keeps recent packs and retrieves a selected pack by id', async () => {
  const storage = createMemoryStorage();
  const api = createStorageApi({
    storage,
    now: () => '2026-04-21T00:01:00.000Z',
  });

  const first = await api.saveContextPack(buildPack('pack-1', 'First'));
  const second = await api.saveContextPack(buildPack('pack-2', 'Second'));

  const latest = await api.getLatestContextPack();
  const recent = await api.getRecentContextPacks();
  const selected = await api.getContextPackById(first.id);
  const activeBeforeSelection = await api.getActiveContextPack();
  const activeAfterSelection = await api.setActiveContextPack(first.id);

  assert.equal(latest.id, second.id);
  assert.deepEqual(recent.map((pack) => pack.id), [second.id, first.id]);
  assert.equal(selected.id, first.id);
  assert.equal(selected.savedAt, first.savedAt);
  assert.equal(activeBeforeSelection.id, second.id);
  assert.equal(activeAfterSelection.id, first.id);
  assert.equal((await api.getActiveContextPack()).id, first.id);
});

test('storage rejects invalid imported packs', async () => {
  const api = createStorageApi({
    storage: createMemoryStorage(),
    now: () => '2026-04-21T00:01:00.000Z',
  });

  await assert.rejects(
    () => api.saveContextPack({ protocol: 'not-open-context-protocol' }),
    /Invalid Open Context Pack/,
  );
});
