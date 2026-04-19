import { createOSCClient, type OSCClient } from "./osc-client";
import type { ServerWebSocket } from "bun";

export interface BridgeConfig {
	abletonHost: string;
	oscSendPort: number;
	oscReceivePort: number;
	wsPort: number;
}

interface WSData {
	id: number;
}

export interface OSCBridge {
	start: () => Promise<void>;
	stop: () => void;
}

const HEARTBEAT_INTERVAL = 5000;
const CONNECTION_TIMEOUT = 10000;

export function createOSCBridge(config: BridgeConfig): OSCBridge {
	const { abletonHost, oscSendPort, oscReceivePort, wsPort } = config;

	let osc: OSCClient;
	let wsClients = new Set<ServerWebSocket<WSData>>();
	let wsServer: ReturnType<typeof Bun.serve>;
	let heartbeatTimer: ReturnType<typeof setInterval> | null = null;
	let lastOSCResponse = 0;
	let clientIdCounter = 0;
	let connected = false;

	function broadcastToWS(json: string) {
		for (const ws of wsClients) {
			ws.send(json);
		}
	}

	function handleOSCMessage(msg: { address: string; args: (number | string | Uint8Array)[] }) {
		lastOSCResponse = Date.now();

		if (!connected) {
			connected = true;
			broadcastToWS(
				JSON.stringify({
					address: "/bridge/status",
					args: ["connected"],
					ts: Date.now(),
				}),
			);
			console.log("[Bridge] Connected to AbletonOSC");
		}

		// Relay to all WebSocket clients
		const json = JSON.stringify({
			address: msg.address,
			args: msg.args.map((a) =>
				a instanceof Uint8Array ? Array.from(a) : a,
			),
			ts: Date.now(),
		});
		broadcastToWS(json);
	}

	function handleWSMessage(msg: string) {
		try {
			const parsed = JSON.parse(msg);
			if (parsed.address && Array.isArray(parsed.args)) {
				osc.send(parsed.address, ...parsed.args);
			}
		} catch (err) {
			console.error("[Bridge] Invalid WS message:", err);
		}
	}

	function startHeartbeat() {
		heartbeatTimer = setInterval(() => {
			osc.send("/live/test");

			if (connected && Date.now() - lastOSCResponse > CONNECTION_TIMEOUT) {
				connected = false;
				broadcastToWS(
					JSON.stringify({
						address: "/bridge/status",
						args: ["disconnected"],
						ts: Date.now(),
					}),
				);
				console.log("[Bridge] AbletonOSC connection lost");
			}
		}, HEARTBEAT_INTERVAL);
	}

	async function start() {
		osc = createOSCClient({
			abletonHost,
			sendPort: oscSendPort,
			receivePort: oscReceivePort,
		});

		osc.onMessage(handleOSCMessage);
		await osc.start();

		wsServer = Bun.serve<WSData>({
			port: wsPort,
			fetch(req, server) {
				if (server.upgrade(req, { data: { id: ++clientIdCounter } })) {
					return;
				}
				return new Response("WebSocket only", { status: 400 });
			},
			websocket: {
				open(ws) {
					wsClients.add(ws);
					console.log(`[Bridge] WebSocket client connected (id: ${ws.data.id})`);
					// Send current connection status
					ws.send(
						JSON.stringify({
							address: "/bridge/status",
							args: [connected ? "connected" : "disconnected"],
							ts: Date.now(),
						}),
					);
				},
				message(ws, msg) {
					if (typeof msg === "string") {
						handleWSMessage(msg);
					}
				},
				close(ws) {
					wsClients.delete(ws);
					console.log(`[Bridge] WebSocket client disconnected (id: ${ws.data.id})`);
				},
			},
		});

		console.log(`[Bridge] WebSocket server on port ${wsPort}`);

		startHeartbeat();

		// Initial connection test
		osc.send("/live/test");
	}

	function stop() {
		if (heartbeatTimer) {
			clearInterval(heartbeatTimer);
			heartbeatTimer = null;
		}
		osc.stop();
		wsServer.stop();
		wsClients.clear();
		console.log("[Bridge] Stopped");
	}

	return { start, stop };
}
