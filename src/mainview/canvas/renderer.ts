import { drawRing, type RingConfig } from "./ring-drawing";
import { generatePlaceholderWaveform } from "./waveform-gen";
import { abletonColorToHex } from "../utils/color";

export interface ClipRenderData {
	trackIndex: number;
	sceneIndex: number;
	name: string;
	color: number;
	loopLength: number;
	isAudio: boolean;
	isActive: boolean;
	waveform: Float32Array;
}

export interface RendererState {
	clips: ClipRenderData[];
	positions: Map<string, number>;
}

export interface CellLayout {
	trackIndex: number;
	sceneIndex: number;
	cellX: number;
	cellY: number;
	cellWidth: number;
	cellHeight: number;
	cx: number;
	cy: number;
	outerRadius: number;
	innerRadius: number;
}

const CELL_PADDING = 16;
const RING_MARGIN_TOP = 30;
const RING_MARGIN_BOTTOM = 40;
const PILL_HIT_WIDTH = 80;
const PILL_HIT_HEIGHT = 28;
const PILL_HIT_TOP_OFFSET = 6;

export function computeCellLayouts(
	width: number,
	height: number,
	clips: ClipRenderData[],
): CellLayout[] {
	if (clips.length === 0) return [];

	const columns = getColumnCount(width);
	const rows = Math.ceil(clips.length / columns);
	const cellWidth = (width - CELL_PADDING) / columns;
	const cellHeight = Math.min(
		cellWidth + RING_MARGIN_TOP + RING_MARGIN_BOTTOM,
		(height - CELL_PADDING) / rows,
	);
	const ringSize =
		Math.min(
			cellWidth - CELL_PADDING * 2,
			cellHeight - RING_MARGIN_TOP - RING_MARGIN_BOTTOM - CELL_PADDING,
		) / 2;
	const outerRadius = Math.max(ringSize, 30);
	const innerRadius = outerRadius * 0.55;

	const layouts: CellLayout[] = [];
	for (let i = 0; i < clips.length; i++) {
		const clip = clips[i];
		const col = i % columns;
		const row = Math.floor(i / columns);
		const cellX = CELL_PADDING / 2 + col * cellWidth;
		const cellY = CELL_PADDING / 2 + row * cellHeight;
		layouts.push({
			trackIndex: clip.trackIndex,
			sceneIndex: clip.sceneIndex,
			cellX,
			cellY,
			cellWidth,
			cellHeight,
			cx: cellX + cellWidth / 2,
			cy: cellY + RING_MARGIN_TOP + outerRadius,
			outerRadius,
			innerRadius,
		});
	}
	return layouts;
}

export function getPillHitRect(cell: CellLayout): {
	x: number;
	y: number;
	w: number;
	h: number;
} {
	return {
		x: cell.cx - PILL_HIT_WIDTH / 2,
		y: cell.cy + cell.outerRadius + PILL_HIT_TOP_OFFSET,
		w: PILL_HIT_WIDTH,
		h: PILL_HIT_HEIGHT,
	};
}

export function startRenderLoop(
	canvas: HTMLCanvasElement,
	state: RendererState,
) {
	const ctx = canvas.getContext("2d")!;
	let frameId: number;

	function resize() {
		const dpr = window.devicePixelRatio || 1;
		const rect = canvas.getBoundingClientRect();
		canvas.width = rect.width * dpr;
		canvas.height = rect.height * dpr;
		ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
	}

	resize();
	window.addEventListener("resize", resize);

	function render() {
		const { width, height } = canvas.getBoundingClientRect();
		ctx.clearRect(0, 0, width, height);

		if (state.clips.length === 0) {
			frameId = requestAnimationFrame(render);
			return;
		}

		const layouts = computeCellLayouts(width, height, state.clips);

		for (let i = 0; i < state.clips.length; i++) {
			const clip = state.clips[i];
			const layout = layouts[i];

			ctx.beginPath();
			ctx.roundRect(
				layout.cellX + 4,
				layout.cellY + 4,
				layout.cellWidth - 8,
				layout.cellHeight - 8,
				8,
			);
			ctx.fillStyle = "#1e1e21";
			ctx.fill();

			const key = `${clip.trackIndex}-${clip.sceneIndex}`;
			const position = state.positions.get(key) ?? 0;
			const phase = clip.isActive
				? (position % clip.loopLength) / clip.loopLength
				: 0;

			const config: RingConfig = {
				x: layout.cx,
				y: layout.cy,
				outerRadius: layout.outerRadius,
				innerRadius: layout.innerRadius,
				color: abletonColorToHex(clip.color),
				phase,
				waveform: clip.waveform,
				isActive: clip.isActive,
				trackNumber: clip.trackIndex + 1,
				clipName: clip.name,
				loopBars: clip.loopLength / 4,
				isAudio: clip.isAudio,
			};

			drawRing(ctx, config);
		}

		frameId = requestAnimationFrame(render);
	}

	frameId = requestAnimationFrame(render);

	return () => {
		cancelAnimationFrame(frameId);
		window.removeEventListener("resize", resize);
	};
}

function getColumnCount(width: number): number {
	if (width < 400) return 2;
	if (width < 600) return 3;
	if (width < 900) return 4;
	if (width < 1200) return 5;
	return 6;
}

// Mock data for offline development
export function createMockState(): RendererState {
	const ABLETON_COLORS = [
		0xff2600, 0xff5f00, 0xffcc00, 0x00cc00, 0x00cccc, 0x0066ff, 0x7f33ff,
		0xff0066,
	];

	const clips: ClipRenderData[] = [
		{ name: "Drums", loopLength: 16, isAudio: true, isActive: true },
		{ name: "Bass Loop", loopLength: 8, isAudio: false, isActive: true },
		{ name: "Keys Pad", loopLength: 32, isAudio: true, isActive: true },
		{ name: "Vox Chop", loopLength: 4, isAudio: true, isActive: true },
		{ name: "Synth Lead", loopLength: 16, isAudio: false, isActive: true },
		{ name: "Hi-Hats", loopLength: 4, isAudio: false, isActive: false },
		{ name: "FX Riser", loopLength: 8, isAudio: true, isActive: false },
		{ name: "Sub Bass", loopLength: 16, isAudio: false, isActive: true },
	].map((c, i) => ({
		trackIndex: i,
		sceneIndex: 0,
		color: ABLETON_COLORS[i % ABLETON_COLORS.length],
		waveform: generatePlaceholderWaveform(i * 1337 + 42),
		...c,
	}));

	const positions = new Map<string, number>();

	return { clips, positions };
}

export function simulatePlayback(
	state: RendererState,
	bpm: number = 120,
): () => void {
	const beatsPerSecond = bpm / 60;
	const startTime = performance.now();

	function update() {
		const elapsed = (performance.now() - startTime) / 1000;
		const beatPosition = elapsed * beatsPerSecond;

		for (const clip of state.clips) {
			if (!clip.isActive) continue;
			const key = `${clip.trackIndex}-${clip.sceneIndex}`;
			positions.set(key, beatPosition);
		}
		frameId = requestAnimationFrame(update);
	}

	const positions = state.positions;
	let frameId = requestAnimationFrame(update);
	return () => cancelAnimationFrame(frameId);
}
