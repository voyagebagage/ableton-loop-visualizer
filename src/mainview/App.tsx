import { createSignal } from "solid-js";

export default function App() {
	const [connected, setConnected] = createSignal(false);

	return (
		<main>
			<header class="transport-bar">
				<h1 class="app-title">Loop View</h1>
				<div class="transport-info">
					<span class="bpm">120 BPM</span>
					<span class={`connection-status ${connected() ? "connected" : ""}`}>
						{connected() ? "Connected" : "Disconnected"}
					</span>
				</div>
			</header>
			<div class="session-grid">
				<p class="placeholder">Waiting for Ableton connection...</p>
			</div>
		</main>
	);
}
