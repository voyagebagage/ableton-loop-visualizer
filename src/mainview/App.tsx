import { createSignal } from "solid-js";
import SessionGrid from "./components/SessionGrid";

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
			<SessionGrid />
		</main>
	);
}
