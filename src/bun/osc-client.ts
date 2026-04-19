import { encodeOSC, decodeOSC, type OSCMessage } from "./osc-codec";

export interface OSCClientConfig {
	abletonHost: string;
	sendPort: number;
	receivePort: number;
}

export type OSCMessageHandler = (msg: OSCMessage) => void;

export interface OSCClient {
	send: (address: string, ...args: (number | string)[]) => void;
	onMessage: (handler: OSCMessageHandler) => void;
	start: () => Promise<void>;
	stop: () => void;
}

export function createOSCClient(config: OSCClientConfig): OSCClient {
	const { abletonHost, sendPort, receivePort } = config;
	const handlers: OSCMessageHandler[] = [];
	let socket: ReturnType<typeof Bun.udpSocket> extends Promise<infer T>
		? T
		: never;
	let started = false;

	function send(address: string, ...args: (number | string)[]) {
		if (!started) return;
		const msg: OSCMessage = { address, args };
		const data = encodeOSC(msg);
		socket.send(data, abletonHost, sendPort);
	}

	function onMessage(handler: OSCMessageHandler) {
		handlers.push(handler);
	}

	async function start() {
		socket = await Bun.udpSocket({
			port: receivePort,
			socket: {
				data(_socket, data, _port, _address) {
					try {
						const msg = decodeOSC(
							data instanceof Uint8Array
								? data
								: new Uint8Array(data),
						);
						for (const handler of handlers) {
							handler(msg);
						}
					} catch (err) {
						console.error("[OSC] Failed to decode message:", err);
					}
				},
			},
		});
		started = true;
		console.log(
			`[OSC] Listening on UDP port ${receivePort}, sending to ${abletonHost}:${sendPort}`,
		);
	}

	function stop() {
		if (started) {
			socket.close();
			started = false;
			console.log("[OSC] Client stopped");
		}
	}

	return { send, onMessage, start, stop };
}
