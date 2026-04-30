# Open Context Protocol Private Alpha

This repo is the Chrome-extension release track for Open Context Protocol.

## Release Artifact

```text
dist/open-context-protocol-chrome.zip
```

Build it with:

```bash
npm run check
npm run package:chrome
```

## Install

1. Open `chrome://extensions`
2. Enable Developer mode
3. Click `Load unpacked`
4. Select the `extension` folder

## Release Notes

Open Context Protocol captures working AI context from one assistant, packages it as an inspectable local-first context pack, and helps the user continue in another assistant without starting over.

The canonical private-alpha format is Open Context Pack `0.2`. Legacy `0.1` packs import and upgrade to `0.2`.

