import { onMount, onCleanup, createEffect } from "solid-js";
import {
	startRenderLoop,
	createMockState,
	simulatePlayback,
	type ClipRenderData,
	type RendererState,
} from "../canvas/renderer";
import { generatePlaceholderWaveform } from "../canvas/waveform-gen";
import { session } from "../stores/session-store";
import { transport } from "../stores/transport-store";
import { positionBuffer } from "../bridge/position-buffer";

export default function SessionGrid() {
	let canvasRef!: HTMLCanvasElement;
	let cleanupRender: (() => void) | null = null;

	function buildLiveState(): RendererState {
		const activeClips: ClipRenderData[] = [];

		for (const track of session.tracks) {
			if (track.playingSlotIndex < 0) continue;

			const clip = session.clips.find(
				(c) =>
					c.trackIndex === track.index &&
					c.sceneIndex === track.playingSlotIndex,
			);
			if (!clip || clip.length === 0) continue;

			activeClips.push({
				trackIndex: clip.trackIndex,
				sceneIndex: clip.sceneIndex,
				name: clip.name || track.name,
				color: clip.color || track.color,
				loopLength: clip.loopEnd - clip.loopStart || clip.length,
				isAudio: clip.isAudio,
				isActive: true,
				waveform: generatePlaceholderWaveform(
					clip.trackIndex * 1337 + clip.sceneIndex * 42,
				),
			});
		}

		return { clips: activeClips, positions: positionBuffer };
	}

	onMount(() => {
		createEffect(() => {
			const isConnected = transport.connected();
			const _tracks = session.tracks.length;
			const _clips = session.clips.length;

			if (cleanupRender) {
				cleanupRender();
				cleanupRender = null;
			}

			if (isConnected && session.tracks.length > 0) {
				const state = buildLiveState();
				cleanupRender = startRenderLoop(canvasRef, state);
			} else {
				const mockState = createMockState();
				simulatePlayback(mockState, 120);
				cleanupRender = startRenderLoop(canvasRef, mockState);
			}
		});
	});

	onCleanup(() => {
		if (cleanupRender) {
			cleanupRender();
		}
	});

	return <canvas ref={canvasRef} class="session-canvas" />;
}
