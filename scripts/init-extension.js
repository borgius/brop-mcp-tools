#!/usr/bin/env node
const fs = require('fs');
const path = require('path');
const readline = require('readline');

function ask(question) {
  const rl = readline.createInterface({ input: process.stdin, output: process.stdout });
  return new Promise((resolve) => rl.question(question, (ans) => { rl.close(); resolve(ans.trim()); }));
}

function slugify(name) {
  return name.toLowerCase().replace(/[^a-z0-9-_]+/g, '-').replace(/^-+|-+$/g, '').replace(/--+/g, '-');
}

async function main() {
  console.log('Init: Create a new extension from the MCP Generator template');

  const name = await ask('Extension name (kebab-case, e.g. my-mcp-extension): ');
  if (!name) { console.log('Aborted: name required'); process.exit(1); }
  const displayName = await ask(`Display name (default: ${name}): `) || name;
  const publisher = await ask('Publisher (your npm / marketplace publisher id): ');
  const description = await ask('Short description: ');
  const owner = await ask('GitHub owner to set in CODEOWNERS (e.g. @your-username): ');

  const addServers = (await ask('Add MCP servers now? (y/N): ')).toLowerCase() === 'y';
  const servers = {};
  if (addServers) {
    while (true) {
      const serverName = await ask('  Server identifier (e.g. my-mcp) or empty to finish: ');
      if (!serverName) break;
      const command = await ask('    Command to run (default: npx): ') || 'npx';
      const argsRaw = await ask('    Space-separated args (e.g. @org/srv@latest) or empty: ');
      const args = argsRaw ? argsRaw.split(/\s+/).filter(Boolean) : [];
      const framing = (await ask('    Framing (ndjson/content-length) [ndjson]: ')) || 'ndjson';
      servers[serverName] = { command, args, transport: { type: 'stdio', framing } };
      console.log(`    Added ${serverName}`);
    }
  }

  // Update package.json
  const pkgPath = path.join(process.cwd(), 'package.json');
  const pkg = JSON.parse(fs.readFileSync(pkgPath, 'utf8'));
  pkg.name = slugify(name);
  pkg.displayName = displayName;
  if (publisher) pkg.publisher = publisher;
  if (description) pkg.description = description;
  fs.writeFileSync(pkgPath, JSON.stringify(pkg, null, 2) + '\n', 'utf8');
  console.log('Updated package.json');

  // Update CODEOWNERS
  if (owner) {
    const codeownersPath = path.join(process.cwd(), '.github', 'CODEOWNERS');
    let content = '';
    if (fs.existsSync(codeownersPath)) content = fs.readFileSync(codeownersPath, 'utf8');
    const lines = content.split(/\r?\n/).filter(Boolean).map((l) => l.trim());
    if (!lines.some((l) => l.includes(owner))) {
      lines.push(`* ${owner}`);
      fs.writeFileSync(codeownersPath, lines.join('\n') + '\n', 'utf8');
      console.log('Updated .github/CODEOWNERS');
    } else {
      console.log('Owner already present in CODEOWNERS');
    }
  }

  // Update resources/mcp.json
  const mcpPath = path.join(process.cwd(), 'resources', 'mcp.json');
  const mcp = { servers: servers };
  if (Object.keys(servers).length > 0) {
    fs.writeFileSync(mcpPath, JSON.stringify(mcp, null, 2) + '\n', 'utf8');
    console.log('Wrote resources/mcp.json');
  } else {
    if (!fs.existsSync(mcpPath)) fs.writeFileSync(mcpPath, JSON.stringify({ servers: {} }, null, 2) + '\n', 'utf8');
    console.log('No servers added; left resources/mcp.json with empty servers object');
  }

  console.log('\nDone. Next steps:');
  console.log('- Run `npm install` to ensure deps are installed');
  console.log('- Run `npm run update-tools` to discover tools and populate package.json');
  console.log('- Run `npm run compile` then press F5 to open extension host');
  console.log('\nIf you want, you can run `git init && git add . && git commit -m "scaffold: new extension"` to save your changes.');
}

main().catch((err) => { console.error(err); process.exit(1); });
