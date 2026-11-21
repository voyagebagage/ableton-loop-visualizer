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

type BunUDPSocket = Bun.udp.Socket<"buffer">;

export function createOSCClient(config: OSCClientConfig): OSCClient {
	const { abletonHost, sendPort, receivePort } = config;
	const handlers: OSCMessageHandler[] = [];
	let socket: BunUDPSocket | null = null;

	function send(address: string, ...args: (number | string)[]) {
		if (!socket) return;
		const outgoingMessage: OSCMessage = { address, args };
		const encodedPacket = encodeOSC(outgoingMessage);
		socket.send(encodedPacket, sendPort, abletonHost);
	}

	function onMessage(handler: OSCMessageHandler) {
		handlers.push(handler);
	}

	async function start() {
		socket = await Bun.udpSocket({
			port: receivePort,
			socket: {
				data(_socket, incomingBytes, _port, _address) {
					try {
						const bytes = new Uint8Array(
							incomingBytes.buffer,
							incomingBytes.byteOffset,
							incomingBytes.byteLength,
						);
						const decodedMessage = decodeOSC(bytes);
						for (const handler of handlers) {
							handler(decodedMessage);
						}
					} catch (err) {
						console.error("[OSC] Failed to decode message:", err);
					}
				},
			},
		});
		console.log(
			`[OSC] Listening on UDP port ${receivePort}, sending to ${abletonHost}:${sendPort}`,
		);
	}

	function stop() {
		if (socket) {
			socket.close();
			socket = null;
			console.log("[OSC] Client stopped");
		}
	}

	return { send, onMessage, start, stop };
}
