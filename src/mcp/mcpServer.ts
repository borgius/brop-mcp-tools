import { spawn, type ChildProcessWithoutNullStreams } from 'node:child_process';
import * as path from 'node:path';

import { JsonRpcClient } from './jsonRpc';
import type { McpCallToolResponse, McpServerConfig, McpTool, McpToolsListResponse } from './types';

function augmentPathEnv(existing: string | undefined): string {
	const separator = path.delimiter;
	const parts = (existing ?? '').split(separator).filter(Boolean);
	const extras = [
		// Common macOS locations where Node/npm/npx live
		'/opt/homebrew/bin',
		'/usr/local/bin',
		'/usr/bin',
		'/bin',
	];
	const seen = new Set<string>();
	const out: string[] = [];
	for (const p of [...parts, ...extras]) {
		if (!p) {
			continue;
		}
		if (seen.has(p)) {
			continue;
		}
		seen.add(p);
		out.push(p);
	}
	return out.join(separator);
}

export type McpServerClientOptions = {
	logger?: (message: string) => void;
	rootDir?: string;
	clientInfo?: { name: string; version: string };
};

export class McpServerClient {
	public readonly name: string;
	private readonly config: McpServerConfig;
	private readonly opts: McpServerClientOptions;
	private child: ChildProcessWithoutNullStreams | undefined;
	private rpc: JsonRpcClient | undefined;
	private started = false;
	private startPromise: Promise<void> | undefined;

	constructor(name: string, config: McpServerConfig, opts?: McpServerClientOptions) {
		this.name = name;
		this.config = config;
		this.opts = opts ?? {};
	}

	public async start(): Promise<void> {
		if (this.startPromise) {
			return await this.startPromise;
		}

		this.startPromise = this.startImpl();
		return await this.startPromise;
	}

	private async startImpl(): Promise<void> {
		if (this.started) {
			return;
		}
		this.started = true;

		const cwd = this.config.cwd
			? path.resolve(this.opts.rootDir ?? process.cwd(), this.config.cwd)
			: (this.opts.rootDir ?? process.cwd());

		const spawnCommand = this.config.command;
		const spawnArgs = this.config.args ?? [];
		this.opts.logger?.(
			`[${this.name}] spawn: ${spawnCommand}${spawnArgs.length ? ' ' + spawnArgs.join(' ') : ''} (cwd=${cwd})`
		);

		const childEnv: NodeJS.ProcessEnv = {
			...process.env,
			...(this.config.env ?? {}),
		};
		childEnv.PATH = augmentPathEnv(childEnv.PATH);

		this.child = spawn(spawnCommand, spawnArgs, {
			cwd,
			env: childEnv,
			stdio: 'pipe',
		});

		// Unref the child process so Node.js doesn't wait for it to exit
		this.child.unref();

		const child = this.child;
		const errorPromise = new Promise<never>((_, reject) => {
			child.once('error', (err) => {
				const msg = String((err as any)?.message ?? err);
				this.opts.logger?.(`[${this.name}] spawn error: ${msg}`);
				const code = (err as any)?.code;
				if (code === 'ENOENT') {
					this.opts.logger?.(
						`[${this.name}] hint: command not found (ENOENT). If this is 'npx', launch VS Code from a shell (so PATH is inherited) or set an absolute command path in resources/mcp.json.`
					);
				}
				reject(err);
			});
		});
		const exitPromise = new Promise<never>((_, reject) => {
			child.once('exit', (code, signal) => {
				reject(new Error(`MCP server '${this.name}' exited before ready (code=${code}, signal=${signal})`));
			});
		});

		this.child.stderr.on('data', (d) => {
			this.opts.logger?.(`[${this.name} stderr] ${String(d).trimEnd()}`);
		});

		this.child.on('exit', (code, signal) => {
			this.opts.logger?.(`[${this.name}] exited (code=${code}, signal=${signal})`);
		});

		// Default to ndjson framing (simpler, more widely supported).
		// The reader supports both Content-Length and ndjson formats,
		// so we can receive responses in either format regardless of what we send.
		this.rpc = new JsonRpcClient(this.child.stdout, this.child.stdin, {
			logger: this.opts.logger ? (m) => this.opts.logger?.(`[${this.name} rpc] ${m}`) : undefined,
			framing: this.config.transport?.framing ?? 'ndjson',
		});

		await Promise.race([this.initialize(), errorPromise, exitPromise, this.timeout(60000, 'initialize timeout')]);
	}

	public async stop(): Promise<void> {
		this.started = false;
		this.startPromise = undefined;
		
		// Clean up RPC client and remove all listeners
		if (this.rpc) {
			this.rpc.cleanup();
			this.rpc = undefined;
		}

		if (this.child && !this.child.killed) {
			// Remove all event listeners from child to prevent keeping event loop alive
			this.child.removeAllListeners();
			this.child.stdin.removeAllListeners();
			this.child.stdout.removeAllListeners();
			this.child.stderr.removeAllListeners();
			
			// Unpipe and destroy streams to release handles
			try {
				this.child.stdout.unpipe();
				this.child.stderr.unpipe();
				this.child.stdin.end();
				this.child.stdout.destroy();
				this.child.stderr.destroy();
			} catch {
				// Ignore errors during stream cleanup
			}
			
			// Kill the process - don't wait for it
			this.child.kill('SIGTERM');
			
			// Force kill after a brief delay if still running
			setTimeout(() => {
				if (this.child && !this.child.killed) {
					this.child.kill('SIGKILL');
				}
			}, 500).unref();
		}
		this.child = undefined;
	}

	public async listTools(): Promise<McpTool[]> {
		await this.start();
		const rpc = this.mustRpc();
		const tools: McpTool[] = [];
		let cursor: string | undefined;
		
		const timeoutMs = 30000; // 30 second timeout
		const listToolsWithTimeout = async () => {
			while (true) {
				const res = (await rpc.request('tools/list', cursor ? { cursor } : {})) as McpToolsListResponse;
				tools.push(...(res.tools ?? []));
				cursor = res.nextCursor;
				if (!cursor) {
					break;
				}
			}
		};
		
		await Promise.race([
			listToolsWithTimeout(),
			this.timeout(timeoutMs, `listTools timeout`),
		]);
		
		return tools;
	}

	public async callTool(toolName: string, args: unknown): Promise<McpCallToolResponse> {
		await this.start();
		const rpc = this.mustRpc();
		const res = (await rpc.request('tools/call', {
			name: toolName,
			arguments: args ?? {},
		})) as McpCallToolResponse;
		return res;
	}

	private mustRpc(): JsonRpcClient {
		if (!this.rpc) {
			throw new Error(`MCP server '${this.name}' is not started`);
		}
		return this.rpc;
	}

	private async initialize(): Promise<void> {
		const rpc = this.mustRpc();
		const clientInfo = this.opts.clientInfo ?? { name: 'mcp-generator', version: '0.0.1' };

		// MCP initialize handshake (best-effort; some servers may accept empty capabilities)
		await rpc.request('initialize', {
			protocolVersion: '2024-11-05',
			capabilities: {},
			clientInfo,
		});
		rpc.notify('initialized', {});
	}

	private timeout(ms: number, label: string): Promise<never> {
		return new Promise((_, reject) => {
			const t = setTimeout(() => {
				reject(new Error(`MCP server '${this.name}' ${label} after ${ms}ms`));
			}, ms);
			// node: keep process responsive
			(t as any).unref?.();
		});
	}
}
