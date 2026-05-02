import assert from 'node:assert/strict';
import test from 'node:test';

import {
  describeComposer,
  formatInsertionFailure,
  formatInsertionResult,
  formatInsertionSuccess,
} from '../extension/lib/shared/insertion-feedback.js';

test('describeComposer identifies textarea and rich text inputs', () => {
  assert.equal(describeComposer({ tagName: 'textarea', kind: 'text-control' }), 'textarea composer');
  assert.equal(describeComposer({ tagName: 'div', kind: 'contenteditable' }), 'rich text composer');
  assert.equal(describeComposer({ tagName: 'input', kind: 'text-control' }), 'text field');
});

test('formatInsertionSuccess describes assistant and web-page insertions', () => {
  assert.deepEqual(
    formatInsertionSuccess({
      provider: 'claude',
      pageTitle: 'Claude',
      input: { tagName: 'textarea', kind: 'text-control' },
    }),
    {
      tone: 'success',
      summary: 'Inserted into Claude using a textarea composer.',
      detail: 'Pack inserted on "Claude".',
    },
  );

  assert.deepEqual(
    formatInsertionSuccess({
      provider: 'web',
      pageTitle: 'Local Tool',
      input: { tagName: 'div', kind: 'contenteditable' },
    }),
    {
      tone: 'success',
      summary: 'Inserted into the active rich text composer.',
      detail: 'Rescue found a compatible composer on "Local Tool".',
    },
  );
});

test('formatInsertionFailure gives actionable fallback guidance', () => {
  assert.deepEqual(
    formatInsertionFailure({
      code: 'NO_COMPOSER',
      detail: {
        provider: 'claude',
      },
    }),
    {
      tone: 'error',
      summary: "Couldn't find a visible Claude composer.",
      detail: 'Open a chat thread or click into the prompt box, then try again. Copy Handoff if you want to continue immediately.',
    },
  );

  assert.deepEqual(
    formatInsertionFailure({
      code: 'INSERT_FAILED',
      detail: {
        provider: 'web',
      },
    }),
    {
      tone: 'error',
      summary: 'Found a composer, but the page blocked insertion.',
      detail: 'Copy Handoff instead, or paste into the active prompt manually.',
    },
  );
});

test('formatInsertionResult describes inserted-only handoffs', () => {
  assert.deepEqual(
    formatInsertionResult({
      ok: true,
      code: 'INSERTED_ONLY',
      detail: {
        provider: 'claude',
        input: { tagName: 'div', kind: 'contenteditable' },
      },
    }),
    {
      tone: 'success',
      summary: 'Inserted into Claude.',
      detail: 'Review the handoff, then press send when ready.',
    },
  );
});

test('formatInsertionResult describes auto-send outcomes without overclaiming', () => {
  assert.deepEqual(
    formatInsertionResult({
      ok: true,
      code: 'SUBMITTED_WITH_BUTTON',
      detail: {
        provider: 'chatgpt',
        pageTitle: 'ChatGPT',
        input: { tagName: 'textarea', kind: 'text-control' },
      },
    }),
    {
      tone: 'success',
      summary: 'Inserted and sent in ChatGPT.',
      detail: 'Rescue used the visible send button on "ChatGPT".',
    },
  );

  assert.deepEqual(
    formatInsertionResult({
      ok: true,
      code: 'SEND_UNVERIFIED',
      detail: {
        provider: 'gemini',
        input: { tagName: 'textarea', kind: 'text-control' },
      },
    }),
    {
      tone: 'warning',
      summary: 'Inserted into Gemini, but did not send.',
      detail: 'No visible send button was available, so review the handoff and press send yourself.',
    },
  );
});

test('formatInsertionResult describes disabled or missing composers', () => {
  assert.deepEqual(
    formatInsertionResult({
      ok: false,
      code: 'NO_COMPOSER',
      detail: {
        provider: 'claude',
      },
    }),
    {
      tone: 'error',
      summary: "Couldn't find a visible Claude composer.",
      detail: 'Open a chat thread or click into the prompt box, then try again. Copy Handoff if you want to continue immediately.',
    },
  );

  assert.deepEqual(
    formatInsertionResult({
      ok: false,
      code: 'COMPOSER_NOT_WRITABLE',
      detail: {
        provider: 'perplexity',
      },
    }),
    {
      tone: 'error',
      summary: 'Found a composer, but it is not writable right now.',
      detail: 'Wait for the page to finish loading, or click into the active prompt box. You can also copy Markdown and paste it yourself.',
    },
  );
});
