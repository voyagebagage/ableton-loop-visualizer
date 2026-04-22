import { BrowserWindow, Updater } from "electrobun/bun";
import { createOSCBridge } from "./osc-bridge";
import { createLANServer } from "./lan-server";

const DEV_SERVER_PORT = 5173;
const DEV_SERVER_URL = `http://localhost:${DEV_SERVER_PORT}`;

// Check if Vite dev server is running for HMR
async function getMainViewUrl(): Promise<string> {
	const channel = await Updater.localInfo.channel();
	if (channel === "dev") {
		try {
			await fetch(DEV_SERVER_URL, { method: "HEAD" });
			console.log(`HMR enabled: Using Vite dev server at ${DEV_SERVER_URL}`);
			return DEV_SERVER_URL;
		} catch {
			console.log(
				"Vite dev server not running. Run 'bun run dev:hmr' for HMR support.",
			);
		}
	}
	return "views://mainview/index.html";
}

const url = await getMainViewUrl();

const mainWindow = new BrowserWindow({
	title: "Loop View",
	url,
	frame: {
		width: 900,
		height: 650,
		x: 200,
		y: 200,
	},
});

// Start the OSC ↔ WebSocket bridge
const bridge = createOSCBridge({
	abletonHost: "127.0.0.1",
	oscSendPort: 11000,
	oscReceivePort: 11001,
	wsPort: 3001,
});

bridge.start();
// Start the LAN HTTP server so iPads/phones on the same WiFi can open the app
const lan = createLANServer({
	port: 3000,
	distPath: "dist",
});

lan.start();
console.log("Loop View started!");
