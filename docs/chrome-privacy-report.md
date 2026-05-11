# Chrome Web Store Privacy Report

Last updated: 2026-05-11

This report summarizes the Chrome Web Store privacy disclosures for Rate Limit Rescue `0.2.0`.

## Item

- Name: Rate Limit Rescue
- Type: Chrome extension
- Public repository: https://github.com/workingclassbuddha/rate-limit-rescue
- Privacy policy: https://github.com/workingclassbuddha/rate-limit-rescue/blob/main/PRIVACY.md

## Single Purpose

Rate Limit Rescue captures user-requested context from the active page or supported AI assistant and transfers it as a reviewable handoff to the AI assistant the user chooses.

## Data Disclosures

Chrome Web Store data categories disclosed:

- Personal communications: recent visible messages may be captured when the user invokes capture on a supported AI assistant page.
- Website content: selected text, visible page text, page title, and page URL may be captured when the user invokes capture on a page.

Data not collected or used:

- No authentication information
- No financial or payment information
- No health information
- No location data
- No browsing history collection outside the user-invoked active tab action
- No analytics, advertising, tracking, or profiling

## Data Flow

1. The user invokes Rate Limit Rescue from the popup, keyboard command, or context menu.
2. The extension reads the active tab or supported assistant page needed for that action.
3. The extension creates a local Open Context Pack containing the handoff content.
4. The extension stores recent packs locally in `chrome.storage.local`.
5. The user can review, copy, export, delete, insert, or optionally send a pack.

Rate Limit Rescue does not send captured content to a developer server. Data leaves the browser only when the user copies, exports, pastes, inserts, or sends the handoff.

## Permission Justifications

| Permission | Justification |
| --- | --- |
| `storage` | Stores recent rescue packs, the active pack selection, target assistant preference, and local settings in Chrome storage. |
| `activeTab` | Reads the current tab only after the user invokes capture or insertion. |
| `scripting` | Injects the packaged content script into the active or target assistant tab when needed to capture or insert a handoff. |
| `tabs` | Opens or focuses the selected target assistant tab and reads tab metadata needed for the user-requested handoff. |
| `contextMenus` | Provides user-invoked capture and insert actions from Chrome's context menu. |
| Host permissions | Limit capture and insertion support to declared AI assistant domains. |

## Host Permissions

Host permissions are limited to supported assistant domains where direct capture or insertion is implemented:

- `chatgpt.com`
- `chat.openai.com`
- `claude.ai`
- `gemini.google.com`
- `chat.deepseek.com`
- `perplexity.ai`
- `copilot.microsoft.com`
- `poe.com`
- `chat.mistral.ai`
- `grok.com`
- `x.ai`
- `huggingface.co/chat`
- `qwen.ai`

The extension can also use the `activeTab` permission for user-invoked capture on the currently active non-assistant page.

## Remote Code

Rate Limit Rescue does not execute remotely hosted code. All extension scripts are packaged with the submitted extension.

## Limited Use Certification

Rate Limit Rescue uses captured content only to provide or improve its single purpose: creating and transferring user-requested AI context handoffs.

The use of information received from Google APIs will adhere to the Chrome Web Store User Data Policy, including the Limited Use requirements.

Rate Limit Rescue does not sell, transfer, or use user data for unrelated purposes, advertising, creditworthiness, or lending.

## User Controls

- Capture is user-invoked.
- Handoffs are reviewable before the user sends them.
- Auto-send is opt-in and off by default.
- Recent packs can be exported or deleted by the user.
- Uninstalling the extension removes local extension storage according to Chrome's extension storage behavior.
