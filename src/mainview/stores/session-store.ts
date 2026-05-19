import { createStore } from "solid-js/store";
import type { TrackData, ClipData } from "../types";

interface SessionState {
	numTracks: number;
	numScenes: number;
	tracks: TrackData[];
	clips: ClipData[];
}

const [session, setSession] = createStore<SessionState>({
	numTracks: 0,
	numScenes: 0,
	tracks: [],
	clips: [],
});

export function setTrackCount(numTracks: number, numScenes: number) {
	setSession({ numTracks, numScenes });
}

export function setTrack(index: number, data: Partial<TrackData>) {
	setSession("tracks", index, (prev) => ({ ...prev, index, ...data }));
}

export function initTracks(count: number) {
	const tracks: TrackData[] = Array.from({ length: count }, (_, i) => ({
		index: i,
		name: `Track ${i + 1}`,
		color: 0x888888,
		playingSlotIndex: -1,
	}));
	setSession({ tracks });
}

export function initClips(numTracks: number, numScenes: number) {
	// Preserve any clip entries already populated by responses that arrived
	// before this initializer ran (race between num_scenes and per-clip data).
	const existing = new Map(
		session.clips.map((c) => [`${c.trackIndex}-${c.sceneIndex}`, c]),
	);
	const clips: ClipData[] = [];
	for (let t = 0; t < numTracks; t++) {
		for (let s = 0; s < numScenes; s++) {
			const prev = existing.get(`${t}-${s}`);
			clips.push(
				prev ?? {
					trackIndex: t,
					sceneIndex: s,
					name: "",
					color: 0x888888,
					length: 0,
					loopStart: 0,
					loopEnd: 0,
					isAudio: false,
					isMidi: false,
				},
			);
		}
	}
	setSession({ clips });
}

export function setClip(
	trackIndex: number,
	sceneIndex: number,
	data: Partial<ClipData>,
) {
	const idx = session.clips.findIndex(
		(c) => c.trackIndex === trackIndex && c.sceneIndex === sceneIndex,
	);
	if (idx >= 0) {
		setSession("clips", idx, (prev) => ({ ...prev, ...data }));
		return;
	}
	// Upsert: clip data arrived before initClips placed a slot for it.
	setSession("clips", session.clips.length, {
		trackIndex,
		sceneIndex,
		name: "",
		color: 0x888888,
		length: 0,
		loopStart: 0,
		loopEnd: 0,
		isAudio: false,
		isMidi: false,
		...data,
	});
}

export { session };
