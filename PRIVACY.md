# Rate Limit Rescue Privacy Policy

Last updated: 2026-05-11

Rate Limit Rescue is a local-first Chrome extension for transferring working context between AI assistants. Its single purpose is to help you capture a reviewable handoff from the page or AI assistant you choose and move that handoff to another assistant you choose.

## Data The Extension Handles

Rate Limit Rescue only reads page content after you invoke a capture, insert, import, export, copy, or delete action. Depending on the page and action, the extension may process:

- Recent messages from supported AI assistant pages
- Selected text or visible page text from the active tab
- Basic page metadata such as title and URL
- Rescue packs that you import, export, copy, insert, or delete
- Local extension settings, such as the selected target assistant and auto-send preference

This can include Chrome Web Store data categories such as website content and personal communications when those messages are visible in the page you ask the extension to capture.

## How Data Is Used

The extension uses captured content to build a local "rescue pack" in Markdown and JSON so you can review, copy, export, paste, or insert the handoff into another assistant.

Rate Limit Rescue does not use captured content for advertising, profiling, analytics, creditworthiness, lending, or unrelated product purposes.

## Storage And Retention

Rescue packs and settings are stored locally in your browser using `chrome.storage.local`. The extension keeps a small recent-pack history so you can inspect or reuse recent handoffs. You can delete packs from the extension UI, and uninstalling the extension removes its local extension storage according to Chrome's normal extension storage behavior.

## Sharing And Transfer

Rate Limit Rescue does not run a developer server and does not sell user data. It does not send captured content to the developer.

Your data leaves your browser only when you choose to copy, export, paste, insert, or send a handoff. If you insert or send a handoff into a third-party AI assistant or website, that service receives the content you chose to send and handles it under its own terms and privacy policy.

## Remote Code

Rate Limit Rescue does not execute remotely hosted code. The extension package contains the scripts it runs.

## Permissions

The extension uses Chrome permissions to capture the active tab at your request, store recent rescue packs locally, open or focus the assistant you choose, and insert the generated handoff into supported assistant composers. A detailed Chrome Web Store privacy report is available in [`docs/chrome-privacy-report.md`](docs/chrome-privacy-report.md).

## Chrome Web Store Limited Use

The use of information received from Google APIs will adhere to the Chrome Web Store User Data Policy, including the Limited Use requirements.

## Contact

For support or privacy questions, use the project issue tracker:

https://github.com/workingclassbuddha/rate-limit-rescue/issues
