import {
  LEGACY_PROTOCOL_VERSION,
  MAX_MESSAGES,
  PROTOCOL_NAME,
  PROTOCOL_VERSION,
} from './constants.js';
import { inferProvider, targetUrl } from './providers.js';
import { canonicalizeUrl, normalizeWhitespace, truncateText } from './utils.js';

const REVIEW_STATUS = {
  captured: 'captured',
  prepared: 'prepared',
  reviewed: 'reviewed',
  inserted: 'inserted',
  exported: 'exported',
  imported: 'imported',
};

export function normalizeMessages(messages = []) {
  return (Array.isArray(messages) ? messages : [])
    .map((message) => ({
      role: ['user', 'assistant', 'system'].includes(message?.role) ? message.role : 'unknown',
      text: truncateText(normalizeWhitespace(message?.text || ''), 4000),
      timestamp: message?.timestamp || '',
    }))
    .filter((message) => message.text)
    .slice(-MAX_MESSAGES);
}

function normalizeStringList(items = []) {
  return (Array.isArray(items) ? items : [])
    .map((item) => normalizeWhitespace(item))
    .filter(Boolean)
    .slice(0, 12);
}

function normalizeArtifacts(raw = {}) {
  return {
    selectedText: truncateText(raw?.selectedText || '', 3000),
    pageText: truncateText(raw?.pageText || '', 8000),
    messages: normalizeMessages(raw?.messages || []),
    attachments: (Array.isArray(raw?.attachments) ? raw.attachments : [])
      .map((attachment) => ({
        type: normalizeWhitespace(attachment?.type || ''),
        label: normalizeWhitespace(attachment?.label || ''),
        url: canonicalizeUrl(attachment?.url || ''),
      }))
      .filter((attachment) => attachment.type || attachment.label || attachment.url)
      .slice(0, 12),
  };
}

function normalizeTask(raw = {}) {
  return {
    goal: normalizeWhitespace(raw?.goal || '') || 'Continue this AI session in another assistant.',
    currentState: normalizeWhitespace(raw?.currentState || ''),
    decisions: normalizeStringList(raw?.decisions || []),
    constraints: normalizeStringList(raw?.constraints || []),
    openQuestions: normalizeStringList(raw?.openQuestions || []),
    nextSteps: normalizeStringList(raw?.nextSteps || []),
  };
}

function normalizeTarget(raw = {}) {
  const provider = raw?.app ? inferProvider(targetUrl(raw.app)) : null;
  return {
    app: normalizeWhitespace(raw?.app || ''),
    label: normalizeWhitespace(raw?.label || provider?.label || ''),
    url: canonicalizeUrl(raw?.url || (raw?.app ? targetUrl(raw.app) : '')),
    intent: normalizeWhitespace(raw?.intent || ''),
  };
}

function normalizeReview(raw = {}) {
  const status = REVIEW_STATUS[raw?.status] ? raw.status : REVIEW_STATUS.captured;
  return {
    status,
    localOnly: raw?.localOnly !== false,
    userReviewed: Boolean(raw?.userReviewed),
    userMediated: raw?.userMediated !== false,
    autoSendAllowed: raw?.autoSendAllowed === true,
    notes: truncateText(normalizeWhitespace(raw?.notes || ''), 500),
  };
}

function normalizeSource(raw = {}, sourceUrl = '') {
  const provider = inferProvider(sourceUrl);
  return {
    app: raw?.app || provider.id,
    label: raw?.label || provider.label,
    title: raw?.title || 'Untitled context',
    url: canonicalizeUrl(sourceUrl),
    hostname: raw?.hostname || '',
    pageType: raw?.pageType || '',
    description: truncateText(raw?.description || '', 500),
    headings: normalizeStringList(raw?.headings || []),
    provenance: {
      captureMethod: normalizeWhitespace(raw?.provenance?.captureMethod || raw?.captureMethod || 'user-captured'),
      capturedBy: normalizeWhitespace(raw?.provenance?.capturedBy || raw?.capturedBy || 'open-context'),
      capturedAt: raw?.provenance?.capturedAt || raw?.capturedAt || '',
      userInitiated: raw?.provenance?.userInitiated !== false,
    },
  };
}

function taskFromLegacy(raw = {}) {
  return normalizeTask(raw?.summary || raw?.task || {});
}

export function isLegacyContextPack(raw = {}) {
  return raw?.protocol === PROTOCOL_NAME && raw?.version === LEGACY_PROTOCOL_VERSION;
}

export function buildContinuationPrompt(pack) {
  const task = pack?.task || pack?.summary || {};
  const target = pack?.target?.label ? `Target: ${pack.target.label}` : '';
  return [
    'Continue from this Open Context Pack.',
    '',
    `Goal: ${task.goal || 'Continue this work from the captured context.'}`,
    task.currentState ? `Current state: ${task.currentState}` : '',
    target,
    'Preserve the user intent, decisions, constraints, open questions, and next steps. Continue naturally without asking the user to repeat context.',
  ].filter(Boolean).join('\n');
}

export function coerceContextPack(raw = {}, {
  now = () => new Date().toISOString(),
  uuid = () => crypto.randomUUID(),
} = {}) {
  const sourceUrl = raw?.source?.url || raw?.url || '';
  const createdAt = raw?.createdAt || now();
  const task = normalizeTask(raw?.task || raw?.summary || {});
  const target = normalizeTarget(raw?.target || {});
  const review = normalizeReview(raw?.review || {});
  const pack = {
    protocol: raw?.protocol || PROTOCOL_NAME,
    version: PROTOCOL_VERSION,
    id: raw?.id || uuid(),
    createdAt,
    source: normalizeSource({
      ...(raw?.source || {}),
      title: raw?.source?.title || raw?.title || 'Untitled context',
      provenance: {
        ...(raw?.source?.provenance || {}),
        capturedAt: raw?.source?.provenance?.capturedAt || createdAt,
      },
    }, sourceUrl),
    task,
    artifacts: normalizeArtifacts(raw?.artifacts || {}),
    target,
    review,
  };

  if (raw?.savedAt) {
    pack.savedAt = raw.savedAt;
  }

  return {
    ...pack,
    continuationPrompt: normalizeWhitespace(raw?.continuationPrompt || '') || buildContinuationPrompt(pack),
  };
}

export function upgradeLegacyContextPack(raw = {}, options = {}) {
  if (!isLegacyContextPack(raw)) {
    return coerceContextPack(raw, options);
  }

  return coerceContextPack({
    ...raw,
    version: PROTOCOL_VERSION,
    task: taskFromLegacy(raw),
    review: {
      status: 'imported',
      localOnly: true,
      userReviewed: false,
      userMediated: true,
      autoSendAllowed: false,
      notes: 'Upgraded from Open Context Pack v0.1.',
    },
  }, options);
}

export function exportLegacyContextPack(pack = {}) {
  const normalized = coerceContextPack(pack);
  return {
    protocol: PROTOCOL_NAME,
    version: LEGACY_PROTOCOL_VERSION,
    id: normalized.id,
    createdAt: normalized.createdAt,
    ...(normalized.savedAt ? { savedAt: normalized.savedAt } : {}),
    source: {
      app: normalized.source.app,
      label: normalized.source.label,
      title: normalized.source.title,
      url: normalized.source.url,
      hostname: normalized.source.hostname,
      pageType: normalized.source.pageType,
      description: normalized.source.description,
      headings: normalized.source.headings,
    },
    summary: {
      goal: normalized.task.goal,
      currentState: normalized.task.currentState,
      decisions: normalized.task.decisions,
      constraints: normalized.task.constraints,
      openQuestions: normalized.task.openQuestions,
    },
    artifacts: {
      selectedText: normalized.artifacts.selectedText,
      pageText: normalized.artifacts.pageText,
      messages: normalized.artifacts.messages,
    },
    continuationPrompt: normalized.continuationPrompt,
  };
}

export function createContextPack({
  page = {},
  aiContext = {},
  goal = '',
  target = {},
  now = () => new Date().toISOString(),
  uuid = () => crypto.randomUUID(),
} = {}) {
  const sourceProvider = inferProvider(aiContext.url || page.url || '');
  const messages = normalizeMessages(aiContext.messages || []);
  const title = aiContext.title || page.title || 'Untitled context';
  const pageText = truncateText(page.text || aiContext.text || '', 8000);
  const selectedText = truncateText(page.selection || '', 3000);
  const currentState = messages.length
    ? `Captured ${messages.length} recent messages from ${sourceProvider.label}.`
    : `Captured page context from ${sourceProvider.label}.`;
  const createdAt = now();

  return coerceContextPack({
    protocol: PROTOCOL_NAME,
    version: PROTOCOL_VERSION,
    id: uuid(),
    createdAt,
    source: {
      app: sourceProvider.id,
      label: sourceProvider.label,
      title,
      url: canonicalizeUrl(aiContext.url || page.url || ''),
      hostname: page.hostname || '',
      pageType: page.pageType || '',
      description: page.description || '',
      headings: page.headings || [],
      provenance: {
        captureMethod: messages.length ? 'assistant-message-adapter' : 'visible-page-context',
        capturedBy: 'open-context-extension',
        capturedAt: createdAt,
        userInitiated: true,
      },
    },
    task: {
      goal: normalizeWhitespace(goal) || 'Continue this AI session in another assistant.',
      currentState,
      decisions: [],
      constraints: [],
      openQuestions: [],
      nextSteps: [],
    },
    artifacts: {
      selectedText,
      pageText,
      messages,
      attachments: [],
    },
    target,
    review: {
      status: 'captured',
      localOnly: true,
      userReviewed: false,
      userMediated: true,
      autoSendAllowed: false,
      notes: '',
    },
  }, { now, uuid });
}

function appendListSection(sections, heading, items = []) {
  if (!items.length) return;
  sections.push('', `## ${heading}`);
  for (const item of items) {
    sections.push(`- ${item}`);
  }
}

export function formatContextPackMarkdown(rawPack) {
  const pack = coerceContextPack(rawPack);
  const messages = normalizeMessages(pack.artifacts.messages || []);
  const sections = [
    '# Open Context Pack',
    '',
    `Protocol: ${pack.protocol} v${pack.version}`,
    `Source: ${pack.source.label || pack.source.app || 'Unknown'}`,
    pack.source.title ? `Title: ${pack.source.title}` : '',
    pack.source.url ? `URL: ${pack.source.url}` : '',
    pack.createdAt ? `Captured: ${pack.createdAt}` : '',
    pack.target?.label ? `Target: ${pack.target.label}` : '',
    '',
    '## Continuation Prompt',
    pack.continuationPrompt || buildContinuationPrompt(pack),
    '',
    '## Goal',
    pack.task.goal || 'Continue this AI session in another assistant.',
    '',
    '## Current State',
    pack.task.currentState || 'Context captured from the source assistant.',
  ].filter((line) => line !== '');

  appendListSection(sections, 'Decisions', pack.task.decisions);
  appendListSection(sections, 'Constraints', pack.task.constraints);
  appendListSection(sections, 'Open Questions', pack.task.openQuestions);
  appendListSection(sections, 'Next Steps', pack.task.nextSteps);

  if (messages.length) {
    sections.push('', '## Recent Conversation');
    for (const message of messages) {
      sections.push('', `### ${message.role}`, message.text);
    }
  }

  if (pack.artifacts.selectedText) {
    sections.push('', '## Selected Text', pack.artifacts.selectedText);
  }

  if (pack.artifacts.pageText && !messages.length) {
    sections.push('', '## Page Context', truncateText(pack.artifacts.pageText, 6000));
  }

  sections.push(
    '',
    '## Review Boundary',
    pack.review.localOnly
      ? 'This pack stayed local until the user copied, exported, or inserted it.'
      : 'This pack may have been exported or inserted by the user.',
    pack.review.userMediated
      ? 'Browser handoffs are review-and-send only.'
      : '',
  );

  return `${sections.filter((line) => line !== '').join('\n')}\n`;
}
