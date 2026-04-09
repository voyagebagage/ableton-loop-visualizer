export interface ClipData {
	trackIndex: number;
	sceneIndex: number;
	name: string;
	color: number;
	length: number;
	loopStart: number;
	loopEnd: number;
	isAudio: boolean;
	isMidi: boolean;
}

export interface TrackData {
	index: number;
	name: string;
	color: number;
	playingSlotIndex: number;
}

export interface TransportState {
	tempo: number;
	isPlaying: boolean;
	beat: number;
}

export interface OSCMessage {
	address: string;
	args: (string | number)[];
	ts: number;
}
