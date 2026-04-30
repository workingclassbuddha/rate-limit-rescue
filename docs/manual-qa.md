# Manual QA

Run this checklist against the unpacked Chrome extension before tagging a private-alpha release.

## Chrome Extension

1. Load unpacked from the `extension` folder.
2. Capture a ChatGPT conversation and verify recent messages appear in Markdown.
3. Capture a Claude conversation and verify recent messages appear in Markdown.
4. Capture a Gemini conversation and verify recent messages appear in Markdown.
5. Capture a DeepSeek conversation and verify recent messages appear in Markdown.
6. Capture a normal web page and verify selected text or visible page context appears.
7. Import a legacy v0.1 `.ocp.json` file and verify it upgrades to v0.2.
8. Export a v0.2 `.ocp.json` file and re-import it.
9. Copy Markdown and paste manually into another assistant.
10. Insert into Claude with auto-send off.
11. Insert into ChatGPT with auto-send off.
12. Only try browser auto-send after confirming the visible send button is correct.
13. Confirm unsupported or blocked pages show actionable fallback guidance.

## Packaging

After QA passes, rebuild the zip:

```bash
npm run package:chrome
```

Inspect the zip before uploading. It should contain extension files only: popup, background, content script, icons, manifest, and shared/background libraries.

