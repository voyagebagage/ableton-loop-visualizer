# Loop View — Project Kickoff

## What You Need

- **Claude Pro or Max subscription** (you already have this)
- **GitHub account** with a private repo
- **Bun installed** locally (for when you want to test with Ableton): `curl -fsSL https://bun.sh/install | bash`
- **AbletonOSC** installed in Ableton (for testing later): https://github.com/ideoforms/AbletonOSC

That's it. No VPS, no Telegram bot, no Warp Oz, no extra tools.

---

## How It Works

Claude Code cloud sessions run on Anthropic's servers. Your machine can be off.

```
You (phone/browser)          Anthropic Cloud              GitHub
      │                           │                         │
      ├── "Work on Issue #3" ───►│                         │
      │                           ├── clones your repo      │
      │                           ├── reads CLAUDE.md        │
      │                           ├── writes code           │
      │                           ├── runs tests            │
      │                           ├── opens PR ────────────►│
      │                           │                         │
      │◄── notification ───────────────────────────────────┤
      │                           │                         │
      ├── review PR on phone ──────────────────────────────►│
      ├── leave comments ──────────────────────────────────►│
      │                           │                         │
      ├── "Fix review comments" ►│                         │
      │                           ├── pushes fixes ────────►│
      │                           │                         │
      ├── merge ───────────────────────────────────────────►│
```

You can interact mid-session, watch progress, give feedback — all from the Claude iOS app or claude.ai/code in your browser.

---

## Setup (15 minutes total)

### Step 1 — Create the GitHub Repo (5 min)

```bash
mkdir ableton-loop-visualizer && cd ableton-loop-visualizer
git init
```

Download CLAUDE.md and STRATEGY.md from the Claude.ai conversation and drop them in the repo. STRATEGY.md will be gitignored.

```bash
git add CLAUDE.md
git commit -m "Add project skill file"
```

Create the repo on GitHub:
```bash
gh repo create ableton-loop-visualizer --private --source=. --push
```

Or create it manually on github.com and push.

### Step 2 — Connect Claude Code to GitHub (5 min)

**Option A — From browser:**
1. Go to claude.ai/code
2. Click to connect GitHub when prompted
3. Authorize access to your `ableton-loop-visualizer` repo

**Option B — From terminal (if Claude Code CLI is installed):**
```bash
claude
/web-setup
```

This syncs your GitHub credentials and opens claude.ai/code.

### Step 3 — Launch Your First Cloud Session (5 min)

Go to **claude.ai/code** (browser or Claude iOS app). Select your `ableton-loop-visualizer` repo. Paste this prompt:

```
Read CLAUDE.md in this repo — it contains the full architecture, 
AbletonOSC integration reference, SolidJS patterns, and ring drawing 
spec for the Loop View project.

Work on the next open GitHub issue. Read the issue description, 
follow the patterns in CLAUDE.md, create a feature branch, implement, 
and open a PR against main when done.
```

Close your phone. Go live your life. Come back to a PR on GitHub.

---

## Day-to-Day Workflow

### Kicking Off Work (from anywhere)

Open claude.ai/code or Claude iOS app:

```
Work on the next open issue in ableton-loop-visualizer. Read CLAUDE.md for context. 
Create a feature branch, implement, open a PR.
```

Or be specific:

```
Work on Issue #4: Real-time listeners. Subscribe to AbletonOSC 
tempo, beat, clip playing_position, and playing_slot_index. Route 
positions to the circular buffer per CLAUDE.md patterns. Open a PR.
```

### Reviewing PRs

- Get GitHub notifications on your phone
- Review the diff on GitHub mobile
- Leave comments: "The ring thickness should be r * 0.24 not r * 0.18"
- Go back to claude.ai/code: "Address the review comments on the latest PR"

### Running Multiple Tasks in Parallel

```
claude --remote "Implement the OSC bridge server per CLAUDE.md"
claude --remote "Build the responsive grid layout per CLAUDE.md"
```

Two cloud VMs, two PRs, in parallel.

### When You're At Your Desk

You can also run Claude Code locally in your terminal for interactive work:

```bash
cd ableton-loop-visualizer
claude
```

This is useful for:
- Testing with Ableton connected (needs local AbletonOSC)
- Quick iterations where you want to see changes live
- Debugging WebSocket/OSC issues in real-time

---

## Milestone A — Personal Use (Weeks 1-5)

### Phase 1 — Core (Weeks 1-3)

Issues Claude will create and work through:

1. Canvas ring drawing module with mock data
2. OSC bridge server in Bun main process
3. Connect to AbletonOSC — read session state
4. Real-time listeners — subscribe to live data
5. Grid layout — session view style
6. Ableton clip and track colors

### Phase 2 — Polish + LAN Access (Weeks 4-5)

7. Loop length selector (click to cycle)
8. Remaining-bars countdown per clip
9. MIDI note-based waveform generation
10. Mute/solo/arm visual states
11. Responsive grid layout
12. Settings panel
13. LAN server for iPad/phone access
14. Browser-only dev mode

**After Milestone A: working app for your Ableton sessions, controllable from iPad.**

---

## Milestone B — Commercial Release (Weeks 6-10)

**This is when you add Linear** for proper project management:

1. Create a Linear workspace
2. Connect Linear MCP to Claude Code
3. Import remaining issues from GitHub
4. Create projects: "Development", "Launch", "Marketing"
5. From here on: Claude reads tasks from Linear, codes, opens PRs, updates status automatically

### Phase 3 — Stage Mode (Week 6)
### Phase 4 — Electrobun Packaging & Licensing (Weeks 7-8)
### Phase 5 — Launch (Weeks 9-10)

See STRATEGY.md (local, gitignored) for full task breakdown.

---

## Tips

- **Keep CLAUDE.md updated** — if you discover an AbletonOSC quirk or change a design decision, update it. Claude reads it fresh every session.
- **Be specific in PR reviews** — "make the ring thicker" is vague. "Ring thickness should be `r * 0.24` not `r * 0.18`" is actionable.
- **Test with Ableton early** — once Issue #2 (OSC bridge) lands, install AbletonOSC and test the connection locally before continuing.
- **Reference the prototype** — the interactive demo we built in this Claude.ai conversation shows exactly how the rings should look. Screenshot it and reference it in reviews.
- **One issue = one PR** — keep PRs focused. Easier to review, easier to revert if something breaks.

---

## Files in This Repo

```
ableton-loop-visualizer/
├── CLAUDE.md         # Public — architecture, specs, patterns (Claude Code reads this)
├── KICKOFF.md        # Public — setup and workflow guide
├── STRATEGY.md       # GITIGNORED — pricing, licensing, milestones (private)
└── (everything else Claude builds)
```
