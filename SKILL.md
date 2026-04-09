---
name: loop-visualizer
description: "Build the Ableton Loop Visualizer, a standalone SolidJS + Canvas companion app that connects to Ableton Live via AbletonOSC and displays Loopy Pro-style circular loop ring visualizations for all session clips. Use this skill whenever working on the loop visualizer app, AbletonOSC WebSocket bridge, SolidJS canvas rendering, circular waveform ring components, Electrobun desktop packaging, or license key integration. Also trigger for any Ableton companion app development, OSC protocol integration, real-time music visualization, or 60fps canvas render loop architecture."
---

# Ableton Loop Visualizer — Project Skill

A standalone companion app for Ableton Live that displays real-time circular loop visualizations (Loopy Pro / Erae Touch 2 style) for all session clips, connected via AbletonOSC.

## Product Vision

Fill the #1 gap in the Ableton ecosystem: no tool exists that shows Loopy Pro-style animated loop rings for Ableton session clips. This app connects via AbletonOSC over localhost, requires no Max4Live license, and runs as a native desktop window or browser tab.

### Target Users
- Live performers who need stage-readable loop feedback on a second screen/projector
- Producers who want a visual overview of session clip timing and phase relationships
- Live loopers using Ableton who want Loopy Pro's visual clarity without leaving Ableton

### Key Differentiators (from competitive research)
- No Max4Live license required (uses AbletonOSC, free open source)
- Real-time playhead position per clip (no existing tool does this for Ableton)
- Session-wide multi-clip overview (existing M4L devices are per-track only)
- Ableton clip colors mirrored into visualization
- Remaining-bars countdown per clip
- Stage mode with high contrast, large typography
- Cross-platform (browser-based, accessible from any device on LAN)

---

## Architecture

```
┌─────────────┐     OSC (UDP)      ┌──────────────────────────────────────────┐
│ Ableton Live │ ◄──────────────► │  Electrobun App                          │
│ + AbletonOSC │   port 11000/1   │  ┌────────────────┐  ┌────────────────┐  │
│ Remote Script│                   │  │ Bun Main Process│  │ WebView        │  │
│              │                   │  │ (Bridge Server) │──│ (SolidJS +     │  │
│              │                   │  │ OSC ↔ internal  │  │  Canvas 2D)    │  │
│              │                   │  │ WebSocket relay │  │  60fps render  │  │
│              │                   │  └────────────────┘  └────────────────┘  │
│              │                   └──────────────────────────────────────────┘
└─────────────┘
```

### Two Processes, One App

Electrobun runs as two OS-level processes inside a single application:

1. **Bun Main Process** — handles the OSC ↔ WebSocket bridge directly (no separate server needed). Receives UDP from AbletonOSC on port 11000/11001, translates to JSON, relays to the webview over Electrobun's internal WebSocket channel.
2. **WebView Process** — SolidJS app rendering Canvas 2D loop rings at 60fps. Receives clip data from the Bun main process via Electrobun's RPC system or internal WebSocket.

### Why Electrobun (not Tauri)

- **All TypeScript** — no Rust required. The entire app (main process + frontend) is one language.
- **Bun-native** — the bridge server runs inside Electrobun's Bun main process directly, eliminating the need for a sidecar process.
- **~14MB bundle** — uses system native webview, not bundled Chromium.
- **<50ms startup** — near-instant launch.
- **Built-in differential updates** — custom bsdiff-based updater generates ~14KB patches. Host on R2/S3/GitHub Releases.
- **Built-in code signing & notarization** tooling.
- **Cross-platform**: macOS, Windows, Linux with auto-generated installers.
- **SolidJS template** available out of the box (`bunx electrobun init` → solid template).
- **Canvas 2D is WebView-safe** — the rendering inconsistency risk with system webviews (WebKit/Edge WebView2/WebKitGTK) doesn't apply to Canvas which behaves identically everywhere.

### iOS / iPad / Phone Access (LAN Browser Mode)

Electrobun is desktop-only — but the app doesn't need a native iOS build. The SolidJS frontend is a standard web app, so any device on the same WiFi can access it via the browser:

```
iPad/iPhone/Android → Safari/Chrome → http://192.168.x.x:3000
```

This gives you:
- **Loop visualization on a second screen** (iPad on a stand, phone in your pocket)
- **Remote clip triggering** — tap a ring on the iPad to fire a clip in Ableton (WebSocket is bidirectional: tap → bridge server → `/live/clip/fire` OSC → Ableton)
- **Start/stop recording** — same pattern, send `/live/song/set/record_mode` or `/live/clip/fire` from the touch UI
- **No App Store needed** — it's just a web page

#### How It Works

The Electrobun app's Bun main process serves two things:
1. **WebSocket on port 3001** — relays OSC data as JSON (used by both the local webview AND remote browsers)
2. **HTTP on port 3000** — serves the SolidJS app as static files for LAN access

```typescript
// In Bun main process: serve the SolidJS app for LAN access
Bun.serve({
  port: 3000,
  fetch(req) {
    const url = new URL(req.url);
    const filePath = `./dist/mainview${url.pathname === '/' ? '/index.html' : url.pathname}`;
    const file = Bun.file(filePath);
    return new Response(file);
  },
});
```

#### Touch-Optimized Layout for iOS

When accessed from a mobile browser (detected via viewport width or user agent), the UI should:
- Show larger ring targets (min 80px tap area)
- Replace hover interactions with tap
- Add a simple toolbar: Play/Stop, Record, Scene launch buttons
- Hide settings that only matter on desktop (window size, etc.)
- Support fullscreen via `<meta name="apple-mobile-web-app-capable" content="yes">`

#### Security on LAN

The app only binds to the local network — no internet-facing ports. Traffic between devices is plain WebSocket on your WiFi. For extra safety:
- Bind the HTTP/WS servers to the machine's local IP only (not `0.0.0.0`)
- Optional: add a simple PIN/token that the mobile browser must enter on first connect
- All OSC traffic to Ableton stays on `127.0.0.1` (localhost only)

The threat surface is minimal: local network, no user accounts, no cloud, no sensitive data. Rust's memory safety advantages (Tauri) are relevant for apps handling untrusted internet input — this app only talks to Ableton on localhost and to your own devices on LAN.

#### Future: Native iOS App (Milestone C)

If demand warrants it, a dedicated iOS app could be built later using:
- **React Native** (you already know it) with a WebSocket client
- **PWA** (Progressive Web App) — add a manifest and service worker to the existing SolidJS app for "Add to Home Screen" with offline support
- PWA is the easiest path since the web app already exists

This is not needed for MVP — the browser-based LAN access covers the use case.

---

## Tech Stack

| Layer | Technology | Why |
|-------|-----------|-----|
| Frontend | **SolidJS** | True reactive signals, no VDOM diffing, near-raw-DOM performance |
| Rendering | **Canvas 2D API** | Direct pixel control, 60fps achievable, no framework overhead in hot path |
| State | **SolidJS signals + stores** | UI state only (connection status, settings, layout mode) |
| Data buffer | **Circular buffer (plain JS)** | High-frequency clip position data bypasses reactive system entirely |
| Main process | **Bun** (via Electrobun) | Native WebSocket + UDP sockets, fast startup, TypeScript-first |
| OSC library | **osc-js** or **@phasehq/osc** | Parse/emit OSC packets over UDP |
| Desktop shell | **Electrobun** | TypeScript-native desktop framework, Bun runtime, system webview |
| Licensing | **Keygen.sh** or **Lemon Squeezy** | One-time activation, works offline after first validation |

---

## Electrobun-Specific Patterns

### Project Scaffolding

```bash
bunx electrobun init
# Select "solid" template
# This creates the base structure with Bun main process + SolidJS webview
```

### Electrobun Config (electrobun.config.ts)

```typescript
import type { ElectrobunConfig } from "electrobun/bun";

const config: ElectrobunConfig = {
  name: "Loop View",
  identifier: "com.loopview.app",
  version: "1.0.0",
  icon: "./assets/icon.png",
  bun: {
    entry: "./src/bun/index.ts",  // Main process: bridge server lives here
  },
  views: {
    mainview: {
      entry: "./src/views/mainview/index.html",  // SolidJS app
    },
  },
  build: {
    mac: { target: ["arm64", "x64"] },
    win: { target: ["x64"] },
    linux: { target: ["x64", "arm64"] },
  },
  updates: {
    url: "https://updates.loopview.app",  // Static host for differential patches
  },
};

export default config;
```

### Main Process — Bridge Server (src/bun/index.ts)

```typescript
import { BrowserWindow } from "electrobun/bun";
import { createOSCBridge } from "./osc-bridge";

// Create the main window
const win = new BrowserWindow({
  title: "Loop View",
  url: "views://mainview/index.html",
  width: 900,
  height: 650,
  titleBarStyle: "hiddenInset",  // Clean look, draggable region in webview
});

// Start the OSC bridge — runs inside the Bun main process
const bridge = createOSCBridge({
  abletonHost: "127.0.0.1",
  oscInPort: 11000,
  oscOutPort: 11001,
  wsPort: 3001,  // WebSocket for webview connection
});

bridge.start();
```

### Bun ↔ WebView Communication

Electrobun provides an encrypted WebSocket RPC channel between main process and webview. For high-frequency clip position data, use a direct local WebSocket instead (lower overhead than RPC serialization):

```typescript
// In main process (Bun): relay OSC data as JSON over WebSocket
const wsServer = Bun.serve({
  port: 3001,
  fetch(req, server) {
    if (server.upgrade(req)) return;
    return new Response("WebSocket only", { status: 400 });
  },
  websocket: {
    message(ws, msg) { /* handle incoming from webview if needed */ },
  },
});

// When OSC data arrives from Ableton:
function onOSCMessage(address: string, args: any[]) {
  const json = JSON.stringify({ address, args, ts: Date.now() });
  for (const client of wsServer.clients) {
    client.send(json);
  }
}
```

```typescript
// In webview (SolidJS): connect to bridge
const ws = new WebSocket("ws://localhost:3001");
ws.onmessage = (event) => {
  const msg = JSON.parse(event.data);
  if (msg.address.includes("playing_position")) {
    // Write to circular buffer — NOT into SolidJS signals
    positionBuffer.set(`${msg.args[0]}-${msg.args[1]}`, msg.args[2]);
  }
};
```

### Auto-Updates

Electrobun's built-in updater generates differential patches via bsdiff:

```typescript
// In main process
import { Updater } from "electrobun/bun";

const updater = new Updater({
  url: "https://updates.loopview.app/latest",
  autoCheck: true,
  checkInterval: 3600000,  // Check every hour
});

updater.on("update-available", (info) => {
  // Notify webview to show update banner
  win.send("update-available", { version: info.version });
});
```

Host update artifacts on any static file host (Cloudflare R2, S3, GitHub Releases).

---

## AbletonOSC Integration Reference

### Connection
- AbletonOSC listens on UDP port **11000** (incoming), replies on port **11001**
- Connection test: send `/live/test` → expect `ok`
- All addresses follow: `/live/[object]/[action]/[property] [params...]`

### Essential Endpoints for Loop Visualizer

#### On Startup — Initial State Query
```
/live/song/get/tempo                          → bpm (float)
/live/song/get/is_playing                     → 0 or 1
/live/song/get/num_tracks                     → count (int)
/live/song/get/num_scenes                     → count (int)
/live/song/get/track_data "track.name,track.color,clip.name,clip.length,clip.color"
```

#### Per-Track Data
```
/live/track/get/name          track_index     → name (string)
/live/track/get/color         track_index     → color (int, RGB)
/live/track/get/playing_slot_index track_index → slot_index (-1 if none)
```

#### Per-Clip Data
```
/live/clip/get/name           track scene     → name (string)
/live/clip/get/color          track scene     → color (int, RGB)
/live/clip/get/length         track scene     → beats (float)
/live/clip/get/loop_start     track scene     → beats (float)
/live/clip/get/loop_end       track scene     → beats (float)
/live/clip/get/is_audio_clip  track scene     → 0 or 1
/live/clip/get/is_midi_clip   track scene     → 0 or 1
/live/clip/get/launch_quantization track scene → quantization (int)
```

#### Real-Time Listeners (subscribe for push updates)
```
/live/song/start_listen/tempo                 → pushes to /live/song/get/tempo
/live/song/start_listen/is_playing            → pushes to /live/song/get/is_playing
/live/song/start_listen/beat                  → pushes beat number every beat
/live/clip/start_listen/playing_position track scene → pushes position in beats
/live/track/start_listen/playing_slot_index track_index → pushes slot changes
```

#### Clip Control (bidirectional)
```
/live/clip/set/loop_start     track scene beats
/live/clip/set/loop_end       track scene beats
/live/clip/fire               track scene
/live/clip/stop               track scene
```

### Color Encoding
Ableton colors are RGB integers: `0x00RRGGBB`
```javascript
function abletonColorToHex(colorInt) {
  const r = (colorInt >> 16) & 0xFF;
  const g = (colorInt >> 8) & 0xFF;
  const b = colorInt & 0xFF;
  return `#${r.toString(16).padStart(2,'0')}${g.toString(16).padStart(2,'0')}${b.toString(16).padStart(2,'0')}`;
}
```

### Critical Limitation: No Waveform Data
AbletonOSC **cannot** retrieve audio waveform samples. For waveform display:
- **MIDI clips**: Use `/live/clip/get/notes` to get note data → render as stepped/bar waveform
- **Audio clips**: Generate placeholder waveform, OR use `file_path` property from Remote Script API to read the actual audio file and compute waveform client-side
- **Alternative**: Use output meter level (`/live/track/get/output_meter_level`) for real-time amplitude ring (not waveform shape, but shows activity)

---

## SolidJS + Canvas Architecture Patterns

### Core Rule: Escape Reactivity in the Hot Path

Never read SolidJS signals inside the rAF loop. Read once in a `createEffect`, capture in closure:

```typescript
createEffect(() => {
  const currentBpm = bpm();        // tracked — effect re-runs on change
  const currentClips = clips();     // tracked

  let frameId: number;
  const render = (timestamp: number) => {
    // currentBpm and currentClips are plain variables here — no tracking
    drawAllRings(ctx, currentClips, currentBpm, timestamp);
    frameId = requestAnimationFrame(render);
  };

  frameId = requestAnimationFrame(render);
  onCleanup(() => cancelAnimationFrame(frameId));
});
```

### WebSocket Data → Circular Buffer (bypass signals)

High-frequency data (clip positions at 60Hz) goes into a plain JS circular buffer, NOT into signals:

```typescript
// Created outside component — no reactivity
const positionBuffer = new Map<string, number>(); // clipKey → position in beats

// WebSocket handler — HOT PATH, no signals
ws.onmessage = (event) => {
  const msg = parseOSC(event.data);
  if (msg.address.includes('playing_position')) {
    const key = `${msg.trackIndex}-${msg.sceneIndex}`;
    positionBuffer.set(key, msg.value);
  }
};

// rAF loop reads from buffer directly
const render = () => {
  for (const clip of clips) {
    const pos = positionBuffer.get(clip.key) ?? 0;
    drawRing(ctx, clip, pos);
  }
};
```

### Signal-Driven UI vs Buffer-Driven Canvas

| Data | Storage | Update Frequency | Why |
|------|---------|-----------------|-----|
| Clip positions | CircularBuffer (Map) | 60Hz | Hot path, bypass reactivity |
| Clip metadata (name, color, length) | SolidJS store | On change (rare) | Needs to trigger UI updates |
| Transport state (playing, tempo) | SolidJS signals | On change | Drives UI indicators |
| Connection status | SolidJS signal | On change | Shows connected/disconnected |
| Layout/settings | SolidJS signals | User interaction | Persisted to localStorage |

---

## File Structure

```
loop-visualizer/
├── SKILL.md
├── electrobun.config.ts              # Electrobun app configuration
├── package.json
├── tsconfig.json
├── assets/
│   └── icon.png                      # App icon (1024x1024)
├── src/
│   ├── bun/                          # Electrobun Bun main process
│   │   ├── index.ts                  # App entry: create window + start bridge
│   │   ├── osc-bridge.ts            # OSC ↔ WebSocket relay
│   │   ├── osc-client.ts            # UDP socket to AbletonOSC
│   │   ├── lan-server.ts            # HTTP server for LAN/iOS browser access (port 3000)
│   │   └── license.ts               # License key validation (Keygen/LemonSqueezy)
│   └── views/
│       └── mainview/                 # SolidJS webview app
│           ├── index.html
│           ├── index.tsx             # SolidJS app entry
│           ├── App.tsx               # Root component, layout modes
│           ├── components/
│           │   ├── LoopRing.tsx      # Single circular loop ring (Canvas draw fn)
│           │   ├── SessionGrid.tsx   # Grid of all clips as loop rings
│           │   ├── TransportBar.tsx  # BPM, play state, bar counter
│           │   ├── ClipControls.tsx  # Loop length selector, mute/solo
│           │   └── StageMode.tsx     # High-contrast projector layout
│           ├── canvas/
│           │   ├── renderer.ts       # Main rAF loop, draws all rings
│           │   ├── ring-drawing.ts   # Arc, waveform, playhead, countdown
│           │   └── waveform-gen.ts   # Waveform from MIDI notes or placeholder
│           ├── bridge/
│           │   ├── ws-client.ts      # WebSocket connection to Bun main process
│           │   ├── message-parser.ts # Parse incoming JSON messages
│           │   └── position-buffer.ts # Circular buffer for clip positions
│           ├── stores/
│           │   ├── session-store.ts  # SolidJS store: tracks, clips, scenes
│           │   ├── transport-store.ts # SolidJS signals: tempo, playing, beat
│           │   └── settings-store.ts # Layout mode, colors, preferences
│           └── utils/
│               ├── color.ts          # Ableton color conversion
│               └── timing.ts         # Beats ↔ bars conversion, countdown calc
```

---

## Ring Drawing Specification

### Visual Design (inspired by Erae Touch 2 + Loopy Pro)

Each clip is rendered as a circular ring:

```
         ┌── Playhead needle (white line, extends beyond ring)
         │
    ╭────┼────╮
   ╱  ▮▮▮│▮▮▮  ╲    ← Waveform arc (colored segments, amplitude = ring thickness)
  │  ▮▮▮▮│▮▮▮▮  │
  │       │       │   ← Track number in center
  │  ░░░░   ░░░░  │   ← Dim segments (not yet reached by playhead)
   ╲  ░░░   ░░░  ╱
    ╰───────────╯
     [clip name]      ← Above ring
     ┌─ 4 bar ─┐     ← Below ring (clickable loop length pill)
```

### Ring Properties
- **Ring background**: Dark gray circle (#28282b)
- **Waveform segments**: 128 segments around the ring, each with variable amplitude
- **Bright segments**: From 12 o'clock clockwise to playhead position — uses track/clip color
- **Dim segments**: From playhead to next revolution — uses track color at 25% brightness
- **Playhead**: White needle line extending 3px beyond ring outer and inner edges, with a 3px white dot at tip
- **Center**: Track number, medium weight, colored when active, gray when inactive
- **Above ring**: Clip name (12-13px), track color accent bar
- **Below ring**: Loop length pill (clickable, cycles through 1/16, 1/8, 1/4, 1/2, 1, 2, 4, 8 bars)
- **Type badge**: Small circle in top-right showing "A" (audio) or "M" (MIDI)

### Waveform Generation
- **MIDI clips**: Derive from note data — each segment's amplitude = sum of active note velocities at that position
- **Audio clips**: Placeholder waveform (random-seeded per clip) until real audio analysis is implemented
- **Inactive clips**: Show waveform at 30% amplitude, no playhead, muted colors

### Grid Layout
- Session View style: tracks as columns, scenes as rows (or flattened grid showing only active clips)
- Responsive: 2-6 columns based on window width
- Each cell: dark card background with rounded corners, ring centered

---

## Tempo Adaptation

The visualization must respond to tempo changes in real-time:

```typescript
// Playhead phase is driven by beat position from AbletonOSC, NOT by local timer
// This means tempo changes are automatically reflected — no manual BPM tracking needed

function clipPhase(clipPosition: number, loopLength: number): number {
  // clipPosition comes from /live/clip/get/playing_position (in beats)
  // loopLength comes from loop_end - loop_start (in beats)
  return (clipPosition % loopLength) / loopLength; // 0.0 → 1.0
}

// The ring draws: bright arc from 0 to phase, dim arc from phase to 1.0
// Playhead needle sits at angle = phase * 2π - π/2 (12 o'clock = 0)
```

When Ableton's tempo changes:
- AbletonOSC pushes new tempo via `/live/song/get/tempo` listener
- Clip playing positions automatically reflect the new speed (Ableton handles this)
- The visualizer just renders whatever position it receives — no local tempo calculation needed
- UI updates the BPM display

---

## Development Milestones

### Milestone A — Personal Use (weeks 1-5)

Everything needed to use the app yourself in sessions. No packaging, no licensing.

#### Phase 1 — Core (weeks 1-3)
- [ ] `bunx electrobun init` with SolidJS template
- [ ] Canvas ring drawing module (offline, with mock data)
- [ ] OSC bridge in Bun main process (UDP ↔ WebSocket relay)
- [ ] Connect to AbletonOSC: read tracks, clips, transport
- [ ] Subscribe to real-time listeners (tempo, beat, clip positions, playing slots)
- [ ] Real-time clip position display with animated rings
- [ ] Grid layout showing all active clips
- [ ] Ableton clip/track colors mirrored

#### Phase 2 — Polish + LAN Access (weeks 4-5)
- [ ] Loop length selector (click to cycle: 1/16 → 8 bars)
- [ ] Remaining-bars countdown display per clip
- [ ] MIDI note-based waveform generation
- [ ] Mute/solo/arm visual states
- [ ] Responsive grid layout (2-6 columns)
- [ ] Settings panel (ring style, grid columns, font size)
- [ ] Layout persistence (localStorage)
- [ ] LAN HTTP server (port 3000) — serve SolidJS app to iPad/phone on same WiFi
- [ ] WebSocket bidirectional: tap ring on iPad → fire clip in Ableton
- [ ] Touch-optimized layout for mobile viewports (larger tap targets, fullscreen meta tag)
- [ ] Browser-only dev mode (`bun run dev` without Electrobun)

**After Milestone A: you have a working app for daily use in your Ableton sessions, controllable from your iPad/phone.**

---

### Milestone B — Commercial Release (weeks 6-10)

Packaging, licensing, stage mode, and go-to-market.

#### Phase 3 — Stage Mode (week 6)
- [ ] High-contrast stage mode (larger rings, bolder colors, pure black bg)
- [ ] Projector/second-screen optimized layout
- [ ] Minimal UI chrome (hide controls, show only rings)
- [ ] Dedicated touch controller view (separate URL: `/touch`) with big Play/Stop/Record buttons + clip fire grid
- [ ] Optional LAN PIN/token for security on shared networks

#### Phase 4 — Packaging & Licensing (weeks 7-8)
- [ ] Electrobun production build (macOS .dmg, Windows .msi, Linux .deb)
- [ ] Code signing & notarization (macOS)
- [ ] License key activation flow (Keygen.sh or Lemon Squeezy API)
- [ ] Free demo mode (4-clip limit, watermark)
- [ ] Differential auto-updater configured (host on Cloudflare R2 or GitHub Releases)
- [ ] Landing page + purchase flow

#### Phase 5 — Launch (weeks 9-10)
- [ ] Beta with 5-10 Ableton users (recruit from r/ableton, Ableton Forum)
- [ ] Landing page on own domain
- [ ] Gumroad listing
- [ ] Reddit r/ableton + Ableton Forum launch posts
- [ ] YouTube demo video (screen recording of live session with Loop View)
- [ ] Submit to Isotonik Studios for curation
- [ ] List free demo on maxforlive.com for visibility

---

## Licensing & Distribution Strategy

### License Model: One-Time Purchase + Optional Upgrade
- **Price point**: €29-49 (based on competitive analysis)
- **Free tier**: Demo mode with 4-clip limit, watermark, full functionality otherwise
- **Paid**: Unlimited clips, no watermark, stage mode
- **Upgrade pricing**: 50% discount for existing customers on major versions

### License Implementation (Keygen.sh or Lemon Squeezy)
```
1. User purchases → receives license key via email
2. App first launch → enters key → single HTTPS call to Keygen/LemonSqueezy API
3. API returns signed activation token
4. Token stored locally (encrypted in Electrobun's app data dir) → app works offline forever
5. Optional: machine fingerprint via Electrobun's Utils API for hardware-locked licenses
6. Deactivation endpoint for switching machines (2-3 activations allowed)
```

### Distribution Channels (priority order)
1. **Own website** (Lemon Squeezy storefront) — ~97% revenue
2. **Gumroad** — ~90% revenue, good for initial launch/testing
3. **Isotonik Studios** — submit for curation, access their M4L audience
4. **maxforlive.com** — free demo version for visibility
5. **Plugin Boutique** — if product matures, ~60-70% revenue but large audience

### Packaging via Electrobun
- `bunx electrobun build` generates platform-specific installers
- macOS: .dmg with code signing + notarization
- Windows: .msi installer
- Linux: .deb package
- Auto-updater: host differential patches on static file host (Cloudflare R2 recommended — cheap, fast, no server needed)
- Update check on app launch, non-blocking notification in UI

---

## Coding Conventions

- **TypeScript strict mode** everywhere
- **SolidJS idioms**: signals for UI state, stores for structured data, effects for side effects
- **No classes** in frontend — functional components + plain functions
- **Canvas drawing**: Pure functions that take (ctx, data, dimensions) — no side effects
- **Bun main process**: keep bridge logic in pure functions, Electrobun API calls only in index.ts
- **Comments**: Only for "why", never for "what"
- **Naming**: camelCase for functions/variables, PascalCase for components, UPPER_SNAKE for constants
- **File size**: Max 200 lines per file — split if larger
- **No npm fallbacks**: This project is Bun-only. Use Bun APIs (Bun.serve, Bun.udpSocket) directly.
