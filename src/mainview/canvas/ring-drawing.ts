import { dimColor } from "../utils/color";
import { phaseToAngle } from "../utils/timing";

const SEGMENT_COUNT = 128;
const TWO_PI = Math.PI * 2;
const START_ANGLE = -Math.PI / 2; // 12 o'clock

export interface RingConfig {
	x: number;
	y: number;
	outerRadius: number;
	innerRadius: number;
	color: string;
	phase: number;
	waveform: Float32Array;
	isActive: boolean;
	trackNumber: number;
	clipName: string;
	loopBars: number;
	isAudio: boolean;
}

export function drawRing(ctx: CanvasRenderingContext2D, ring: RingConfig) {
	const {
		x,
		y,
		outerRadius,
		innerRadius,
		color,
		phase,
		waveform,
		isActive,
		trackNumber,
		clipName,
		loopBars,
		isAudio,
	} = ring;

	drawRingBackground(ctx, x, y, outerRadius);
	drawWaveformSegments(
		ctx,
		x,
		y,
		outerRadius,
		innerRadius,
		color,
		phase,
		waveform,
		isActive,
	);

	if (isActive) {
		drawPlayhead(ctx, x, y, outerRadius, innerRadius, phase);
	}

	drawCenterLabel(ctx, x, y, innerRadius, trackNumber, color, isActive);
	drawClipName(ctx, x, y, outerRadius, clipName, color);
	drawLoopLengthPill(ctx, x, y, outerRadius, loopBars);
	drawTypeBadge(ctx, x, y, outerRadius, isAudio);
}

function drawRingBackground(
	ctx: CanvasRenderingContext2D,
	x: number,
	y: number,
	radius: number,
) {
	ctx.beginPath();
	ctx.arc(x, y, radius, 0, TWO_PI);
	ctx.fillStyle = "#28282b";
	ctx.fill();
}

function drawWaveformSegments(
	ctx: CanvasRenderingContext2D,
	x: number,
	y: number,
	outerRadius: number,
	innerRadius: number,
	color: string,
	phase: number,
	waveform: Float32Array,
	isActive: boolean,
) {
	const segmentAngle = TWO_PI / SEGMENT_COUNT;
	const ringWidth = outerRadius - innerRadius;
	const brightColor = color;
	const dimmedColor = dimColor(color, 0.25);
	const inactiveAlpha = isActive ? 1 : 0.3;

	for (let i = 0; i < SEGMENT_COUNT; i++) {
		const segStart = START_ANGLE + i * segmentAngle;
		const segEnd = segStart + segmentAngle * 0.85; // gap between segments
		const amplitude = waveform[i] * inactiveAlpha;
		const segThickness = ringWidth * 0.3 + ringWidth * 0.7 * amplitude;

		const midRadius = (outerRadius + innerRadius) / 2;
		const segOuter = midRadius + segThickness / 2;
		const segInner = midRadius - segThickness / 2;

		// Bright if segment is behind the playhead (already played)
		const segPhase = ((segStart - START_ANGLE + TWO_PI) % TWO_PI) / TWO_PI;
		const isBright = isActive && segPhase <= phase;

		ctx.beginPath();
		ctx.arc(x, y, segOuter, segStart, segEnd);
		ctx.arc(x, y, segInner, segEnd, segStart, true);
		ctx.closePath();
		ctx.fillStyle = isBright ? brightColor : dimmedColor;
		ctx.fill();
	}
}

function drawPlayhead(
	ctx: CanvasRenderingContext2D,
	x: number,
	y: number,
	outerRadius: number,
	innerRadius: number,
	phase: number,
) {
	const angle = phaseToAngle(phase);
	const extend = 3;
	const cos = Math.cos(angle);
	const sin = Math.sin(angle);

	const x1 = x + (innerRadius - extend) * cos;
	const y1 = y + (innerRadius - extend) * sin;
	const x2 = x + (outerRadius + extend) * cos;
	const y2 = y + (outerRadius + extend) * sin;

	ctx.beginPath();
	ctx.moveTo(x1, y1);
	ctx.lineTo(x2, y2);
	ctx.strokeStyle = "#ffffff";
	ctx.lineWidth = 2;
	ctx.stroke();

	// Dot at tip
	ctx.beginPath();
	ctx.arc(x2, y2, 3, 0, TWO_PI);
	ctx.fillStyle = "#ffffff";
	ctx.fill();
}

function drawCenterLabel(
	ctx: CanvasRenderingContext2D,
	x: number,
	y: number,
	innerRadius: number,
	trackNumber: number,
	color: string,
	isActive: boolean,
) {
	const fontSize = Math.max(14, innerRadius * 0.5);
	ctx.font = `500 ${fontSize}px -apple-system, BlinkMacSystemFont, sans-serif`;
	ctx.textAlign = "center";
	ctx.textBaseline = "middle";
	ctx.fillStyle = isActive ? color : "#666666";
	ctx.fillText(`${trackNumber}`, x, y);
}

function drawClipName(
	ctx: CanvasRenderingContext2D,
	x: number,
	y: number,
	outerRadius: number,
	clipName: string,
	color: string,
) {
	const labelY = y - outerRadius - 18;

	// Accent bar
	const barWidth = 20;
	ctx.fillStyle = color;
	ctx.fillRect(x - barWidth / 2, labelY - 2, barWidth, 2);

	// Clip name
	ctx.font = "12px -apple-system, BlinkMacSystemFont, sans-serif";
	ctx.textAlign = "center";
	ctx.textBaseline = "bottom";
	ctx.fillStyle = "#cccccc";

	const maxWidth = outerRadius * 2;
	const displayName =
		ctx.measureText(clipName).width > maxWidth
			? clipName.slice(0, 12) + "..."
			: clipName;
	ctx.fillText(displayName, x, labelY - 4);
}

function drawLoopLengthPill(
	ctx: CanvasRenderingContext2D,
	x: number,
	y: number,
	outerRadius: number,
	bars: number,
) {
	const label = bars < 1 ? `1/${Math.round(1 / bars)}` : `${bars}`;
	const text = `${label} bar${bars !== 1 ? "s" : ""}`;

	ctx.font = "11px -apple-system, BlinkMacSystemFont, sans-serif";
	const textWidth = ctx.measureText(text).width;
	const pillWidth = textWidth + 16;
	const pillHeight = 20;
	const pillX = x - pillWidth / 2;
	const pillY = y + outerRadius + 10;

	ctx.beginPath();
	ctx.roundRect(pillX, pillY, pillWidth, pillHeight, 10);
	ctx.fillStyle = "#333336";
	ctx.fill();

	ctx.textAlign = "center";
	ctx.textBaseline = "middle";
	ctx.fillStyle = "#aaaaaa";
	ctx.fillText(text, x, pillY + pillHeight / 2);
}

function drawTypeBadge(
	ctx: CanvasRenderingContext2D,
	x: number,
	y: number,
	outerRadius: number,
	isAudio: boolean,
) {
	const badgeX = x + outerRadius * 0.7;
	const badgeY = y - outerRadius * 0.7;
	const badgeRadius = 8;

	ctx.beginPath();
	ctx.arc(badgeX, badgeY, badgeRadius, 0, TWO_PI);
	ctx.fillStyle = isAudio ? "#4a6fa5" : "#6a4a8a";
	ctx.fill();

	ctx.font = "bold 9px -apple-system, BlinkMacSystemFont, sans-serif";
	ctx.textAlign = "center";
	ctx.textBaseline = "middle";
	ctx.fillStyle = "#ffffff";
	ctx.fillText(isAudio ? "A" : "M", badgeX, badgeY);
}
