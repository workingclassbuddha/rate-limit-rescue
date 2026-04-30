import assert from 'node:assert/strict';
import test from 'node:test';

import {
  createContextPack as createCoreContextPack,
  formatContextPackMarkdown as formatCoreContextPackMarkdown,
  targetProviderList as coreTargetProviderList,
  validateContextPack as validateCoreContextPack,
} from '../packages/core/index.js';
import {
  createContextPack,
  formatContextPackMarkdown,
} from '../extension/lib/shared/context-pack.js';
import { targetProviderList } from '../extension/lib/shared/providers.js';

test('core wrapper preserves context pack behavior', () => {
  const input = {
    page: {
      title: 'Chrome handoff',
      url: 'https://chatgpt.com/c/chrome',
      hostname: 'chatgpt.com',
      pageType: 'app',
      description: 'A rate-limit rescue handoff.',
      headings: ['Rescue'],
    },
    aiContext: {
      messages: [
        { role: 'user', text: 'I hit a message limit.' },
        { role: 'assistant', text: 'Prepare a portable handoff.' },
      ],
    },
    goal: 'Continue in Claude because ChatGPT is rate limited.',
    now: () => '2026-04-25T00:00:00.000Z',
    uuid: () => 'core-pack-1',
  };

  const corePack = createCoreContextPack(input);
  const extensionPack = createContextPack(input);

  assert.deepEqual(corePack, extensionPack);
  assert.equal(validateCoreContextPack(corePack).ok, true);
  assert.equal(formatCoreContextPackMarkdown(corePack), formatContextPackMarkdown(extensionPack));
});

test('core wrapper exposes the same target provider metadata as the extension', () => {
  assert.deepEqual(coreTargetProviderList(), targetProviderList());
});
