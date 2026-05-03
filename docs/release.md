# Rate Limit Rescue Public Release

Rate Limit Rescue is a Chrome extension for instant context transfer to your preferred AI when rate limits, context walls, model limits, or assistant fit interrupt the work.

The public release story is simple: choose the assistant where the work should continue, press `Capture & Open`, and Rescue carries the current context into the next composer. If `Send automatically` is enabled, it attempts to press the visible send button after insertion.

## User Flow

1. Open an assistant conversation or a useful web page.
2. Choose the target assistant.
3. Press `Capture & Open`.
4. Rate Limit Rescue captures the current work, opens the target assistant, and pastes the handoff.
5. When `Send automatically` is enabled, Rescue attempts to press the visible send button after insertion.

The canonical handoff format is Open Context Pack `0.2`. Legacy `0.1` packs import and upgrade to `0.2`, and existing `.ocp.json` files remain supported.

## Release Artifact

```text
dist/rate-limit-rescue-chrome.zip
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
