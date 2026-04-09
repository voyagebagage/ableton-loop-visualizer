const SEGMENT_COUNT = 128;

export function generatePlaceholderWaveform(
	seed: number,
	segments: number = SEGMENT_COUNT,
): Float32Array {
	const waveform = new Float32Array(segments);
	let state = seed;
	for (let i = 0; i < segments; i++) {
		state = (state * 1664525 + 1013904223) & 0xffffffff;
		const base = 0.3 + ((state >>> 16) / 65535) * 0.7;
		const smooth =
			0.5 + 0.3 * Math.sin((i / segments) * Math.PI * 4 + seed);
		waveform[i] = base * smooth;
	}
	return waveform;
}

export function generateMidiWaveform(
	notes: Array<{ position: number; duration: number; velocity: number }>,
	loopLength: number,
	segments: number = SEGMENT_COUNT,
): Float32Array {
	const waveform = new Float32Array(segments);

	for (const note of notes) {
		const startSeg = Math.floor((note.position / loopLength) * segments);
		const endSeg = Math.floor(
			((note.position + note.duration) / loopLength) * segments,
		);
		const amplitude = note.velocity / 127;

		for (let i = startSeg; i <= Math.min(endSeg, segments - 1); i++) {
			waveform[i % segments] = Math.min(1, waveform[i % segments] + amplitude);
		}
	}

	let max = 0;
	for (let i = 0; i < segments; i++) {
		if (waveform[i] > max) max = waveform[i];
	}
	if (max > 0) {
		for (let i = 0; i < segments; i++) {
			waveform[i] /= max;
		}
	}

	return waveform;
}
