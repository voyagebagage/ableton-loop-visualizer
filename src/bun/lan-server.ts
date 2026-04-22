import { networkInterfaces } from "node:os";
import { resolve } from "node:path";
import { existsSync } from "node:fs";

export interface LANServerConfig {
	port: number;
	distPath: string;
}

export interface LANServer {
	start: () => void;
	stop: () => void;
}

export function createLANServer(config: LANServerConfig): LANServer {
	const { port } = config;
	const distRoot = resolve(config.distPath);
	let server: ReturnType<typeof Bun.serve> | null = null;

	async function handleRequest(req: Request): Promise<Response> {
		const url = new URL(req.url);
		let pathname = decodeURIComponent(url.pathname);
		if (pathname === "/") pathname = "/index.html";

		const resolved = resolve(distRoot + pathname);
		if (!resolved.startsWith(distRoot)) {
			return new Response("Forbidden", { status: 403 });
		}

		const file = Bun.file(resolved);
		if (!(await file.exists())) {
			console.log(`[LAN Server] 404: ${pathname}`);
			return new Response("Not Found", { status: 404 });
		}
		return new Response(file);
	}

	function start() {
		if (server) return;

		if (!existsSync(resolve(distRoot, "index.html"))) {
			console.error(`[LAN Server] WARNING: ${distRoot}/index.html not found`);
			console.error(`[LAN Server] Resolved distPath: ${distRoot}`);
			console.error(`[LAN Server] CWD: ${process.cwd()}`);
		}

		server = Bun.serve({
			port,
			hostname: "0.0.0.0",
			fetch: handleRequest,
		});
		console.log(`[LAN Server] Serving ${distRoot} on port ${port}`);
		for (const addr of getLANAddresses()) {
			console.log(`[LAN Server] http://${addr}:${port}`);
		}
	}

	function stop() {
		server?.stop();
		server = null;
	}

	return { start, stop };
}

function getLANAddresses(): string[] {
	const addrs: string[] = [];
	const ifaces = networkInterfaces();
	for (const name of Object.keys(ifaces)) {
		for (const iface of ifaces[name] ?? []) {
			if (iface.family === "IPv4" && !iface.internal) {
				addrs.push(iface.address);
			}
		}
	}
	return addrs;
}
