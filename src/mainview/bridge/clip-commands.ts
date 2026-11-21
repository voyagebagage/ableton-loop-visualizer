import { sendOSC } from "./ableton-connector";
import { session } from "../stores/session-store";

export const LOOP_LENGTHS_BEATS = [0.25, 0.5, 1, 2, 4, 8, 16, 32] as const;

export function nextLoopLength(currentBeats: number): number {
	const epsilon = 0.01;
	const idx = LOOP_LENGTHS_BEATS.findIndex(
		(l) => Math.abs(l - currentBeats) < epsilon,
	);
	if (idx === -1) {
		const larger = LOOP_LENGTHS_BEATS.find((l) => l > currentBeats);
		return larger ?? LOOP_LENGTHS_BEATS[0];
	}
	return LOOP_LENGTHS_BEATS[(idx + 1) % LOOP_LENGTHS_BEATS.length];
}

export function cycleLoopLength(trackIndex: number, sceneIndex: number): void {
	const clip = session.clips.find(
		(c) => c.trackIndex === trackIndex && c.sceneIndex === sceneIndex,
	);
	if (!clip) return;

	const currentLength = clip.loopEnd - clip.loopStart;
	if (currentLength <= 0) return;

	const newLength = nextLoopLength(currentLength);
	const newLoopEnd = clip.loopStart + newLength;

	sendOSC("/live/clip/set/loop_end", trackIndex, sceneIndex, newLoopEnd);
	sendOSC("/live/clip/get/loop_end", trackIndex, sceneIndex);
	sendOSC("/live/clip/get/length", trackIndex, sceneIndex);
}
