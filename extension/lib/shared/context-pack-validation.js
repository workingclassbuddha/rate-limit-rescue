import {
  LEGACY_PROTOCOL_VERSION,
  PROTOCOL_NAME,
  PROTOCOL_VERSION,
} from './constants.js';

const MESSAGE_ROLES = new Set(['user', 'assistant', 'system', 'unknown']);
const REVIEW_STATUSES = new Set(['captured', 'prepared', 'reviewed', 'inserted', 'exported', 'imported']);

function hasText(value) {
  return typeof value === 'string' && value.trim().length > 0;
}

function isOptionalString(value) {
  return value === undefined || typeof value === 'string';
}

function isStringArray(value) {
  return Array.isArray(value) && value.every((item) => typeof item === 'string');
}

function pushIfInvalid(errors, condition, message) {
  if (!condition) {
    errors.push(message);
  }
}

function isIsoTimestamp(value) {
  return typeof value === 'string' && Number.isFinite(Date.parse(value));
}

function validateTaskList(errors, label, value) {
  pushIfInvalid(errors, isStringArray(value), `${label} must be an array of strings.`);
}

function validateMessage(errors, message, index) {
  pushIfInvalid(errors, message && typeof message === 'object', `artifacts.messages[${index}] must be an object.`);
  if (!message || typeof message !== 'object') {
    return;
  }

  pushIfInvalid(errors, MESSAGE_ROLES.has(message.role), `artifacts.messages[${index}].role must be one of user, assistant, system, or unknown.`);
  pushIfInvalid(errors, hasText(message.text), `artifacts.messages[${index}].text must be a non-empty string.`);
  if (message.timestamp !== undefined && message.timestamp !== '') {
    pushIfInvalid(errors, isIsoTimestamp(message.timestamp), `artifacts.messages[${index}].timestamp must be an ISO timestamp when present.`);
  }
}

function validateSource(errors, source = {}) {
  pushIfInvalid(errors, source && typeof source === 'object', 'source must be an object.');
  if (!source || typeof source !== 'object') {
    return;
  }

  pushIfInvalid(errors, hasText(source.app), 'source.app must be a non-empty string.');
  pushIfInvalid(errors, hasText(source.label), 'source.label must be a non-empty string.');
  pushIfInvalid(errors, hasText(source.title), 'source.title must be a non-empty string.');
  pushIfInvalid(errors, hasText(source.url), 'source.url must be a non-empty string.');
  pushIfInvalid(errors, typeof source.hostname === 'string', 'source.hostname must be a string.');
  pushIfInvalid(errors, isOptionalString(source.pageType), 'source.pageType must be a string when present.');
  pushIfInvalid(errors, isOptionalString(source.description), 'source.description must be a string when present.');
  pushIfInvalid(errors, source.headings === undefined || isStringArray(source.headings), 'source.headings must be an array of strings when present.');

  const provenance = source.provenance;
  pushIfInvalid(errors, provenance && typeof provenance === 'object', 'source.provenance must be an object.');
  if (provenance && typeof provenance === 'object') {
    pushIfInvalid(errors, hasText(provenance.captureMethod), 'source.provenance.captureMethod must be a non-empty string.');
    pushIfInvalid(errors, hasText(provenance.capturedBy), 'source.provenance.capturedBy must be a non-empty string.');
    if (provenance.capturedAt !== undefined && provenance.capturedAt !== '') {
      pushIfInvalid(errors, isIsoTimestamp(provenance.capturedAt), 'source.provenance.capturedAt must be an ISO timestamp when present.');
    }
    pushIfInvalid(errors, typeof provenance.userInitiated === 'boolean', 'source.provenance.userInitiated must be a boolean.');
  }
}

function validateTask(errors, task = {}) {
  pushIfInvalid(errors, task && typeof task === 'object', 'task must be an object.');
  if (!task || typeof task !== 'object') {
    return;
  }

  pushIfInvalid(errors, hasText(task.goal), 'task.goal must be a non-empty string.');
  pushIfInvalid(errors, hasText(task.currentState), 'task.currentState must be a non-empty string.');
  validateTaskList(errors, 'task.decisions', task.decisions);
  validateTaskList(errors, 'task.constraints', task.constraints);
  validateTaskList(errors, 'task.openQuestions', task.openQuestions);
  validateTaskList(errors, 'task.nextSteps', task.nextSteps);
}

function validateArtifacts(errors, artifacts = {}) {
  pushIfInvalid(errors, artifacts && typeof artifacts === 'object', 'artifacts must be an object.');
  if (!artifacts || typeof artifacts !== 'object') {
    return;
  }

  pushIfInvalid(errors, typeof artifacts.selectedText === 'string', 'artifacts.selectedText must be a string.');
  pushIfInvalid(errors, typeof artifacts.pageText === 'string', 'artifacts.pageText must be a string.');
  pushIfInvalid(errors, Array.isArray(artifacts.messages), 'artifacts.messages must be an array.');
  pushIfInvalid(errors, Array.isArray(artifacts.attachments), 'artifacts.attachments must be an array.');

  if (Array.isArray(artifacts.messages)) {
    artifacts.messages.forEach((message, index) => validateMessage(errors, message, index));
  }
}

function validateTarget(errors, target = {}) {
  pushIfInvalid(errors, target && typeof target === 'object', 'target must be an object.');
  if (!target || typeof target !== 'object') {
    return;
  }

  pushIfInvalid(errors, typeof target.app === 'string', 'target.app must be a string.');
  pushIfInvalid(errors, typeof target.label === 'string', 'target.label must be a string.');
  pushIfInvalid(errors, typeof target.url === 'string', 'target.url must be a string.');
  pushIfInvalid(errors, typeof target.intent === 'string', 'target.intent must be a string.');
}

function validateReview(errors, review = {}) {
  pushIfInvalid(errors, review && typeof review === 'object', 'review must be an object.');
  if (!review || typeof review !== 'object') {
    return;
  }

  pushIfInvalid(errors, REVIEW_STATUSES.has(review.status), 'review.status must be a known review status.');
  pushIfInvalid(errors, typeof review.localOnly === 'boolean', 'review.localOnly must be a boolean.');
  pushIfInvalid(errors, typeof review.userReviewed === 'boolean', 'review.userReviewed must be a boolean.');
  pushIfInvalid(errors, typeof review.userMediated === 'boolean', 'review.userMediated must be a boolean.');
  pushIfInvalid(errors, typeof review.autoSendAllowed === 'boolean', 'review.autoSendAllowed must be a boolean.');
  pushIfInvalid(errors, typeof review.notes === 'string', 'review.notes must be a string.');
}

export function validateLegacyContextPack(pack = {}) {
  const errors = [];
  pushIfInvalid(errors, pack?.protocol === PROTOCOL_NAME, `protocol must be "${PROTOCOL_NAME}".`);
  pushIfInvalid(errors, pack?.version === LEGACY_PROTOCOL_VERSION, `version must be "${LEGACY_PROTOCOL_VERSION}".`);
  pushIfInvalid(errors, hasText(pack?.id), 'id must be a non-empty string.');
  pushIfInvalid(errors, isIsoTimestamp(pack?.createdAt), 'createdAt must be an ISO timestamp.');

  const summary = pack?.summary;
  pushIfInvalid(errors, summary && typeof summary === 'object', 'summary must be an object.');
  if (summary && typeof summary === 'object') {
    pushIfInvalid(errors, hasText(summary.goal), 'summary.goal must be a non-empty string.');
    pushIfInvalid(errors, hasText(summary.currentState), 'summary.currentState must be a non-empty string.');
    validateTaskList(errors, 'summary.decisions', summary.decisions);
    validateTaskList(errors, 'summary.constraints', summary.constraints);
    validateTaskList(errors, 'summary.openQuestions', summary.openQuestions);
  }

  validateSource(errors, {
    ...(pack?.source || {}),
    provenance: {
      captureMethod: 'legacy-v0.1',
      capturedBy: 'open-context',
      capturedAt: pack?.createdAt || '',
      userInitiated: true,
    },
  });
  validateArtifacts(errors, {
    ...(pack?.artifacts || {}),
    attachments: [],
  });
  pushIfInvalid(errors, hasText(pack?.continuationPrompt), 'continuationPrompt must be a non-empty string.');

  return {
    ok: errors.length === 0,
    errors,
  };
}

export function validateContextPack(pack = {}) {
  if (pack?.version === LEGACY_PROTOCOL_VERSION) {
    return validateLegacyContextPack(pack);
  }

  const errors = [];
  pushIfInvalid(errors, pack?.protocol === PROTOCOL_NAME, `protocol must be "${PROTOCOL_NAME}".`);
  pushIfInvalid(errors, pack?.version === PROTOCOL_VERSION, `version must be "${PROTOCOL_VERSION}".`);
  pushIfInvalid(errors, hasText(pack?.id), 'id must be a non-empty string.');
  pushIfInvalid(errors, isIsoTimestamp(pack?.createdAt), 'createdAt must be an ISO timestamp.');

  if (pack?.savedAt !== undefined && pack.savedAt !== '') {
    pushIfInvalid(errors, isIsoTimestamp(pack.savedAt), 'savedAt must be an ISO timestamp when present.');
  }

  validateSource(errors, pack?.source);
  validateTask(errors, pack?.task);
  validateArtifacts(errors, pack?.artifacts);
  validateTarget(errors, pack?.target);
  validateReview(errors, pack?.review);
  pushIfInvalid(errors, hasText(pack?.continuationPrompt), 'continuationPrompt must be a non-empty string.');

  return {
    ok: errors.length === 0,
    errors,
  };
}

export function assertValidContextPack(pack) {
  const validation = validateContextPack(pack);
  if (!validation.ok) {
    throw new Error(`Invalid Open Context Pack: ${validation.errors.join(' ')}`);
  }
  return pack;
}
