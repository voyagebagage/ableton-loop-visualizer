export function beatsTobars(beats: number, beatsPerBar: number = 4): number {
	return beats / beatsPerBar;
}

export function clipPhase(clipPosition: number, loopLength: number): number {
	return (clipPosition % loopLength) / loopLength;
}

export function remainingBars(
	clipPosition: number,
	loopLength: number,
	beatsPerBar: number = 4,
): number {
	const remaining = loopLength - (clipPosition % loopLength);
	return remaining / beatsPerBar;
}

export function phaseToAngle(phase: number): number {
	return phase * Math.PI * 2 - Math.PI / 2;
}
