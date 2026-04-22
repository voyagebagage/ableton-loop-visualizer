import { parseMessage } from "./message-parser";
import type { OSCMessage } from "../types";

export type MessageHandler = (msg: OSCMessage) => void;

export interface WSClient {
	connect: () => void;
	disconnect: () => void;
	send: (address: string, args: (number | string)[]) => void;
	onMessage: (handler: MessageHandler) => void;
	offMessage: (handler: MessageHandler) => void;
}

const RECONNECT_DELAY = 2000;

export function createWSClient(url: string): WSClient {
	let ws: WebSocket | null = null;
	let reconnectTimer: ReturnType<typeof setTimeout> | null = null;
	let shouldReconnect = false;
	const handlers = new Set<MessageHandler>();

	function connect() {
		shouldReconnect = true;
		openSocket();
	}

	function disconnect() {
		shouldReconnect = false;
		if (reconnectTimer) {
			clearTimeout(reconnectTimer);
			reconnectTimer = null;
		}
		if (ws) {
			ws.close();
			ws = null;
		}
	}

	function openSocket() {
		if (ws?.readyState === WebSocket.OPEN) return;

		ws = new WebSocket(url);

		ws.onmessage = (event) => {
			const msg = parseMessage(event.data);
			if (msg) {
				for (const handler of handlers) {
					handler(msg);
				}
			}
		};

		ws.onclose = () => {
			if (shouldReconnect) {
				reconnectTimer = setTimeout(openSocket, RECONNECT_DELAY);
			}
		};

		ws.onerror = () => {
			ws?.close();
		};
	}

	function send(address: string, args: (number | string)[]) {
		if (ws?.readyState === WebSocket.OPEN) {
			ws.send(JSON.stringify({ address, args }));
		}
	}

	function onMessage(handler: MessageHandler) {
		handlers.add(handler);
	}

	function offMessage(handler: MessageHandler) {
		handlers.delete(handler);
	}

	return { connect, disconnect, send, onMessage, offMessage };
}
