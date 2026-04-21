import type { OSCMessage } from "../types";

export function parseMessage(data: string): OSCMessage | null {
	try {
		const parsed = JSON.parse(data);
		if (
			typeof parsed.address === "string" &&
			Array.isArray(parsed.args) &&
			typeof parsed.ts === "number"
		) {
			return parsed as OSCMessage;
		}
		return null;
	} catch {
		return null;
	}
}
