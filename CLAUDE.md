# Loop View — Project Reference

A standalone companion app for Ableton Live that displays real-time circular loop visualizations (Loopy Pro / Erae Touch 2 style) for all session clips, connected via AbletonOSC.

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

### Why Electrobun

- **All TypeScript** — no Rust required. The entire app (main process + frontend) is one language.
- **Bun-native** — the bridge server runs inside Electrobun's Bun main process directly, eliminating the need for a sidecar process.
- **~14MB bundle** — uses system native webview, not bundled Chromium.
- **<50ms startup** — near-instant launch.
- **Built-in differential updates** — custom bsdiff-based updater generates ~14KB patches.
- **Cross-platform**: macOS, Windows, Linux with auto-generated installers.
- **Canvas 2D is WebView-safe** — Canvas behaves identically across all system webviews.

### iOS / iPad / Phone Access (LAN Browser Mode)

The SolidJS frontend is a standard web app, so any device on the same WiFi can access it:

```
iPad/iPhone/Android → Safari/Chrome → http://192.168.x.x:3000
```

This gives you loop visualization on a second screen, remote clip triggering (tap → bridge → OSC → Ableton), and start/stop recording — no App Store needed.

The Bun main process serves:
1. **WebSocket on port 3001** — relays OSC data as JSON (used by both local webview and remote browsers)
2. **HTTP on port 3000** — serves the SolidJS app as static files for LAN access

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

---

## AbletonOSC Integration Reference

### Connection
- AbletonOSC listens on UDP port **11000** (incoming), replies on port **11001**
- Connection test: send `/live/test` → expect `ok`
- All addresses follow: `/live/[object]/[action]/[property] [params...]`

### Essential Endpoints

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
- **Alternative**: Use output meter level (`/live/track/get/output_meter_level`) for real-time amplitude ring

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
const positionBuffer = new Map<string, number>();

ws.onmessage = (event) => {
  const msg = parseOSC(event.data);
  if (msg.address.includes('playing_position')) {
    const key = `${msg.trackIndex}-${msg.sceneIndex}`;
    positionBuffer.set(key, msg.value);
  }
};

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

## Ring Drawing Specification

### Visual Design (inspired by Erae Touch 2 + Loopy Pro)

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

The visualization responds to tempo changes in real-time:

```typescript
function clipPhase(clipPosition: number, loopLength: number): number {
  return (clipPosition % loopLength) / loopLength; // 0.0 → 1.0
}
```

Playhead phase is driven by beat position from AbletonOSC, NOT by local timer. Tempo changes are automatically reflected — the visualizer just renders whatever position it receives.

---

## File Structure

```
loop-view/
├── CLAUDE.md                             # This file — project reference
├── electrobun.config.ts                  # Electrobun app configuration
├── package.json
├── tsconfig.json
├── assets/
│   └── icon.png                          # App icon (1024x1024)
├── src/
│   ├── bun/                              # Electrobun Bun main process
│   │   ├── index.ts                      # App entry: create window + start bridge
│   │   ├── osc-bridge.ts                # OSC ↔ WebSocket relay
│   │   ├── osc-client.ts                # UDP socket to AbletonOSC
│   │   └── lan-server.ts                # HTTP server for LAN/iOS access (port 3000)
│   └── views/
│       └── mainview/                     # SolidJS webview app
│           ├── index.html
│           ├── index.tsx                 # SolidJS app entry
│           ├── App.tsx                   # Root component, layout modes
│           ├── components/
│           │   ├── LoopRing.tsx          # Single circular loop ring
│           │   ├── SessionGrid.tsx       # Grid of all clips as loop rings
│           │   ├── TransportBar.tsx      # BPM, play state, bar counter
│           │   ├── ClipControls.tsx      # Loop length selector, mute/solo
│           │   └── StageMode.tsx         # High-contrast projector layout
│           ├── canvas/
│           │   ├── renderer.ts           # Main rAF loop, draws all rings
│           │   ├── ring-drawing.ts       # Arc, waveform, playhead, countdown
│           │   └── waveform-gen.ts       # Waveform from MIDI notes or placeholder
│           ├── bridge/
│           │   ├── ws-client.ts          # WebSocket connection to Bun main process
│           │   ├── message-parser.ts     # Parse incoming JSON messages
│           │   └── position-buffer.ts    # Circular buffer for clip positions
│           ├── stores/
│           │   ├── session-store.ts      # SolidJS store: tracks, clips, scenes
│           │   ├── transport-store.ts    # SolidJS signals: tempo, playing, beat
│           │   └── settings-store.ts     # Layout mode, colors, preferences
│           └── utils/
│               ├── color.ts              # Ableton color conversion
│               └── timing.ts             # Beats ↔ bars conversion, countdown calc
```

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
