## Copilot / Agent Prompt: Scaffold a new extension from template

Use this prompt to ask GitHub Copilot (or an agent) to guide you through creating a new extension from this template.

1) Ask user for basic metadata:
   - Extension name (kebab-case)
   - Display name
   - Publisher id
   - Short description
   - GitHub owner (for CODEOWNERS)

2) Ask if the user wants to add MCP servers and collect server details:
   - server id, command, args, framing

3) Confirm the changes and apply:
   - Update `package.json` name/displayName/description/publisher
   - Add owner to `.github/CODEOWNERS`
   - Write `resources/mcp.json` with servers

4) Offer to run `npm run update-tools` and show output, or explain next manual steps.

This document can be copied into a Copilot chat message or used by an agent to implement the changes interactively.
