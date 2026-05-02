# Contributing

Thanks for helping with Rate Limit Rescue.

## Development Flow

1. Load the unpacked extension from `extension/` in `chrome://extensions`.
2. Edit the extension, shared protocol helpers, docs, or tests.
3. Reload Rate Limit Rescue in `chrome://extensions`.
4. Run:

```bash
npm run check
```

## Project Shape

- `extension/manifest.json`: MV3 config, permissions, host access, and keyboard shortcuts.
- `extension/background.js`: service worker for message routing, context menus, capture, opening targets, and insertion orchestration.
- `extension/content/ai-chat.js`: page-level AI chat capture and composer insertion helpers.
- `extension/lib/shared/`: provider definitions, context-pack creation, formatting, validation, feedback copy, and shared utilities.
- `extension/lib/background/`: Chrome storage and active-page extraction helpers.
- `extension/popup/`: popup UI shell, state management, styles, and handoff actions.
- `packages/core/`: npm-consumable wrapper around the extension-safe shared protocol helpers.
- `schema/`: canonical Open Context Pack JSON Schema.
- `docs/`: release notes, manual QA, and brand assets.
- `test/`: protocol, storage, package wrapper, and insertion-feedback tests.

## Guardrails

- Keep capture user-directed. Never auto-capture a conversation or page.
- Keep data local unless the user explicitly exports, copies, pastes, or sends it.
- Prefer compact context packs over raw transcript dumps.
- Keep provider adapters isolated and easy to replace.
- Do not add Chrome permissions without an explicit product reason and a regression check.
- Keep Open Context Pack `0.2` canonical and preserve v0.1 import compatibility.
- Keep auto-send opt-in and visible to the user.
- Favor small, dependency-free changes unless a dependency earns its place for public release.
