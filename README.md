<div align="center">

<picture>
    <source media="(prefers-color-scheme: dark)" srcset="https://github.com/MisterCommand/web-pilot/blob/main/chrome-extension/public/icon-with-title_dark.png" />
    <source media="(prefers-color-scheme: light)" srcset="https://github.com/MisterCommand/web-pilot/blob/main/chrome-extension/public/icon-with-title_light.png" />
    <img alt="Logo" src="https://github.com/MisterCommand/web-pilot/blob/main/chrome-extension/public/icon-with-title_dark.png" />
</picture>

</div>

🌐 A proof-of-concept Chrome extension that brings AI agents to your browser.

💡 Inspired and built with technologies from [browser-use](https://github.com/browser-use/browser-use).

🤖 Supports AI models with vision capabilities through the OpenAI API.

## Getting started

### Installation
1. Download extension zip and unzip.
2. Open in browser - `chrome://extensions`.
3. Check - <kbd>Developer mode</kbd>.
4. Click - <kbd>Load unpacked</kbd> in the upper left corner.
5. Select the folder inside the unzipped extension.

### Configuration
1. Open the extension popup by clicking the extension icon in the toolbar.
2. Configure the API key, Model ID, and the base URL of the API.
3. Click save.
4. Open the extension side panel by right-clicking the extension icon in the toolbar, and choose open side panel.
5. Start chatting!

Please note that only **vision**-capable **OpenAI API standard**-compatible models are supported at this moment.

Base URLs
```
OpenAI: https://api.openai.com/v1/completions
Gemini: https://generativelanguage.googleapis.com/v1beta/openai/
```

## Demo
![demo-mac](https://github.com/user-attachments/assets/5d7e8fb9-515f-4fd6-ae87-6cf8008a3f35)

## Contribution
This repo uses chrome-extension-boilerplate-react-vite as a starting point.
- Main background logic is in `pages/side-panel` directory.
- Content scripts are in `pages/content` directory.
