# ChatGPT Answer Completion Sound

A Chrome Manifest V3 extension that plays a short sound when ChatGPT finishes responding.

It monitors the `data-sidebar-indicator="working"` attribute on conversations in the ChatGPT sidebar. When a conversation transitions from working to idle, the extension plays a short tone. This also works for background conversations visible in the sidebar of an open ChatGPT tab.

## Installation

1. Open `chrome://extensions`.
2. Enable **Developer mode**.
3. Click **Load unpacked**.
4. Select the `chatgpt-answer-sound` folder.
5. Reload any open ChatGPT tabs. Click the extension icon, then **Test sound** (shown as **Проверить звук** in the current popup).

## How it works

- `content.js` watches sidebar DOM changes with `MutationObserver` instead of polling.
- `background.js` deduplicates notifications across tabs by conversation ID using a 2.5-second window.
- `offscreen.js` generates a short tone using the Web Audio API.
- `popup.html` provides an on/off switch and a test button.

## Limitations

- Conversations that are not present in the sidebar DOM cannot be monitored.
- Detection requires at least one open ChatGPT tab.
- The disappearance of the `working` indicator does not reliably distinguish successful completion from an error or cancellation.
- Changes to the ChatGPT website's DOM may break detection.