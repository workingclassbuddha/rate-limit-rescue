import { PROVIDERS, inferProvider } from './providers.js';

function providerLabel(meta = {}) {
  if (meta.providerLabel) {
    return meta.providerLabel;
  }

  if (meta.provider && PROVIDERS[meta.provider]) {
    return PROVIDERS[meta.provider].label;
  }

  if (meta.pageUrl) {
    return inferProvider(meta.pageUrl).label;
  }

  return 'Web Page';
}

export function describeComposer(input = {}) {
  const tagName = String(input.tagName || '').toLowerCase();

  if (input.kind === 'contenteditable') {
    return 'rich text composer';
  }

  if (tagName === 'textarea') {
    return 'textarea composer';
  }

  if (tagName === 'input') {
    return 'text field';
  }

  return 'composer';
}

export function formatInsertionSuccess(meta = {}) {
  const label = providerLabel(meta);
  const composer = describeComposer(meta.input);
  const pageTitle = String(meta.pageTitle || '').trim();
  const code = String(meta.code || '').toUpperCase();

  if (code === 'INSERTED_ONLY') {
    return {
      tone: 'success',
      summary: label === 'Web Page'
        ? `Inserted into the active ${composer}.`
        : `Inserted into ${label}.`,
      detail: 'Review the handoff, then press send when ready.',
    };
  }

  if (code === 'SUBMITTED_WITH_BUTTON') {
    return {
      tone: 'success',
      summary: `Inserted and sent in ${label}.`,
      detail: pageTitle
        ? `Rescue used the visible send button on "${pageTitle}".`
        : 'Rescue used the visible send button.',
    };
  }

  if (code === 'SEND_UNVERIFIED') {
    return {
      tone: 'warning',
      summary: label === 'Web Page'
        ? `Inserted into the active ${composer}.`
        : `Inserted into ${label}, but did not send.`,
      detail: 'No visible send button was available, so review the handoff and press send yourself.',
    };
  }

  if (label === 'Web Page') {
    return {
      tone: 'success',
      summary: `Inserted into the active ${composer}.`,
      detail: pageTitle
        ? `Rescue found a compatible composer on "${pageTitle}".`
        : 'Rescue found a compatible composer on this page.',
    };
  }

  return {
    tone: 'success',
    summary: `Inserted into ${label} using a ${composer}.`,
    detail: pageTitle
      ? `Pack inserted on "${pageTitle}".`
      : 'Pack inserted into the active page.',
  };
}

export function formatInsertionFailure(meta = {}) {
  const label = providerLabel(meta.detail || meta);
  const isKnownAssistant = label !== 'Web Page';
  const code = String(meta.code || '').toUpperCase();

  if (code === 'NO_COMPOSER') {
    return {
      tone: 'error',
      summary: isKnownAssistant
        ? `Couldn't find a visible ${label} composer.`
        : "Couldn't find a compatible composer on this page.",
      detail: isKnownAssistant
        ? 'Open a chat thread or click into the prompt box, then try again. Copy Handoff if you want to continue immediately.'
        : 'This page may not expose a chat-style prompt yet. Open a composer, or copy the handoff instead.',
    };
  }

  if (code === 'COMPOSER_NOT_VISIBLE') {
    return {
      tone: 'error',
      summary: 'Found a composer, but it is not visible yet.',
      detail: 'Open the prompt area or start a new thread, then try again. Copy Handoff stays available as a fallback.',
    };
  }

  if (code === 'COMPOSER_DISABLED' || code === 'COMPOSER_NOT_WRITABLE') {
    return {
      tone: 'error',
      summary: 'Found a composer, but it is not writable right now.',
      detail: 'Wait for the page to finish loading, or click into the active prompt box. You can also copy Markdown and paste it yourself.',
    };
  }

  if (code === 'INSERT_FAILED') {
    return {
      tone: 'error',
      summary: 'Found a composer, but the page blocked insertion.',
      detail: 'Copy Handoff instead, or paste into the active prompt manually.',
    };
  }

  if (code === 'INSERT_UNAVAILABLE') {
    return {
      tone: 'error',
      summary: 'Rescue could not reach an insertable composer.',
      detail: 'Reload the page or focus the active chat, then try again. Copy Handoff remains the safe fallback.',
    };
  }

  if (code === 'RESTRICTED_PAGE') {
    return {
      tone: 'error',
      summary: 'This page is not available for insertion.',
      detail: meta.error || 'Open a normal web page or assistant chat to continue.',
    };
  }

  return {
    tone: 'error',
    summary: 'Rescue could not insert this pack here.',
    detail: meta.error || 'Copy Handoff instead, or try another assistant tab.',
  };
}

export function formatInsertionResult(result = {}) {
  const meta = {
    ...(result.detail || {}),
    code: result.code,
    error: result.error,
  };

  if (!result.ok) {
    return formatInsertionFailure(meta);
  }

  return formatInsertionSuccess(meta);
}
