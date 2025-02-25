<div align="center">

<picture>
    <source media="(prefers-color-scheme: dark)" srcset="https://github.com/user-attachments/assets/99cb6303-64e4-4bed-bf3f-35735353e6de" />
    <source media="(prefers-color-scheme: light)" srcset="https://github.com/user-attachments/assets/a5dbf71c-c509-4c4f-80f4-be88a1943b0a" />
    <img alt="Logo" src="https://github.com/user-attachments/assets/99cb6303-64e4-4bed-bf3f-35735353e6de" />
</picture>

</div>

🌐 A proof-of-concept Chrome extension that brings AI agents to your browser.
💡 Inspired and built with technologies from [browser-use](https://github.com/browser-use/browser-use).
🤖 Supports AI models with vision capabilities through the OpenAI API.

## Getting started

### Installation
1. Run:
    - Dev: `pnpm dev` (on Windows, you should run as administrator;
      see [issue#456](https://github.com/Jonghakseo/chrome-extension-boilerplate-react-vite/issues/456))
    - Prod: `pnpm build`
2. Open in browser - `chrome://extensions`
3. Check - <kbd>Developer mode</kbd>
4. Click - <kbd>Load unpacked</kbd> in the upper left corner
5. Select the `dist` directory from the project

### Configuration


## Demo

## Contribution
This repo uses chrome-extension-boilerplate-react-vite as a starting point.
- Main background logic is in `pages/side-panel` directory.
- Content scripts are in `pages/content` directory.