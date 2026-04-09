export function abletonColorToHex(colorInt: number): string {
	const r = (colorInt >> 16) & 0xff;
	const g = (colorInt >> 8) & 0xff;
	const b = colorInt & 0xff;
	return `#${r.toString(16).padStart(2, "0")}${g.toString(16).padStart(2, "0")}${b.toString(16).padStart(2, "0")}`;
}

export function abletonColorToRgb(colorInt: number): [number, number, number] {
	const r = (colorInt >> 16) & 0xff;
	const g = (colorInt >> 8) & 0xff;
	const b = colorInt & 0xff;
	return [r, g, b];
}

export function dimColor(hex: string, factor: number): string {
	const r = parseInt(hex.slice(1, 3), 16);
	const g = parseInt(hex.slice(3, 5), 16);
	const b = parseInt(hex.slice(5, 7), 16);
	const dr = Math.round(r * factor);
	const dg = Math.round(g * factor);
	const db = Math.round(b * factor);
	return `rgb(${dr}, ${dg}, ${db})`;
}
