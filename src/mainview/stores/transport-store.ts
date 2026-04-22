import { createSignal } from "solid-js";

const [tempo, setTempo] = createSignal(120);
const [isPlaying, setIsPlaying] = createSignal(false);
const [beat, setBeat] = createSignal(0);
const [connected, setConnected] = createSignal(false);

export const transport = {
	tempo,
	isPlaying,
	beat,
	connected,
	setTempo,
	setIsPlaying,
	setBeat,
	setConnected,
};
