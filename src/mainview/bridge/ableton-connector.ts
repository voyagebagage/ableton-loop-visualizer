import { createWSClient, type WSClient } from "./ws-client";
import { setPosition, clearPositions } from "./position-buffer";
import { transport } from "../stores/transport-store";
import {
	setTrackCount,
	setTrack,
	setClip,
	initTracks,
	initClips,
	session,
} from "../stores/session-store";
import type { OSCMessage } from "../types";

let client: WSClient | null = null;
const activePositionListeners = new Set<string>();

export function connectToAbleton(wsUrl: string) {
	if (client) client.disconnect();
	client = createWSClient(wsUrl);
	client.onMessage(handleMessage);
	client.connect();
}

export function disconnectFromAbleton() {
	if (client) {
		client.disconnect();
		client = null;
	}
	transport.setConnected(false);
	clearPositions();
	activePositionListeners.clear();
}

export function sendOSC(address: string, ...args: (number | string)[]) {
	client?.send(address, args);
}

function handleMessage(msg: OSCMessage) {
	const { address, args } = msg;

	if (address === "/bridge/status") {
		const isConnected = args[0] === "connected";
		transport.setConnected(isConnected);
		if (isConnected) {
			queryInitialState();
			subscribeSongListeners();
		}
		return;
	}

	if (address === "/live/song/get/tempo") {
		transport.setTempo(args[0] as number);
		return;
	}
	if (address === "/live/song/get/is_playing") {
		transport.setIsPlaying(args[0] === 1);
		return;
	}
	if (address === "/live/song/get/beat") {
		transport.setBeat(args[0] as number);
		return;
	}

	if (address === "/live/song/get/num_tracks") {
		const numTracks = args[0] as number;
		setTrackCount(numTracks, session.numScenes);
		initTracks(numTracks);
		queryTrackData(numTracks);
		subscribeTrackListeners(numTracks);
		return;
	}
	if (address === "/live/song/get/num_scenes") {
		const numScenes = args[0] as number;
		setTrackCount(session.numTracks, numScenes);
		if (session.numTracks > 0) {
			initClips(session.numTracks, numScenes);
			queryClipData(session.numTracks, numScenes);
		}
		return;
	}

	if (address === "/live/track/get/name" && args.length >= 2) {
		setTrack(args[0] as number, { name: args[1] as string });
		return;
	}
	if (address === "/live/track/get/color" && args.length >= 2) {
		setTrack(args[0] as number, { color: args[1] as number });
		return;
	}
	if (address === "/live/track/get/playing_slot_index" && args.length >= 2) {
		const trackIndex = args[0] as number;
		const newSlot = args[1] as number;
		const oldSlot = session.tracks[trackIndex]?.playingSlotIndex ?? -1;

		setTrack(trackIndex, { playingSlotIndex: newSlot });

		// Manage clip position listeners based on slot changes
		if (oldSlot >= 0) {
			unsubscribeClipPosition(trackIndex, oldSlot);
		}
		if (newSlot >= 0) {
			subscribeClipPosition(trackIndex, newSlot);
			queryClipMetadata(trackIndex, newSlot);
		}
		return;
	}

	if (address === "/live/clip/get/name" && args.length >= 3) {
		setClip(args[0] as number, args[1] as number, { name: args[2] as string });
		return;
	}
	if (address === "/live/clip/get/color" && args.length >= 3) {
		setClip(args[0] as number, args[1] as number, { color: args[2] as number });
		return;
	}
	if (address === "/live/clip/get/length" && args.length >= 3) {
		setClip(args[0] as number, args[1] as number, { length: args[2] as number });
		return;
	}
	if (address === "/live/clip/get/loop_start" && args.length >= 3) {
		setClip(args[0] as number, args[1] as number, { loopStart: args[2] as number });
		return;
	}
	if (address === "/live/clip/get/loop_end" && args.length >= 3) {
		setClip(args[0] as number, args[1] as number, { loopEnd: args[2] as number });
		return;
	}
	if (address === "/live/clip/get/is_audio_clip" && args.length >= 3) {
		setClip(args[0] as number, args[1] as number, { isAudio: args[2] === 1 });
		return;
	}
	if (address === "/live/clip/get/is_midi_clip" && args.length >= 3) {
		setClip(args[0] as number, args[1] as number, { isMidi: args[2] === 1 });
		return;
	}

	if (address === "/live/clip/get/playing_position" && args.length >= 3) {
		setPosition(args[0] as number, args[1] as number, args[2] as number);
		return;
	}
}

// --- Subscriptions ---

function subscribeSongListeners() {
	sendOSC("/live/song/start_listen/tempo");
	sendOSC("/live/song/start_listen/is_playing");
	sendOSC("/live/song/start_listen/beat");
}

function subscribeTrackListeners(numTracks: number) {
	for (let i = 0; i < numTracks; i++) {
		sendOSC("/live/track/start_listen/playing_slot_index", i);
	}
}

function subscribeClipPosition(trackIndex: number, sceneIndex: number) {
	const key = `${trackIndex}-${sceneIndex}`;
	if (activePositionListeners.has(key)) return;
	activePositionListeners.add(key);
	sendOSC("/live/clip/start_listen/playing_position", trackIndex, sceneIndex);
}

function unsubscribeClipPosition(trackIndex: number, sceneIndex: number) {
	const key = `${trackIndex}-${sceneIndex}`;
	if (!activePositionListeners.has(key)) return;
	activePositionListeners.delete(key);
	sendOSC("/live/clip/stop_listen/playing_position", trackIndex, sceneIndex);
}

// --- Queries ---

function queryInitialState() {
	sendOSC("/live/song/get/tempo");
	sendOSC("/live/song/get/is_playing");
	sendOSC("/live/song/get/num_tracks");
	sendOSC("/live/song/get/num_scenes");
}

function queryTrackData(numTracks: number) {
	for (let i = 0; i < numTracks; i++) {
		sendOSC("/live/track/get/name", i);
		sendOSC("/live/track/get/color", i);
		sendOSC("/live/track/get/playing_slot_index", i);
	}
}

function queryClipData(numTracks: number, numScenes: number) {
	for (let t = 0; t < numTracks; t++) {
		for (let s = 0; s < numScenes; s++) {
			sendOSC("/live/clip/get/name", t, s);
			sendOSC("/live/clip/get/color", t, s);
			sendOSC("/live/clip/get/length", t, s);
			sendOSC("/live/clip/get/loop_start", t, s);
			sendOSC("/live/clip/get/loop_end", t, s);
			sendOSC("/live/clip/get/is_audio_clip", t, s);
			sendOSC("/live/clip/get/is_midi_clip", t, s);
		}
	}
}

function queryClipMetadata(trackIndex: number, sceneIndex: number) {
	sendOSC("/live/clip/get/name", trackIndex, sceneIndex);
	sendOSC("/live/clip/get/color", trackIndex, sceneIndex);
	sendOSC("/live/clip/get/length", trackIndex, sceneIndex);
	sendOSC("/live/clip/get/loop_start", trackIndex, sceneIndex);
	sendOSC("/live/clip/get/loop_end", trackIndex, sceneIndex);
	sendOSC("/live/clip/get/is_audio_clip", trackIndex, sceneIndex);
	sendOSC("/live/clip/get/is_midi_clip", trackIndex, sceneIndex);
}
