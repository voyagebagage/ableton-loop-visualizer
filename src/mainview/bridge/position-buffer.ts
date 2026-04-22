const positionBuffer = new Map<string, number>();

export function setPosition(
	trackIndex: number,
	sceneIndex: number,
	position: number,
) {
	positionBuffer.set(`${trackIndex}-${sceneIndex}`, position);
}

export function getPosition(
	trackIndex: number,
	sceneIndex: number,
): number {
	return positionBuffer.get(`${trackIndex}-${sceneIndex}`) ?? 0;
}

export function clearPositions() {
	positionBuffer.clear();
}

export { positionBuffer };
