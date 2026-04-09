// OSC 1.0 binary protocol encoder/decoder
// Spec: https://opensoundcontrol.stanford.edu/spec-1_0.html

export interface OSCMessage {
	address: string;
	args: OSCArg[];
}

export type OSCArg = number | string | Uint8Array;

// --- Encoding ---

export function encodeOSC(msg: OSCMessage): Uint8Array {
	const addressBytes = encodeString(msg.address);
	const typeTag = "," + msg.args.map(argTypeTag).join("");
	const typeTagBytes = encodeString(typeTag);

	const argBuffers: Uint8Array[] = [];
	for (const arg of msg.args) {
		if (typeof arg === "number") {
			if (Number.isInteger(arg)) {
				argBuffers.push(encodeInt32(arg));
			} else {
				argBuffers.push(encodeFloat32(arg));
			}
		} else if (typeof arg === "string") {
			argBuffers.push(encodeString(arg));
		} else {
			argBuffers.push(encodeBlob(arg));
		}
	}

	const totalSize =
		addressBytes.length +
		typeTagBytes.length +
		argBuffers.reduce((sum, b) => sum + b.length, 0);

	const result = new Uint8Array(totalSize);
	let offset = 0;
	result.set(addressBytes, offset);
	offset += addressBytes.length;
	result.set(typeTagBytes, offset);
	offset += typeTagBytes.length;
	for (const buf of argBuffers) {
		result.set(buf, offset);
		offset += buf.length;
	}

	return result;
}

function argTypeTag(arg: OSCArg): string {
	if (typeof arg === "number") {
		return Number.isInteger(arg) ? "i" : "f";
	}
	if (typeof arg === "string") return "s";
	return "b";
}

function encodeString(str: string): Uint8Array {
	const encoded = new TextEncoder().encode(str);
	const padded = pad4(encoded.length + 1); // +1 for null terminator
	const result = new Uint8Array(padded);
	result.set(encoded);
	// remaining bytes are already 0 (null terminator + padding)
	return result;
}

function encodeInt32(value: number): Uint8Array {
	const buf = new ArrayBuffer(4);
	new DataView(buf).setInt32(0, value, false); // big-endian
	return new Uint8Array(buf);
}

function encodeFloat32(value: number): Uint8Array {
	const buf = new ArrayBuffer(4);
	new DataView(buf).setFloat32(0, value, false); // big-endian
	return new Uint8Array(buf);
}

function encodeBlob(data: Uint8Array): Uint8Array {
	const sizeBytes = encodeInt32(data.length);
	const padded = pad4(data.length);
	const result = new Uint8Array(4 + padded);
	result.set(sizeBytes);
	result.set(data, 4);
	return result;
}

// --- Decoding ---

export function decodeOSC(data: Uint8Array): OSCMessage {
	let offset = 0;

	const [address, addrEnd] = readString(data, offset);
	offset = addrEnd;

	const [typeTag, typeEnd] = readString(data, offset);
	offset = typeEnd;

	const args: OSCArg[] = [];
	// Skip the leading ','
	const types = typeTag.startsWith(",") ? typeTag.slice(1) : typeTag;

	for (const type of types) {
		switch (type) {
			case "i": {
				const view = new DataView(
					data.buffer,
					data.byteOffset + offset,
					4,
				);
				args.push(view.getInt32(0, false));
				offset += 4;
				break;
			}
			case "f": {
				const view = new DataView(
					data.buffer,
					data.byteOffset + offset,
					4,
				);
				args.push(view.getFloat32(0, false));
				offset += 4;
				break;
			}
			case "s": {
				const [str, strEnd] = readString(data, offset);
				args.push(str);
				offset = strEnd;
				break;
			}
			case "b": {
				const view = new DataView(
					data.buffer,
					data.byteOffset + offset,
					4,
				);
				const blobSize = view.getInt32(0, false);
				offset += 4;
				args.push(data.slice(offset, offset + blobSize));
				offset += pad4(blobSize);
				break;
			}
			case "d": {
				const view = new DataView(
					data.buffer,
					data.byteOffset + offset,
					8,
				);
				args.push(view.getFloat64(0, false));
				offset += 8;
				break;
			}
			case "T":
				args.push(1);
				break;
			case "F":
				args.push(0);
				break;
			case "N":
				break;
			default:
				// Unknown type tag — skip
				break;
		}
	}

	return { address, args };
}

function readString(data: Uint8Array, offset: number): [string, number] {
	let end = offset;
	while (end < data.length && data[end] !== 0) {
		end++;
	}
	const str = new TextDecoder().decode(data.subarray(offset, end));
	// Advance past null terminator + padding to 4-byte boundary
	return [str, pad4Offset(end + 1)];
}

function pad4(n: number): number {
	return (n + 3) & ~3;
}

function pad4Offset(n: number): number {
	return (n + 3) & ~3;
}
