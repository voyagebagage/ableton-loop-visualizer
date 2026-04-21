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
	const clips: ClipData[] = [];
	for (let t = 0; t < numTracks; t++) {
		for (let s = 0; s < numScenes; s++) {
			clips.push({
				trackIndex: t,
				sceneIndex: s,
				name: "",
				color: 0x888888,
				length: 0,
				loopStart: 0,
				loopEnd: 0,
				isAudio: false,
				isMidi: false,
			});
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
	}
}

export { session };
