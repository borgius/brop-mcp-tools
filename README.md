# BROP tools

**BROP (Browser Remote Operations Protocol)** is a Chrome extension that provides native browser automation capabilities through a unified WebSocket bridge server. It enables you to control and automate Chrome programmatically with capabilities including:

- 🎯 **Navigate** web pages and monitor page status
- 🖱️ **Click** elements with smart visibility checks
- ⌨️ **Type** text with human-like behavior simulation  
- 📸 **Screenshot** capture of pages or specific elements
- 🔧 **Execute JavaScript** with full async/await support
- 📝 **Extract content** with semantic markdown and CSS selectors
- 🪟 **Manage tabs** (create, close, list, switch)
- 📊 **Console logs** capture and monitoring
- 🔍 **DOM operations** with simplified element interaction

This extension brings BROP's powerful automation tools into VS Code as native GitHub Copilot tools, allowing you to control browsers through natural language.

## Quick Start

### 1. Install the Chrome Extension

brop-mcp requires a companion Chrome extension to communicate with the browser:

1. Download the extension from [brop GitHub releases](https://github.com/borgius/brop/releases/tag/v2.7.8)
2. Unzip the downloaded file
3. Open Chrome and navigate to `chrome://extensions/`
4. Enable "Developer mode" (toggle in the top right)
5. Click "Load unpacked" and select the unzipped extension folder
6. Ensure the extension is enabled when using brop tools

### 2. Use the Tools

Once installed, the tools become available in GitHub Copilot. You can:

- **Ask Copilot to use them**: "Take a screenshot of example.com" or "Navigate to google.com and search for AI"
- **Tools appear in Copilot's tool picker**: When chatting with Copilot, it can automatically select and invoke these tools
- **See tool results in real-time**: Copilot will show you what the tools are doing and their results

## Working with brop-mcp

**brop-mcp** is a browser automation MCP server that provides powerful Chrome DevTools Protocol (CDP) capabilities. It enables you to control a web browser programmatically through natural language instructions to Copilot.

### What can brop-mcp do?

The brop-mcp server provides these capabilities:

- **Navigate** to URLs
- **Click** elements on pages
- **Type** text into forms
- **Take screenshots** of pages or elements
- **Execute JavaScript** in the browser context
- **Get page content** (HTML, text)
- **Wait** for elements or conditions
- **Handle dialogs** (alerts, confirms, prompts)
- **Manage cookies** and local storage
- **Network interception** and monitoring

### Setting up brop-mcp

The brop-mcp server is already configured in this extension.:

```jsonc
{
  "servers": {
	 "brop-mcp": {
		"command": "npx",
		"args": ["@borgius/brop-mcp@latest"]
	 }
  }
}
```

**Requirements:**

1. **Install the Chrome extension** (required):

	brop-mcp requires a companion Chrome extension to communicate with the browser. 
	
	- Download the extension from [brop GitHub releases](https://github.com/borgius/brop/releases/tag/v2.7.8)
	- Unzip the downloaded file
	- Open Chrome → `chrome://extensions/`
	- Enable "Developer mode" (toggle in top right)
	- Click "Load unpacked" and select the unzipped extension folder
	- The extension must be enabled and running when you use brop tools

2. **Start using it with Copilot**:

	Example prompts:
	
	- "Navigate to https://github.com and take a screenshot"
	- "Go to google.com, search for 'VS Code extensions', and show me the results"
	- "Open example.com, click the login button, and fill in the form"
	- "Take a screenshot of the header element on the current page"

### brop-mcp Tools

After running `npm run update-tools`, you'll see tools like:

- `brop_cdp_navigate` - Navigate to a URL
- `brop_cdp_click` - Click an element
- `brop_cdp_type` - Type text
- `brop_cdp_screenshot` - Capture screenshots
- `brop_cdp_evaluate` - Execute JavaScript
- `brop_cdp_getContent` - Get page HTML/text
- And many more...

### Troubleshooting brop-mcp

**Browser not responding:**
- Ensure the Chrome extension is installed and enabled
- Check that Chrome is running
- Restart VS Code and Chrome

## License

MIT

## Contributing

Issues and pull requests are welcome!
