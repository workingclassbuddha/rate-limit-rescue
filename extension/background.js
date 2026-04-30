import { CONTEXT_MENU_IDS } from './lib/shared/constants.js';
import { createContextPack, formatContextPackMarkdown, upgradeLegacyContextPack } from './lib/shared/context-pack.js';
import { formatInsertionResult } from './lib/shared/insertion-feedback.js';
import { inferProvider, isSupportedAiUrl, providerList, targetProviderList, targetUrl } from './lib/shared/providers.js';
import { createPageContextApi } from './lib/background/page-context.js';
import { createStorageApi } from './lib/background/storage.js';

const pageContextApi = createPageContextApi();
const storageApi = createStorageApi();
const supportedAiDocumentPatterns = providerList()
  .flatMap((provider) => provider.origins.map((origin) => `${origin}/*`));

function sleep(ms) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

function callbackPromise(fn) {
  return new Promise((resolve, reject) => {
    fn((result) => {
      const error = chrome.runtime.lastError;
      if (error) {
        reject(new Error(error.message));
        return;
      }
      resolve(result);
    });
  });
}

function withInsertionFeedback(result = {}) {
  return {
    code: result.code || '',
    submitted: Boolean(result.submitted),
    submitAttempted: Boolean(result.submitAttempted),
    submitMethod: result.submitMethod || '',
    detail: result.detail || null,
    feedback: formatInsertionResult({
      ok: result.ok !== false,
      ...result,
    }),
  };
}

function insertionErrorResponse(error) {
  const result = error?.result || {
    ok: false,
    code: 'INSERT_UNAVAILABLE',
    error: error?.message || String(error),
    detail: null,
    submitted: false,
    submitAttempted: false,
    submitMethod: '',
  };

  return {
    ok: false,
    error: result.error || error?.message || String(error),
    ...withInsertionFeedback({
      ok: false,
      ...result,
    }),
  };
}

async function ensureContextMenus() {
  await callbackPromise((done) => chrome.contextMenus.removeAll(done));
  await Promise.all([
    callbackPromise((done) => chrome.contextMenus.create({
      id: CONTEXT_MENU_IDS.root,
      title: 'Open Context Protocol',
      contexts: ['page', 'selection', 'editable'],
    }, done)),
    callbackPromise((done) => chrome.contextMenus.create({
      id: CONTEXT_MENU_IDS.capture,
      parentId: CONTEXT_MENU_IDS.root,
      title: 'Capture Context Pack',
      contexts: ['page', 'selection'],
    }, done)),
    callbackPromise((done) => chrome.contextMenus.create({
      id: CONTEXT_MENU_IDS.insert,
      parentId: CONTEXT_MENU_IDS.root,
      title: 'Insert Selected Context Pack',
      contexts: ['editable'],
      documentUrlPatterns: supportedAiDocumentPatterns,
    }, done)),
  ]);
}

async function ensureAiContentScript(tabId) {
  await chrome.scripting.executeScript({
    target: { tabId },
    files: ['content/ai-chat.js'],
  });
}

async function captureAiContext(tab) {
  if (!tab?.id || !isSupportedAiUrl(tab.url)) {
    return null;
  }

  try {
    await ensureAiContentScript(tab.id);
    const response = await chrome.tabs.sendMessage(tab.id, { type: 'CAPTURE_OPEN_CONTEXT' });
    return response?.ok ? response.context : null;
  } catch (_) {
    return null;
  }
}

async function captureContextPack({ goal = '', target = '' } = {}) {
  const tab = await pageContextApi.getActiveTab();
  if (!tab?.id) {
    throw new Error('No active tab available.');
  }

  const [page, aiContext] = await Promise.all([
    pageContextApi.extractPageContext(tab.id),
    captureAiContext(tab),
  ]);

  const pack = createContextPack({
    page,
    aiContext: aiContext || {},
    goal,
    target: target ? {
      app: target,
      intent: 'continue-work',
    } : {},
  });
  const saved = await storageApi.saveContextPack(pack);

  return {
    pack: saved,
    markdown: formatContextPackMarkdown(saved),
  };
}

function serializeContextPack(pack) {
  return {
    pack,
    markdown: pack ? formatContextPackMarkdown(pack) : '',
  };
}

async function loadContextPackForInsert(id) {
  if (id) {
    const pack = await storageApi.getContextPackById(id);
    if (!pack) {
      throw new Error('No matching Open Context Pack was found.');
    }
    return pack;
  }

  const activePack = await storageApi.getActiveContextPack();
  if (activePack) {
    return activePack;
  }

  const latestPack = await storageApi.getLatestContextPack();
  if (latestPack) {
    return latestPack;
  }

  throw new Error('No Open Context Pack has been captured yet.');
}

async function waitForTabComplete(tabId, timeoutMs = 15000) {
  const tab = await chrome.tabs.get(tabId);
  if (tab?.status === 'complete') {
    return tab;
  }

  return new Promise((resolve, reject) => {
    const timer = setTimeout(() => {
      chrome.tabs.onUpdated.removeListener(onUpdated);
      reject(new Error('Timed out waiting for the target assistant to load.'));
    }, timeoutMs);

    function onUpdated(updatedTabId, changeInfo, updatedTab) {
      if (updatedTabId !== tabId) {
        return;
      }

      if (changeInfo.status === 'complete') {
        clearTimeout(timer);
        chrome.tabs.onUpdated.removeListener(onUpdated);
        resolve(updatedTab);
      }
    }

    chrome.tabs.onUpdated.addListener(onUpdated);
  });
}

async function insertMarkdownIntoTab(tabId, markdown, { submit = false } = {}) {
  let lastError = '';
  let lastResult = null;

  for (let attempt = 0; attempt < 18; attempt += 1) {
    try {
      const tab = await chrome.tabs.get(tabId);
      if (!tab?.id || !isSupportedAiUrl(tab.url || '')) {
        throw new Error('The target tab is not on a supported assistant page.');
      }

      await ensureAiContentScript(tabId);
      const result = await chrome.tabs.sendMessage(tabId, {
        type: 'INSERT_OPEN_CONTEXT',
        text: markdown,
        submit,
      });

      if (result?.ok) {
        return result;
      }

      lastResult = result || null;
      lastError = result?.error || 'Could not insert the context pack.';
    } catch (error) {
      lastError = error.message || String(error);
    }

    await sleep(Math.min(450 + attempt * 120, 1500));
  }

  const error = new Error(lastError || 'Could not auto-inject the selected context pack.');
  if (lastResult) {
    error.result = lastResult;
  }
  throw error;
}

async function insertLatestContextPack() {
  const tab = await pageContextApi.getActiveTab();
  if (!tab?.id || !isSupportedAiUrl(tab.url)) {
    throw new Error('Open a supported assistant page, then insert the latest context pack.');
  }

  const pack = await storageApi.getLatestContextPack();
  if (!pack) {
    throw new Error('No Open Context Pack has been captured yet.');
  }

  const markdown = formatContextPackMarkdown(pack);
  const result = await insertMarkdownIntoTab(tab.id, markdown);

  return {
    pack,
    markdown,
    ...withInsertionFeedback(result),
  };
}

async function insertActiveContextPack() {
  const activePack = await storageApi.getActiveContextPack();
  if (activePack?.id) {
    return insertContextPackById(activePack.id);
  }

  return insertLatestContextPack();
}

async function insertContextPackById(id) {
  const pack = await loadContextPackForInsert(id);
  const tab = await pageContextApi.getActiveTab();
  if (!tab?.id || !isSupportedAiUrl(tab.url)) {
    throw new Error('Open a supported assistant page, then inject the selected context pack.');
  }

  const markdown = formatContextPackMarkdown(pack);
  const result = await insertMarkdownIntoTab(tab.id, markdown);

  return {
    pack,
    markdown,
    ...withInsertionFeedback(result),
  };
}

async function openAndInsertContextPack({ target = 'claude', id, submit = false } = {}) {
  const pack = await loadContextPackForInsert(id);
  const markdown = formatContextPackMarkdown(pack);
  const tab = await chrome.tabs.create({ url: targetUrl(target) });

  if (!tab?.id) {
    throw new Error('Could not open the target assistant.');
  }

  await waitForTabComplete(tab.id);
  await sleep(500);
  const result = await insertMarkdownIntoTab(tab.id, markdown, { submit });

  return {
    pack,
    markdown,
    target,
    ...withInsertionFeedback(result),
  };
}

async function teleportContextPack({ target = 'claude', goal = '', submit = false } = {}) {
  const captured = await captureContextPack({ goal, target });
  const delivered = await openAndInsertContextPack({
    target,
    id: captured.pack?.id,
    submit,
  });

  return {
    pack: captured.pack,
    markdown: captured.markdown,
    target,
    code: delivered?.code || '',
    submitted: Boolean(delivered?.submitted),
    submitAttempted: Boolean(delivered?.submitAttempted),
    submitMethod: delivered?.submitMethod || '',
    detail: delivered?.detail || null,
    feedback: delivered?.feedback || null,
  };
}

async function getStatus() {
  const tab = await pageContextApi.getActiveTab();
  const latest = await storageApi.getLatestContextPack();
  const provider = inferProvider(tab?.url || '');
  return {
    ok: true,
    tab,
    provider,
    isSupportedAiPage: provider.id !== 'web',
    latest,
  };
}

const messageHandlers = {
  async GET_STATUS() {
    return getStatus();
  },

  async GET_TARGET_PROVIDERS() {
    return {
      ok: true,
      providers: targetProviderList(),
    };
  },

  async CAPTURE_CONTEXT_PACK(message) {
    return {
      ok: true,
      ...(await captureContextPack({ goal: message.goal || '' })),
    };
  },

  async GET_LATEST_CONTEXT_PACK() {
    const pack = await storageApi.getLatestContextPack();
    return { ok: true, ...serializeContextPack(pack) };
  },

  async GET_RECENT_CONTEXT_PACKS() {
    const active = await storageApi.getActiveContextPack();
    return {
      ok: true,
      packs: await storageApi.getRecentContextPacks(),
      activePackId: active?.id || '',
    };
  },

  async GET_ACTIVE_CONTEXT_PACK() {
    const pack = await storageApi.getActiveContextPack();
    return { ok: true, ...serializeContextPack(pack) };
  },

  async GET_CONTEXT_PACK(message) {
    const pack = await storageApi.getContextPackById(message.id);
    if (!pack) {
      return {
        ok: false,
        error: 'No matching Open Context Pack was found.',
      };
    }

    return { ok: true, ...serializeContextPack(pack) };
  },

  async SELECT_CONTEXT_PACK(message) {
    const pack = await storageApi.setActiveContextPack(message.id);
    if (!pack) {
      return {
        ok: false,
        error: 'No matching Open Context Pack was found.',
      };
    }

    return { ok: true, ...serializeContextPack(pack) };
  },

  async IMPORT_CONTEXT_PACK(message) {
    const pack = upgradeLegacyContextPack(message.pack || {});
    const saved = await storageApi.saveContextPack(pack);
    return {
      ok: true,
      pack: saved,
      markdown: formatContextPackMarkdown(saved),
    };
  },

  async INSERT_LATEST_CONTEXT_PACK() {
    return {
      ok: true,
      ...(await insertLatestContextPack()),
    };
  },

  async INSERT_CONTEXT_PACK(message) {
    return {
      ok: true,
      ...(await insertContextPackById(message.id)),
    };
  },

  async OPEN_AND_INSERT_CONTEXT_PACK(message) {
    return {
      ok: true,
      ...(await openAndInsertContextPack({
        target: message.target,
        id: message.id,
        submit: Boolean(message.submit),
      })),
    };
  },

  async TELEPORT_CONTEXT_PACK(message) {
    return {
      ok: true,
      ...(await teleportContextPack({
        target: message.target,
        goal: message.goal || '',
        submit: Boolean(message.submit),
      })),
    };
  },

  async OPEN_TARGET(message) {
    await chrome.tabs.create({ url: targetUrl(message.target || 'claude') });
    return { ok: true };
  },
};

chrome.runtime.onInstalled.addListener(() => {
  ensureContextMenus().catch((error) => console.error('Open Context setup failed.', error));
});

chrome.contextMenus.onClicked.addListener(async (info) => {
  try {
    if (info.menuItemId === CONTEXT_MENU_IDS.capture) {
      await captureContextPack();
      return;
    }

    if (info.menuItemId === CONTEXT_MENU_IDS.insert) {
      await insertActiveContextPack();
    }
  } catch (error) {
    console.error(error);
  }
});

chrome.commands.onCommand.addListener(async (command) => {
  try {
    if (command === 'capture-context') {
      await captureContextPack();
      return;
    }

    if (command === 'insert-context') {
      await insertActiveContextPack();
    }
  } catch (error) {
    console.error(error);
  }
});

chrome.runtime.onMessage.addListener((message, _sender, sendResponse) => {
  (async () => {
    const handler = messageHandlers[message?.type];
    if (!handler) {
      sendResponse({ ok: false, error: 'Unknown message type.' });
      return;
    }

    sendResponse(await handler(message));
  })().catch((error) => {
    if (error?.result) {
      sendResponse(insertionErrorResponse(error));
      return;
    }

    sendResponse({ ok: false, error: error.message || String(error) });
  });

  return true;
});

ensureContextMenus().catch((error) => console.error('Open Context setup failed.', error));
