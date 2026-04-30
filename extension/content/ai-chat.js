(function () {
  'use strict';

  if (globalThis.__openContextProtocolInjected) {
    return;
  }
  globalThis.__openContextProtocolInjected = true;

  let toastEl = null;

  function showToast(message, isError) {
    if (!toastEl) {
      toastEl = document.createElement('div');
      toastEl.style.position = 'fixed';
      toastEl.style.right = '16px';
      toastEl.style.bottom = '16px';
      toastEl.style.zIndex = '2147483647';
      toastEl.style.maxWidth = '320px';
      toastEl.style.padding = '10px 14px';
      toastEl.style.borderRadius = '10px';
      toastEl.style.font = '13px/1.4 -apple-system, BlinkMacSystemFont, sans-serif';
      toastEl.style.boxShadow = '0 12px 34px rgba(0,0,0,0.35)';
      toastEl.style.transition = 'opacity 140ms ease';
      document.body.appendChild(toastEl);
    }

    toastEl.textContent = message;
    toastEl.style.background = isError ? '#4b2720' : '#17312f';
    toastEl.style.border = isError ? '1px solid #a56f58' : '1px solid #4faaa0';
    toastEl.style.color = '#f5fbf9';
    toastEl.style.opacity = '1';

    clearTimeout(showToast._timer);
    showToast._timer = setTimeout(() => {
      if (toastEl) {
        toastEl.style.opacity = '0';
      }
    }, 2400);
  }

  function compact(text) {
    return String(text || '').replace(/\s+/g, ' ').trim();
  }

  function wait(ms) {
    return new Promise((resolve) => setTimeout(resolve, ms));
  }

  function providerId() {
    const host = window.location.hostname;
    const path = window.location.pathname;
    if (host.includes('chatgpt.com') || host.includes('chat.openai.com')) return 'chatgpt';
    if (host.includes('claude.ai')) return 'claude';
    if (host.includes('gemini.google.com')) return 'gemini';
    if (host.includes('deepseek.com')) return 'deepseek';
    if (host.includes('perplexity.ai')) return 'perplexity';
    if (host.includes('copilot.microsoft.com')) return 'copilot';
    if (host.includes('poe.com')) return 'poe';
    if (host.includes('chat.mistral.ai')) return 'lechat';
    if (host.includes('grok.com') || host.includes('x.ai')) return 'grok';
    if (host.includes('huggingface.co') && path.startsWith('/chat')) return 'huggingchat';
    if (host.includes('qwen.ai')) return 'qwen';
    return 'web';
  }

  function normalizeRole(role, index = 0) {
    const value = String(role || '').toLowerCase();
    if (value.includes('user') || value.includes('human')) return 'user';
    if (value.includes('assistant') || value.includes('model') || value.includes('bot')) return 'assistant';
    return index % 2 === 0 ? 'user' : 'assistant';
  }

  function uniqueMessages(items) {
    const seen = new Set();
    return items
      .map((item, index) => ({
        role: normalizeRole(item.role, index),
        text: compact(item.text),
      }))
      .filter((item) => {
        if (!item.text || item.text.length < 2) return false;
        const key = `${item.role}:${item.text.slice(0, 180)}`;
        if (seen.has(key)) return false;
        seen.add(key);
        return true;
      })
      .slice(-24);
  }

  function captureChatGpt() {
    return uniqueMessages(Array.from(document.querySelectorAll('[data-message-author-role]')).map((el) => ({
      role: el.getAttribute('data-message-author-role'),
      text: el.innerText || el.textContent || '',
    })));
  }

  function captureClaude() {
    const nodes = Array.from(document.querySelectorAll([
      '[data-testid*="user"]',
      '[data-testid*="assistant"]',
      '[data-testid*="message"]',
      '[data-is-streaming]',
      'article',
    ].join(',')));
    return uniqueMessages(nodes.map((el, index) => ({
      role: el.getAttribute('data-testid') || el.getAttribute('data-is-streaming') || index,
      text: el.innerText || el.textContent || '',
    })));
  }

  function captureGemini() {
    const nodes = Array.from(document.querySelectorAll([
      'user-query',
      'model-response',
      '.model-response-text',
      '[data-test-id*="response"]',
    ].join(',')));
    return uniqueMessages(nodes.map((el, index) => ({
      role: el.tagName === 'USER-QUERY' ? 'user' : (el.tagName === 'MODEL-RESPONSE' ? 'assistant' : index),
      text: el.innerText || el.textContent || '',
    })));
  }

  function captureDeepSeek() {
    const nodes = Array.from(document.querySelectorAll([
      '[data-role]',
      '[class*="message"]',
      '[class*="chat"]',
      'article',
    ].join(',')));
    return uniqueMessages(nodes.map((el, index) => ({
      role: el.getAttribute('data-role') || el.className || index,
      text: el.innerText || el.textContent || '',
    })));
  }

  function captureFallback() {
    const root = document.querySelector('main') || document.querySelector('[role="main"]') || document.body;
    const nodes = Array.from(root.querySelectorAll('article, [role="article"], [data-message], [class*="message"]'));
    const messages = uniqueMessages(nodes.map((el, index) => ({
      role: el.getAttribute('data-role') || el.getAttribute('aria-label') || index,
      text: el.innerText || el.textContent || '',
    })));
    if (messages.length) {
      return messages;
    }
    return uniqueMessages([{
      role: 'unknown',
      text: root?.innerText || document.body?.innerText || '',
    }]);
  }

  function captureMessages() {
    const provider = providerId();
    if (provider === 'chatgpt') return captureChatGpt();
    if (provider === 'claude') return captureClaude();
    if (provider === 'gemini') return captureGemini();
    if (provider === 'deepseek') return captureDeepSeek();
    return captureFallback();
  }

  function inputKind(el) {
    if (el?.isContentEditable) return 'contenteditable';
    return 'text-control';
  }

  function inputDetail(el) {
    return {
      tagName: el?.tagName || '',
      kind: inputKind(el),
    };
  }

  function insertionDetail(el = null) {
    return {
      provider: providerId(),
      pageTitle: document.title || '',
      pageUrl: window.location.href,
      input: inputDetail(el),
    };
  }

  function isTextControl(el) {
    return el?.tagName === 'TEXTAREA' || el?.tagName === 'INPUT';
  }

  function candidateFromActiveElement() {
    const active = document.activeElement;
    if (!active || active === document.body || active === document.documentElement) {
      return null;
    }

    if (isTextControl(active) || active.isContentEditable) {
      return active;
    }

    return active.closest?.('[contenteditable="true"]') || null;
  }

  function composerCandidates() {
    const selectors = [
      '#prompt-textarea',
      'textarea[role="textbox"]',
      'textarea[aria-label]',
      'textarea[data-testid]',
      'textarea[placeholder]',
      'textarea',
      '[contenteditable="true"][aria-label]',
      '[contenteditable="true"][placeholder]',
      'div.ProseMirror[contenteditable="true"]',
      'div[contenteditable="true"][data-slate-editor="true"]',
      'div[contenteditable="true"][role="textbox"]',
      'div[contenteditable="true"]',
    ];

    const candidates = [];
    const active = candidateFromActiveElement();
    if (active) {
      candidates.push(active);
    }

    for (const selector of selectors) {
      candidates.push(...document.querySelectorAll(selector));
    }

    const seen = new Set();
    return candidates.filter((el) => {
      if (!el || seen.has(el)) {
        return false;
      }
      seen.add(el);
      return true;
    });
  }

  function isVisible(el) {
    return Boolean(el && (el.offsetParent !== null || el.getClientRects?.().length));
  }

  function isEnabled(el) {
    if (!el) return false;
    if ('disabled' in el && el.disabled) return false;
    if (el.getAttribute('aria-disabled') === 'true') return false;
    return true;
  }

  function isWritable(el) {
    if (!isVisible(el) || !isEnabled(el)) return false;
    if (isTextControl(el) && el.readOnly) return false;
    if (el.getAttribute('readonly') !== null || el.getAttribute('aria-readonly') === 'true') return false;
    if (!isTextControl(el) && !el.isContentEditable) return false;
    return true;
  }

  function findInputResult() {
    const candidates = composerCandidates();
    if (!candidates.length) {
      return {
        input: null,
        code: 'NO_COMPOSER',
        error: 'No compatible chat input found on this page.',
        detail: insertionDetail(),
      };
    }

    const visible = candidates.filter(isVisible);
    if (!visible.length) {
      return {
        input: null,
        code: 'COMPOSER_NOT_VISIBLE',
        error: 'Found a composer, but it is not visible yet.',
        detail: insertionDetail(candidates[0]),
      };
    }

    const writable = visible.find(isWritable);
    if (!writable) {
      return {
        input: null,
        code: 'COMPOSER_NOT_WRITABLE',
        error: 'Found a composer, but it is not writable right now.',
        detail: insertionDetail(visible[0]),
      };
    }

    return {
      input: writable,
      code: '',
      error: '',
      detail: insertionDetail(writable),
    };
  }

  function findSubmitButton(scope = document) {
    const selectors = [
      'button[data-testid*="send"]',
      'button[aria-label*="Send"]',
      'button[aria-label*="send"]',
      'button[type="submit"]',
      '[role="button"][aria-label*="Send"]',
      '[role="button"][aria-label*="send"]',
      'button[class*="send"]',
    ];

    for (const selector of selectors) {
      const button = scope.querySelector(selector);
      if (isVisible(button) && isEnabled(button)) {
        return button;
      }
    }

    return null;
  }

  function insertionText(el, text) {
    const value = String(text || '');
    const currentText = isTextControl(el)
      ? el.value
      : el.textContent;
    return currentText?.trim() ? `\n\n${value}` : value;
  }

  function setTextControlValue(el, value) {
    const prototype = el.tagName === 'TEXTAREA'
      ? window.HTMLTextAreaElement.prototype
      : window.HTMLInputElement.prototype;
    const setter = Object.getOwnPropertyDescriptor(prototype, 'value')?.set;
    if (setter) {
      setter.call(el, value);
    } else {
      el.value = value;
    }
  }

  function insertIntoTextControl(el, text) {
    const start = Number.isInteger(el.selectionStart) ? el.selectionStart : el.value.length;
    const end = Number.isInteger(el.selectionEnd) ? el.selectionEnd : start;
    const value = el.value || '';
    const insert = insertionText(el, text);
    const nextValue = `${value.slice(0, start)}${insert}${value.slice(end)}`;
    const nextCursor = start + insert.length;

    setTextControlValue(el, nextValue);
    el.setSelectionRange(nextCursor, nextCursor);
    el.dispatchEvent(new Event('input', { bubbles: true }));
    return true;
  }

  function ensureSelectionInElement(el) {
    const selection = window.getSelection();
    if (!selection) return null;
    if (selection.rangeCount && el.contains(selection.anchorNode)) {
      return selection;
    }

    const range = document.createRange();
    range.selectNodeContents(el);
    range.collapse(false);
    selection.removeAllRanges();
    selection.addRange(range);
    return selection;
  }

  function insertIntoEditable(el, text) {
    const selection = ensureSelectionInElement(el);
    if (!selection) return false;

    const insert = insertionText(el, text);
    if (document.queryCommandSupported?.('insertText')) {
      document.execCommand('insertText', false, insert);
    } else {
      const range = selection.getRangeAt(0);
      range.deleteContents();
      range.insertNode(document.createTextNode(insert));
      range.collapse(false);
      selection.removeAllRanges();
      selection.addRange(range);
    }

    el.dispatchEvent(new InputEvent('input', { bubbles: true, data: insert, inputType: 'insertText' }));
    return true;
  }

  function insertText(el, text) {
    el.focus();

    if (isTextControl(el)) {
      return insertIntoTextControl(el, text);
    }

    return insertIntoEditable(el, text);
  }

  async function submitInsertedContext(el) {
    await wait(120);

    const form = el.closest('form');
    const button = findSubmitButton(form || document);
    if (button) {
      button.click();
      return {
        code: 'SUBMITTED_WITH_BUTTON',
        submitted: true,
        submitAttempted: true,
        submitMethod: 'button',
      };
    }

    return {
      code: 'SEND_UNVERIFIED',
      submitted: false,
      submitAttempted: true,
      submitMethod: '',
    };
  }

  chrome.runtime.onMessage.addListener((message, _sender, sendResponse) => {
    if (message.type === 'CAPTURE_OPEN_CONTEXT') {
      try {
        sendResponse({
          ok: true,
          context: {
            provider: providerId(),
            title: document.title || '',
            url: window.location.href,
            messages: captureMessages(),
          },
        });
      } catch (error) {
        sendResponse({ ok: false, error: error.message || String(error) });
      }
      return true;
    }

    if (message.type === 'INSERT_OPEN_CONTEXT') {
      (async () => {
        try {
          const {
            input,
            code,
            error,
            detail,
          } = findInputResult();
          if (!input) {
            sendResponse({
              ok: false,
              code,
              error,
              detail,
              submitted: false,
              submitAttempted: false,
              submitMethod: '',
            });
            return;
          }

          const ok = insertText(input, message.text || '');
          if (!ok) {
            sendResponse({
              ok: false,
              code: 'INSERT_FAILED',
              error: 'Could not insert text into chat input.',
              detail,
              submitted: false,
              submitAttempted: Boolean(message.submit),
              submitMethod: '',
            });
            return;
          }

          let submitResult = {
            code: 'INSERTED_ONLY',
            submitted: false,
            submitAttempted: false,
            submitMethod: '',
          };
          if (message.submit) {
            submitResult = await submitInsertedContext(input);
          }

          const insertedOnly = submitResult.code === 'INSERTED_ONLY' || submitResult.code === 'SEND_UNVERIFIED';
          showToast(insertedOnly ? 'Open Context inserted. Review before sending.' : 'Open Context sent.', false);
          sendResponse({
            ok: true,
            detail,
            ...submitResult,
          });
        } catch (error) {
          showToast(error.message || 'Open Context insertion failed.', true);
          sendResponse({
            ok: false,
            code: 'INSERT_UNAVAILABLE',
            error: error.message || String(error),
            detail: insertionDetail(),
            submitted: false,
            submitAttempted: Boolean(message.submit),
            submitMethod: '',
          });
        }
      })();
      return true;
    }

    return false;
  });
})();
