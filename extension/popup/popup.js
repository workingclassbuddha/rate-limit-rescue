'use strict';

const $ = (id) => document.getElementById(id);

const GOAL_PRESETS = {
  'rate-limit': (targetLabel) => `Continue this work in ${targetLabel} because I hit a limit in another assistant. Preserve the plan, constraints, and next steps.`,
  expand: (targetLabel) => `Continue this work in ${targetLabel}. Expand the reasoning, strengthen the answer, and push the work forward.`,
  summarize: (targetLabel) => `Summarize this work for ${targetLabel}. Capture the key decisions, open questions, and next steps so it can continue cleanly.`,
  handoff: (targetLabel) => `Prepare a clean handoff for ${targetLabel}. Keep the context compact, portable, and ready to continue without repeating settled work.`,
};

let selectedPack = null;
let selectedMarkdown = '';
let selectedPackId = '';
let recentPacks = [];
let targetProviders = [];
let currentIsSupportedAiPage = false;
let hasActiveTab = false;
let activeGoalPresetId = '';
let activeGoalPresetText = '';

function relativeTime(iso) {
  if (!iso) return 'just now';
  const delta = Date.now() - new Date(iso).getTime();
  const mins = Math.round(delta / 60000);
  if (mins < 1) return 'just now';
  if (mins < 60) return `${mins}m ago`;
  const hours = Math.round(mins / 60);
  if (hours < 24) return `${hours}h ago`;
  return `${Math.round(hours / 24)}d ago`;
}

function truncateLabel(text, limit = 88) {
  const value = String(text || '').replace(/\s+/g, ' ').trim();
  if (value.length <= limit) return value;
  return `${value.slice(0, limit - 3).trim()}...`;
}

function byteSize(text) {
  return new Blob([String(text || '')]).size;
}

function formatBytes(bytes) {
  if (!bytes) return '0 KB';
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${Math.round(bytes / 1024)} KB`;
  return `${(bytes / 1024 / 1024).toFixed(1)} MB`;
}

function setBusy(buttonId, label, busy) {
  const button = $(buttonId);
  if (!button) return;

  if (busy) {
    button.dataset.label = button.textContent;
    button.textContent = label;
    button.disabled = true;
    return;
  }

  button.textContent = button.dataset.label || button.textContent;
  button.disabled = false;
  updateActionStates();
}

async function sendMessage(message) {
  return chrome.runtime.sendMessage(message);
}

function currentTargetLabel() {
  return currentTargetProvider()?.label || $('target').selectedOptions[0]?.textContent || 'the next assistant';
}

function currentTargetProvider() {
  const id = $('target')?.value || 'claude';
  return targetProviders.find((provider) => provider.id === id) || null;
}

function goalPresetText(presetId) {
  const template = GOAL_PRESETS[presetId];
  return template ? template(currentTargetLabel()) : '';
}

function updateGoalPresetButtons() {
  for (const chip of document.querySelectorAll('[data-goal-preset]')) {
    chip.classList.toggle('is-active', chip.dataset.goalPreset === activeGoalPresetId);
  }
}

function applyGoalPreset(presetId) {
  const text = goalPresetText(presetId);
  if (!text) return;

  $('goal').value = text;
  activeGoalPresetId = presetId;
  activeGoalPresetText = text;
  updateGoalPresetButtons();
}

function syncGoalPresetFromInput() {
  const current = $('goal').value.trim();
  if (!activeGoalPresetId) {
    return;
  }

  if (current === activeGoalPresetText.trim()) {
    return;
  }

  activeGoalPresetId = '';
  activeGoalPresetText = '';
  updateGoalPresetButtons();
}

function previewPlaceholder() {
  return 'Capture or select a context pack to preview it here.';
}

function renderPreview(text = null) {
  $('preview').textContent = text ?? (selectedMarkdown || previewPlaceholder());
}

function autoSendEnabled() {
  return Boolean($('auto-send')?.checked);
}

function handoffDetail() {
  const targetLabel = currentTargetLabel();
  const action = autoSendEnabled()
    ? `Capture & Open will capture this tab, open ${targetLabel}, insert the handoff, and attempt to send with a visible send button.`
    : `Capture & Open will capture this tab, open ${targetLabel}, and insert the handoff for review.`;

  if (!selectedPack) {
    return action;
  }

  if (currentIsSupportedAiPage) {
    return 'This tab looks like a supported assistant, so you can inject the selected pack here or use Capture & Open for a new handoff.';
  }

  return `${action} You can still copy, export, or inject packs manually.`;
}

function setHandoffStatus(message, { tone = 'neutral', detail = null } = {}) {
  $('handoff-status').textContent = message;
  $('handoff-status').dataset.tone = tone;
  $('handoff-detail').textContent = detail || handoffDetail();
}

function applyFeedback(feedback, fallback) {
  if (!feedback) {
    setHandoffStatus(fallback, { tone: 'success' });
    return;
  }

  setHandoffStatus(feedback.summary || fallback, {
    tone: feedback.tone || 'success',
    detail: feedback.detail || handoffDetail(),
  });
}

function showError(error) {
  const message = error?.message || String(error);
  renderPreview(message);
  setHandoffStatus(message, { tone: 'error' });
}

function selectedPackStatus() {
  if (!selectedPack) {
    return 'No context pack captured yet.';
  }

  return `Selected pack from ${selectedPack.source?.label || 'a page'} · ${relativeTime(selectedPack.savedAt || selectedPack.createdAt)}`;
}

function updateActionStates() {
  setButtonState('copy-context', !selectedMarkdown, 'Capture or select a context pack first.');
  setButtonState('export-json', !selectedPack, 'Capture or select a context pack first.');
  setButtonState('capture-context', !hasActiveTab, 'Open a normal web page or assistant tab first.');
  setButtonState('open-and-inject', !hasActiveTab, 'Open a normal web page or assistant tab first.');
  setButtonState(
    'insert-current',
    !selectedPack || !currentIsSupportedAiPage,
    !selectedPack
      ? 'Capture or select a context pack first.'
      : 'Open a supported assistant page to inject into the current chat.',
  );
  updateLaunchCopy();
}

function setButtonState(buttonId, disabled, reason = '') {
  const button = $(buttonId);
  if (!button) return;
  button.disabled = Boolean(disabled);
  if (disabled && reason) {
    button.title = reason;
    button.setAttribute('aria-disabled', 'true');
  } else {
    button.removeAttribute('title');
    button.removeAttribute('aria-disabled');
  }
}

function updateLaunchCopy() {
  const button = $('open-and-inject');
  if (button && !button.disabled) {
    button.textContent = autoSendEnabled() ? 'Capture, Open & Send' : 'Capture & Open';
  }
}

function renderTargetSupport() {
  const provider = currentTargetProvider();
  const support = $('target-support');
  if (!support) return;

  support.textContent = provider?.supportLabel || 'Generic composer support';
  support.dataset.level = provider?.supportLevel || 'generic';
}

function renderTargetProviders(providers = []) {
  if (!providers.length) return;

  const select = $('target');
  const previous = select.value || 'claude';
  select.textContent = '';
  targetProviders = providers;

  for (const provider of providers) {
    const option = document.createElement('option');
    option.value = provider.id;
    option.textContent = `${provider.label} · ${provider.supportLabel}`;
    select.appendChild(option);
  }

  select.value = providers.some((provider) => provider.id === previous) ? previous : 'claude';
  renderTargetSupport();
  updateLaunchCopy();
}

function renderPackStatus() {
  if (!selectedPack) {
    $('pack-title').textContent = 'No pack selected';
    $('pack-source').textContent = 'Capture or import a pack to inspect its source and handoff shape.';
    $('pack-pill').textContent = 'Waiting';
    $('pack-messages').textContent = '0';
    $('pack-size').textContent = '0 KB';
    $('pack-age').textContent = 'none';
    return;
  }

  const messageCount = selectedPack.artifacts?.messages?.length || 0;
  const hasSelection = Boolean(selectedPack.artifacts?.selectedText);
  const hasPageText = Boolean(selectedPack.artifacts?.pageText);
  const artifactLabel = messageCount
    ? 'Conversation'
    : (hasSelection ? 'Selection' : (hasPageText ? 'Page Context' : 'Metadata'));

  const sourceHost = selectedPack.source?.hostname || selectedPack.source?.url || 'unknown source';
  $('pack-title').textContent = truncateLabel(selectedPack.source?.title || selectedPack.task?.goal || 'Untitled context');
  $('pack-source').textContent = `${selectedPack.source?.label || 'Web Page'} · ${sourceHost}`;
  $('pack-pill').textContent = artifactLabel;
  $('pack-messages').textContent = String(messageCount);
  $('pack-size').textContent = formatBytes(byteSize(JSON.stringify(selectedPack)));
  $('pack-age').textContent = relativeTime(selectedPack.savedAt || selectedPack.createdAt);
}

function setSelectedPayload(payload = {}) {
  selectedPack = payload.pack || null;
  selectedPackId = selectedPack?.id || '';
  selectedMarkdown = payload.markdown || '';
  renderPreview();
  renderPackStatus();
  updateActionStates();
}

function downloadJson(pack) {
  const stamp = (pack?.createdAt || new Date().toISOString()).replace(/[:.]/g, '-');
  const blob = new Blob([JSON.stringify(pack, null, 2)], { type: 'application/json' });
  const url = URL.createObjectURL(blob);
  const anchor = document.createElement('a');
  anchor.href = url;
  anchor.download = `open-context-pack-${stamp}.ocp.json`;
  document.body.appendChild(anchor);
  anchor.click();
  anchor.remove();
  setTimeout(() => URL.revokeObjectURL(url), 1000);
}

function renderStatus(status) {
  const tab = status?.tab || {};
  const provider = status?.provider || {};
  hasActiveTab = Boolean(tab?.id);
  currentIsSupportedAiPage = Boolean(status?.isSupportedAiPage);

  $('source-title').textContent = tab.title || 'No active tab found';
  if (currentIsSupportedAiPage) {
    $('source-meta').textContent = `${provider.label || 'Assistant'} detected · ${provider.supportLabel || 'assistant support'}.`;
  } else {
    $('source-meta').textContent = hasActiveTab
      ? 'Generic page detected. Capture will include selected text and visible page context.'
      : 'Open an assistant tab or normal web page to begin.';
  }

  setHandoffStatus(selectedPackStatus());
  updateActionStates();
}

function renderRecents(packs = [], activePackId = '') {
  recentPacks = packs;
  const list = $('recent-list');
  list.textContent = '';

  if (!packs.length) {
    const empty = document.createElement('div');
    empty.className = 'meta';
    empty.textContent = 'No recent context packs yet.';
    list.appendChild(empty);
    return;
  }

  const currentId = selectedPackId || activePackId;

  for (const pack of packs.slice(0, 6)) {
    const item = document.createElement('div');
    item.className = 'recent-item';
    if (pack.id === currentId) {
      item.classList.add('is-active');
    }

    const top = document.createElement('div');
    top.className = 'recent-top';

    const title = document.createElement('div');
    title.className = 'recent-title';
    title.textContent = pack.source?.title || pack.task?.goal || 'Untitled context';

    const time = document.createElement('div');
    time.className = 'meta';
    time.textContent = relativeTime(pack.savedAt || pack.createdAt);

    top.appendChild(title);
    top.appendChild(time);

    const summary = document.createElement('div');
    summary.className = 'meta';
    summary.textContent = `${pack.source?.label || 'Unknown'} · ${pack.task?.goal || 'Continue this work in another assistant.'}`;

    const actions = document.createElement('div');
    actions.className = 'recent-actions';

    const preview = document.createElement('button');
    preview.className = 'recent-btn';
    preview.textContent = 'Select';
    preview.addEventListener('click', () => {
      loadContextPack(pack.id, { persist: true }).catch((error) => {
        showError(error);
      });
    });

    const exportButton = document.createElement('button');
    exportButton.className = 'recent-btn';
    exportButton.textContent = 'Export';
    exportButton.addEventListener('click', () => downloadJson(pack));

    const deleteButton = document.createElement('button');
    deleteButton.className = 'recent-btn';
    deleteButton.classList.add('recent-btn--danger');
    deleteButton.textContent = 'Delete';
    deleteButton.addEventListener('click', async () => {
      const result = await sendMessage({ type: 'DELETE_CONTEXT_PACK', id: pack.id });
      if (result?.ok) {
        if (selectedPackId === pack.id) {
          setSelectedPayload();
        }
        await refreshStatus();
        setHandoffStatus('Deleted context pack.', { tone: 'success' });
      }
    });

    actions.appendChild(preview);
    actions.appendChild(exportButton);
    actions.appendChild(deleteButton);

    item.appendChild(top);
    item.appendChild(summary);
    item.appendChild(actions);
    list.appendChild(item);
  }
}

async function loadContextPack(id, { persist = false } = {}) {
  if (!id) {
    setSelectedPayload();
    setHandoffStatus('No context pack captured yet.');
    renderRecents(recentPacks);
    return null;
  }

  const result = await sendMessage({
    type: persist ? 'SELECT_CONTEXT_PACK' : 'GET_CONTEXT_PACK',
    id,
  });

  if (!result?.ok) {
    throw new Error(result?.error || 'Could not load the selected context pack.');
  }

  setSelectedPayload(result);
  setHandoffStatus(selectedPackStatus());
  renderRecents(recentPacks, selectedPackId);
  return result;
}

async function refreshStatus() {
  const [status, latest, active, recents, targets] = await Promise.all([
    sendMessage({ type: 'GET_STATUS' }),
    sendMessage({ type: 'GET_LATEST_CONTEXT_PACK' }),
    sendMessage({ type: 'GET_ACTIVE_CONTEXT_PACK' }),
    sendMessage({ type: 'GET_RECENT_CONTEXT_PACKS' }),
    sendMessage({ type: 'GET_TARGET_PROVIDERS' }),
  ]);

  if (!status?.ok) {
    throw new Error(status?.error || 'Could not load extension status.');
  }
  if (!latest?.ok) {
    throw new Error(latest?.error || 'Could not load the latest context pack.');
  }
  if (!active?.ok) {
    throw new Error(active?.error || 'Could not load the selected context pack.');
  }
  if (!recents?.ok) {
    throw new Error(recents?.error || 'Could not load recent context packs.');
  }
  if (!targets?.ok) {
    throw new Error(targets?.error || 'Could not load target providers.');
  }

  renderTargetProviders(targets.providers || []);
  const stored = await chrome.storage.local.get({ lastTargetProvider: '' });
  if (stored.lastTargetProvider && targets.providers?.some((provider) => provider.id === stored.lastTargetProvider)) {
    $('target').value = stored.lastTargetProvider;
    renderTargetSupport();
    updateLaunchCopy();
  }
  renderStatus(status);
  recentPacks = recents.packs || [];

  const selectedPayload = active.pack ? active : latest;
  setSelectedPayload(selectedPayload);
  setHandoffStatus(selectedPackStatus());
  renderRecents(recentPacks, selectedPackId || recents.activePackId || '');
}

async function runAction(buttonId, busyLabel, fn) {
  setBusy(buttonId, busyLabel, true);
  try {
    const result = await fn();
    if (!result?.ok) {
      throw new Error(result?.error || 'Open Context action failed.');
    }
    return result;
  } catch (error) {
    showError(error);
    return null;
  } finally {
    setBusy(buttonId, busyLabel, false);
  }
}

async function ensureSelectedPackLoaded() {
  if (selectedPack && selectedPackId && selectedMarkdown) {
    return;
  }

  if (!selectedPackId) {
    const active = await sendMessage({ type: 'GET_ACTIVE_CONTEXT_PACK' });
    if (!active?.ok || !active.pack?.id) {
      throw new Error('No context pack captured yet.');
    }
    setSelectedPayload(active);
    setHandoffStatus(selectedPackStatus());
    renderRecents(recentPacks, selectedPackId);
    return;
  }

  await loadContextPack(selectedPackId);
}

$('refresh-status').addEventListener('click', () => {
  refreshStatus().catch((error) => {
    showError(error);
  });
});

for (const chip of document.querySelectorAll('[data-goal-preset]')) {
  chip.addEventListener('click', () => {
    applyGoalPreset(chip.dataset.goalPreset || '');
  });
}

$('goal').addEventListener('input', () => {
  syncGoalPresetFromInput();
});

$('target').addEventListener('change', () => {
  chrome.storage.local.set({ lastTargetProvider: $('target').value });
  if (activeGoalPresetId) {
    applyGoalPreset(activeGoalPresetId);
  }
  renderTargetSupport();
  updateLaunchCopy();
  setHandoffStatus(selectedPackStatus());
});

$('auto-send').addEventListener('change', () => {
  updateLaunchCopy();
  setHandoffStatus(selectedPackStatus());
});

$('capture-context').addEventListener('click', async () => {
  const result = await runAction('capture-context', 'Capturing...', () => sendMessage({
    type: 'CAPTURE_CONTEXT_PACK',
    goal: $('goal').value.trim(),
  }));
  if (!result) return;

  setSelectedPayload(result);
  await refreshStatus();
  setHandoffStatus('Captured a new Open Context Pack.', { tone: 'success' });
});

$('copy-context').addEventListener('click', async () => {
  try {
    await ensureSelectedPackLoaded();
    await navigator.clipboard.writeText(selectedMarkdown);
    setHandoffStatus('Copied selected Open Context Pack.', { tone: 'success' });
  } catch (error) {
    showError(error);
  }
});

$('export-json').addEventListener('click', async () => {
  try {
    await ensureSelectedPackLoaded();
    if (!selectedPack) {
      throw new Error('No context pack available to export yet.');
    }
    downloadJson(selectedPack);
    setHandoffStatus('Exported selected Open Context Pack as JSON.', { tone: 'success' });
  } catch (error) {
    showError(error);
  }
});

$('import-json').addEventListener('click', () => {
  $('import-file').click();
});

$('import-file').addEventListener('change', async (event) => {
  const [file] = Array.from(event.target.files || []);
  if (!file) return;

  try {
    const payload = JSON.parse(await file.text());
    const result = await sendMessage({
      type: 'IMPORT_CONTEXT_PACK',
      pack: payload,
    });

    if (!result?.ok) {
      throw new Error(result?.error || 'Could not import that context pack.');
    }

    setSelectedPayload(result);
    await refreshStatus();
    setHandoffStatus(`Imported ${file.name}.`, { tone: 'success' });
  } catch (error) {
    showError(error);
  } finally {
    event.target.value = '';
  }
});

$('open-and-inject').addEventListener('click', async () => {
  const targetLabel = currentTargetLabel();
  const submit = autoSendEnabled();
  setHandoffStatus(
    submit
      ? `Capturing, opening ${targetLabel}, and looking for a send button...`
      : `Capturing and opening ${targetLabel} for review...`,
  );

  const result = await runAction('open-and-inject', 'Opening...', () => sendMessage({
    type: 'TELEPORT_CONTEXT_PACK',
    target: $('target').value,
    goal: $('goal').value.trim(),
    submit,
  }));
  if (!result) return;

  setSelectedPayload(result);
  await refreshStatus();

  applyFeedback(result.feedback, submit
    ? `Captured and inserted into ${targetLabel}. Review before sending if it was not submitted.`
    : `Captured and inserted into ${targetLabel} for review.`);
});

$('insert-current').addEventListener('click', async () => {
  try {
    await ensureSelectedPackLoaded();
  } catch (error) {
    showError(error);
    return;
  }

  const result = await runAction('insert-current', 'Injecting...', () => sendMessage({
    type: 'INSERT_CONTEXT_PACK',
    id: selectedPackId,
  }));
  if (!result) return;

  setSelectedPayload(result);
  applyFeedback(result.feedback, 'Inserted selected Open Context Pack.');
});

refreshStatus().catch((error) => {
  showError(error);
});
