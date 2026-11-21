import { onMount, onCleanup } from "solid-js";
import SessionGrid from "./components/SessionGrid";
import { transport } from "./stores/transport-store";
import { settings } from "./stores/settings-store";
import {
	connectToAbleton,
	disconnectFromAbleton,
} from "./bridge/ableton-connector";

export default function App() {
	onMount(() => {
		if (!settings.isDemo) connectToAbleton(settings.wsUrl());
	});

	onCleanup(() => {
		disconnectFromAbleton();
	});

	return (
		<main>
			<header class="transport-bar">
				<h1 class="app-title">Loop View</h1>
				<div class="transport-info">
					<span class="bpm">{Math.round(transport.tempo())} BPM</span>
					<span
						class={`play-state ${settings.isDemo || transport.isPlaying() ? "playing" : ""}`}
					>
						{settings.isDemo || transport.isPlaying() ? "▶" : "■"}
					</span>
					{settings.isDemo ? (
						<span class="connection-status demo">
							Demo · not connected to Ableton
						</span>
					) : (
						<span
							class={`connection-status ${transport.connected() ? "connected" : ""}`}
						>
							{transport.connected() ? "Connected" : "Disconnected"}
						</span>
					)}
				</div>
			</header>
			<SessionGrid />
		</main>
	);
}
