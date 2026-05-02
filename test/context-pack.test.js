import assert from 'node:assert/strict';
import test from 'node:test';

import {
  coerceContextPack,
  createContextPack,
  exportLegacyContextPack,
  formatContextPackMarkdown,
  isLegacyContextPack,
  upgradeLegacyContextPack,
} from '../extension/lib/shared/context-pack.js';
import { inferProvider, targetProviderList } from '../extension/lib/shared/providers.js';

test('inferProvider identifies supported AI hosts', () => {
  assert.equal(inferProvider('https://chatgpt.com/c/123').id, 'chatgpt');
  assert.equal(inferProvider('https://claude.ai/chat/123').id, 'claude');
  assert.equal(inferProvider('https://gemini.google.com/app').id, 'gemini');
  assert.equal(inferProvider('https://chat.deepseek.com/a/chat/s/123').id, 'deepseek');
  assert.equal(inferProvider('https://www.perplexity.ai/search/test').id, 'perplexity');
  assert.equal(inferProvider('https://copilot.microsoft.com/').id, 'copilot');
  assert.equal(inferProvider('https://poe.com/Assistant').id, 'poe');
  assert.equal(inferProvider('https://chat.mistral.ai/chat').id, 'lechat');
  assert.equal(inferProvider('https://grok.com/').id, 'grok');
  assert.equal(inferProvider('https://huggingface.co/chat/').id, 'huggingchat');
  assert.equal(inferProvider('https://qwen.ai/qwenchat').id, 'qwen');
});

test('target providers expose honest support tiers', () => {
  const providers = targetProviderList();
  const byId = Object.fromEntries(providers.map((provider) => [provider.id, provider]));

  assert.equal(byId.chatgpt.supportLevel, 'adapter');
  assert.equal(byId.claude.supportLabel, 'Message adapter');
  assert.equal(byId.gemini.supportLevel, 'adapter');
  assert.equal(byId.deepseek.supportLevel, 'adapter');
  assert.equal(byId.perplexity.supportLevel, 'generic');
  assert.equal(byId.qwen.supportLabel, 'Generic composer support');
  assert.deepEqual(providers.slice(0, 4).map((provider) => provider.id), [
    'chatgpt',
    'claude',
    'gemini',
    'deepseek',
  ]);
});

test('createContextPack builds a portable pack with recent messages', () => {
  const pack = createContextPack({
    page: {
      title: 'Build plan',
      url: 'https://chatgpt.com/c/test#fragment',
      hostname: 'chatgpt.com',
      pageType: 'app',
      description: 'A working build plan.',
      headings: ['Plan', 'Next steps'],
    },
    aiContext: {
      messages: [
        { role: 'user', text: 'Make an open context protocol.' },
        { role: 'assistant', text: 'Start with a context pack schema.' },
      ],
    },
    goal: 'Continue in Claude.',
    now: () => '2026-04-21T00:00:00.000Z',
    uuid: () => 'pack-1',
  });

  assert.equal(pack.protocol, 'open-context-protocol');
  assert.equal(pack.version, '0.2');
  assert.equal(pack.id, 'pack-1');
  assert.equal(pack.source.app, 'chatgpt');
  assert.equal(pack.source.url, 'https://chatgpt.com/c/test');
  assert.equal(pack.source.pageType, 'app');
  assert.equal(pack.source.description, 'A working build plan.');
  assert.deepEqual(pack.source.headings, ['Plan', 'Next steps']);
  assert.equal(pack.source.provenance.captureMethod, 'assistant-message-adapter');
  assert.equal(Object.hasOwn(pack.source, 'target'), false);
  assert.equal(pack.task.goal, 'Continue in Claude.');
  assert.equal(pack.review.localOnly, true);
  assert.equal(pack.artifacts.messages.length, 2);
  assert.match(pack.continuationPrompt, /Continue in Claude/);
});

test('formatContextPackMarkdown produces a pasteable handoff', () => {
  const pack = createContextPack({
    page: { title: 'Session', url: 'https://claude.ai/chat/1' },
    aiContext: {
      messages: [{ role: 'user', text: 'What changed?' }],
    },
    now: () => '2026-04-21T00:00:00.000Z',
    uuid: () => 'pack-2',
  });

  const markdown = formatContextPackMarkdown(pack);
  assert.match(markdown, /# Open Context Pack/);
  assert.match(markdown, /Protocol: open-context-protocol v0\.2/);
  assert.match(markdown, /## Continuation Prompt/);
  assert.match(markdown, /### user/);
  assert.match(markdown, /## Review Boundary/);
});

test('coerceContextPack normalizes imported payloads', () => {
  const pack = coerceContextPack({
    source: {
      title: 'Imported handoff',
      url: 'https://chat.deepseek.com/a/chat/s/1#hash',
    },
    summary: {
      goal: ' Resume the work ',
      currentState: ' Imported from old shape ',
      decisions: [' Use DeepSeek for reasoning '],
    },
    artifacts: {
      messages: [{ role: 'assistant', text: '  Keep going with the plan.  ' }],
    },
  }, {
    now: () => '2026-04-22T00:00:00.000Z',
    uuid: () => 'import-1',
  });

  assert.equal(pack.id, 'import-1');
  assert.equal(pack.source.app, 'deepseek');
  assert.equal(pack.source.url, 'https://chat.deepseek.com/a/chat/s/1');
  assert.equal(Object.hasOwn(pack.source, 'target'), false);
  assert.equal(pack.task.goal, 'Resume the work');
  assert.equal(pack.task.currentState, 'Imported from old shape');
  assert.equal(pack.task.decisions[0], 'Use DeepSeek for reasoning');
  assert.equal(pack.artifacts.messages[0].text, 'Keep going with the plan.');
});

test('v0.1 packs upgrade to v0.2 and can export a legacy copy', () => {
  const legacy = {
    protocol: 'open-context-protocol',
    version: '0.1',
    id: 'legacy-1',
    createdAt: '2026-04-22T00:00:00.000Z',
    source: {
      app: 'chatgpt',
      label: 'ChatGPT',
      title: 'Legacy handoff',
      url: 'https://chatgpt.com/c/legacy',
      hostname: 'chatgpt.com',
      pageType: 'app',
    },
    summary: {
      goal: 'Continue the legacy work.',
      currentState: 'Legacy state.',
      decisions: ['Keep it local.'],
      constraints: [],
      openQuestions: [],
    },
    artifacts: {
      selectedText: '',
      pageText: '',
      messages: [{ role: 'user', text: 'Legacy message' }],
    },
    continuationPrompt: 'Continue from legacy.',
  };

  const upgraded = upgradeLegacyContextPack(legacy);
  const coerced = coerceContextPack(legacy);
  const downgraded = exportLegacyContextPack(upgraded);

  assert.equal(isLegacyContextPack(legacy), true);
  assert.equal(upgraded.version, '0.2');
  assert.equal(upgraded.protocol, 'open-context-protocol');
  assert.equal(upgraded.task.goal, 'Continue the legacy work.');
  assert.equal(upgraded.review.status, 'imported');
  assert.equal(coerced.version, '0.2');
  assert.equal(coerced.protocol, 'open-context-protocol');
  assert.equal(coerced.task.goal, 'Continue the legacy work.');
  assert.equal(downgraded.version, '0.1');
  assert.equal(downgraded.summary.goal, upgraded.task.goal);
});
