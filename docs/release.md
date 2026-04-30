# Open Context Protocol Public Release

Open Context Protocol is a Chrome extension for moving working context between AI assistants.

The public release story is simple: choose the assistant where the work should continue, press `Capture & Open`, and Open Context carries the current context into the next composer. If `Send automatically` is enabled, it attempts to press the visible send button after insertion.

## User Flow

1. Open an assistant conversation or a useful web page.
2. Choose the target assistant.
3. Press `Capture & Open`.
4. Open Context captures the current work, opens the target assistant, and pastes the handoff.
5. When `Send automatically` is enabled, Open Context attempts to press the visible send button after insertion.

The canonical release format is Open Context Pack `0.2`. Legacy `0.1` packs import and upgrade to `0.2`.

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
