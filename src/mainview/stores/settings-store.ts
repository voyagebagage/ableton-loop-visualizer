import { createSignal } from "solid-js";

const WS_PORT = 3001;

function detectWSUrl(): string {
	// Only trust window.location.hostname when the page was served over HTTP(S)
	// (LAN/iPad case). In Electrobun's bundled `views://` scheme the hostname
	// is the view name ("mainview"), which doesn't resolve — fall back to
	// localhost so the bridge running on the same machine is reachable.
	const isHttp =
		window.location.protocol === "http:" ||
		window.location.protocol === "https:";
	const host = isHttp ? window.location.hostname : "localhost";
	return `ws://${host}:${WS_PORT}`;
}

const [wsUrl, setWsUrl] = createSignal(detectWSUrl());

export const settings = {
	wsUrl,
	setWsUrl,
};
