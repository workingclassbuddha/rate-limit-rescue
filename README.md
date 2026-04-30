# Open Context Protocol

![Open Context Protocol banner](docs/branding/open-context-protocol-banner.svg)

Open Context Protocol is a Chrome extension for moving live working context between AI assistants.

Choose where the work should continue, press go, and Open Context captures the current tab, opens the target assistant, pastes the handoff, and can send it with one click when auto-send is enabled.

## What It Does

- Captures recent conversation context from supported AI assistants
- Lets you choose the next assistant before handoff
- Opens the selected assistant and pastes the context pack into its composer
- Optionally presses the visible send button for a one-click transfer
- Falls back to selected text or visible page context on normal web pages
- Keeps every handoff inspectable as local-first Markdown and JSON

## Product

- Product name: `Open Context Protocol`
- Short display name: `Open Context`
- Tagline: `Move context between AI assistants`
- Canonical pack format: Open Context Pack `0.2`
- Legacy support: Open Context Pack `0.1` imports upgrade to `0.2`

## Supported Assistants

Open Context currently includes first-party adapters for:

- ChatGPT
- Claude
- Gemini
- DeepSeek

It can also capture selected text and visible context from normal web pages. Any assistant that accepts pasted text can receive a copied Markdown handoff, and supported browser composers can receive direct insertion.

## Quick Start

1. Open `chrome://extensions`
2. Enable Developer mode
3. Click `Load unpacked`
4. Select this repo's `extension` folder
5. Open an AI assistant or any useful web page
6. Choose the target assistant in Open Context
7. Press `Capture & Open`
8. Review the pasted handoff, or enable `Send automatically` for one-click paste-and-send

## Validate

```bash
npm run check
```

## Package

```bash
npm run package:chrome
```

The packaged Chrome zip is written to:

```text
dist/open-context-protocol-chrome.zip
```

## Release

- Release notes: `docs/release.md`
- Manual QA: `docs/manual-qa.md`
- Schema: `schema/open-context-pack.schema.json`
