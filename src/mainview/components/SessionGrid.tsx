import { onMount, onCleanup } from "solid-js";
import {
	startRenderLoop,
	createMockState,
	simulatePlayback,
} from "../canvas/renderer";

export default function SessionGrid() {
	let canvasRef!: HTMLCanvasElement;

	onMount(() => {
		const state = createMockState();
		simulatePlayback(state, 120);
		const cleanup = startRenderLoop(canvasRef, state);
		onCleanup(cleanup);
	});

	return (
		<canvas
			ref={canvasRef}
			class="session-canvas"
		/>
	);
}
