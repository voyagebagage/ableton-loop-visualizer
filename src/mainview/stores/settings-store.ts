import { createSignal } from "solid-js";

const WS_PORT = 3001;

function detectWSUrl(): string {
	const host = window.location.hostname || "localhost";
	return `ws://${host}:${WS_PORT}`;
}

const [wsUrl, setWsUrl] = createSignal(detectWSUrl());

export const settings = {
	wsUrl,
	setWsUrl,
};
