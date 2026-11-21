import { expect, test } from "bun:test";
import { encodeOSC, decodeOSC } from "./bun/osc-codec";
import { clipPhase, remainingBars, beatsTobars } from "./mainview/utils/timing";
import {
	abletonColorToHex,
	abletonColorToRgb,
	dimColor,
} from "./mainview/utils/color";
import { nextLoopLength } from "./mainview/bridge/clip-commands";

test("OSC encode/decode round-trips ints, floats, strings and blobs", () => {
	const msg = {
		address: "/live/clip/set/loop_end",
		args: [2, 0, 7.5, "Bass Loop", new Uint8Array([1, 2, 3])],
	};
	const decoded = decodeOSC(encodeOSC(msg));
	expect(decoded.address).toBe(msg.address);
	expect(decoded.args).toEqual(msg.args);
});

test("OSC packets are 4-byte aligned", () => {
	expect(encodeOSC({ address: "/live/test", args: ["ok"] }).length % 4).toBe(0);
});

test("timing: phase, bars remaining, beats to bars", () => {
	expect(clipPhase(6, 4)).toBe(0.5);
	expect(clipPhase(16, 16)).toBe(0);
	expect(remainingBars(1, 16)).toBe(3.75);
	expect(beatsTobars(8)).toBe(2);
});

test("color: Ableton int to hex/rgb, dimming", () => {
	expect(abletonColorToHex(0xff5f00)).toBe("#ff5f00");
	expect(abletonColorToHex(0x000a0b)).toBe("#000a0b");
	expect(abletonColorToRgb(0x0066ff)).toEqual([0, 102, 255]);
	expect(dimColor("#ff0000", 0.25)).toBe("rgb(64, 0, 0)");
});

test("loop length cycles 1/16 → 8 bars and wraps", () => {
	expect(nextLoopLength(4)).toBe(8);
	expect(nextLoopLength(32)).toBe(0.25);
	expect(nextLoopLength(6)).toBe(8); // non-standard length snaps up
	expect(nextLoopLength(64)).toBe(0.25);
});
