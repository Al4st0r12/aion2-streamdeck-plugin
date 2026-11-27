import { mkdir, writeFile } from "node:fs/promises";
import { deflateSync } from "node:zlib";

const outputDirectory = new URL("../com.codex.aion2stats.sdPlugin/imgs/", import.meta.url);
await mkdir(outputDirectory, { recursive: true });

function crc32(buffer) {
	let crc = 0xffffffff;
	for (const byte of buffer) {
		crc ^= byte;
		for (let bit = 0; bit < 8; bit++) crc = (crc >>> 1) ^ (0xedb88320 & -(crc & 1));
	}
	return (crc ^ 0xffffffff) >>> 0;
}

function chunk(type, data) {
	const name = Buffer.from(type, "ascii");
	const length = Buffer.alloc(4);
	length.writeUInt32BE(data.length);
	const checksum = Buffer.alloc(4);
	checksum.writeUInt32BE(crc32(Buffer.concat([name, data])));
	return Buffer.concat([length, name, data, checksum]);
}

function png(width, height, draw) {
	const pixels = new Uint8Array(width * height * 4);
	const setPixel = (x, y, color) => {
		if (x < 0 || y < 0 || x >= width || y >= height) return;
		const offset = (y * width + x) * 4;
		pixels[offset] = color[0];
		pixels[offset + 1] = color[1];
		pixels[offset + 2] = color[2];
		pixels[offset + 3] = color[3] ?? 255;
	};
	const roundedRect = (x, y, w, h, r, color) => {
		for (let py = y; py < y + h; py++) for (let px = x; px < x + w; px++) {
			const cx = px < x + r ? x + r : px >= x + w - r ? x + w - r - 1 : px;
			const cy = py < y + r ? y + r : py >= y + h - r ? y + h - r - 1 : py;
			if ((px - cx) ** 2 + (py - cy) ** 2 <= r ** 2) setPixel(px, py, color);
		}
	};
	const star = (cx, cy, outer, inner, color) => {
		const points = [];
		for (let i = 0; i < 10; i++) {
			const angle = -Math.PI / 2 + i * Math.PI / 5;
			const radius = i % 2 === 0 ? outer : inner;
			points.push([cx + Math.cos(angle) * radius, cy + Math.sin(angle) * radius]);
		}
		const minX = Math.floor(cx - outer), maxX = Math.ceil(cx + outer);
		const minY = Math.floor(cy - outer), maxY = Math.ceil(cy + outer);
		for (let y = minY; y <= maxY; y++) for (let x = minX; x <= maxX; x++) {
			let inside = false;
			for (let i = 0, j = points.length - 1; i < points.length; j = i++) {
				const [xi, yi] = points[i], [xj, yj] = points[j];
				if ((yi > y) !== (yj > y) && x < ((xj - xi) * (y - yi)) / ((yj - yi) || 1) + xi) inside = !inside;
			}
			if (inside) setPixel(x, y, color);
		}
	};
	const circle = (cx, cy, radius, color) => {
		for (let y = Math.floor(cy - radius); y <= cy + radius; y++) for (let x = Math.floor(cx - radius); x <= cx + radius; x++) {
			if ((x - cx) ** 2 + (y - cy) ** 2 <= radius ** 2) setPixel(x, y, color);
		}
	};
	draw({ roundedRect, star, circle });

	const rows = Buffer.alloc((width * 4 + 1) * height);
	for (let y = 0; y < height; y++) {
		const rowOffset = y * (width * 4 + 1);
		rows[rowOffset] = 0;
		Buffer.from(pixels.buffer, pixels.byteOffset + y * width * 4, width * 4).copy(rows, rowOffset + 1);
	}
	const header = Buffer.alloc(13);
	header.writeUInt32BE(width, 0);
	header.writeUInt32BE(height, 4);
	header[8] = 8;
	header[9] = 6;
	return Buffer.concat([
		Buffer.from([137, 80, 78, 71, 13, 10, 26, 10]),
		chunk("IHDR", header),
		chunk("IDAT", deflateSync(rows)),
		chunk("IEND", Buffer.alloc(0)),
	]);
}

const navy = [11, 20, 34, 255];
const aqua = [87, 213, 210, 255];
const white = [255, 255, 255, 255];

function makeActionIcon(size) {
	const scale = size / 56;
	return png(size, size, ({ roundedRect, star }) => {
		roundedRect(3 * scale, 3 * scale, 50 * scale, 50 * scale, 12 * scale, navy);
		roundedRect(5 * scale, 5 * scale, 46 * scale, 46 * scale, 10 * scale, aqua);
		roundedRect(8 * scale, 8 * scale, 40 * scale, 40 * scale, 8 * scale, navy);
		star(28 * scale, 27 * scale, 17 * scale, 8 * scale, aqua);
	});
}

const categoryIcon = png(28, 28, ({ star }) => star(14, 14, 13, 6, white));
const categoryIcon2x = png(56, 56, ({ star }) => star(28, 28, 26, 12, white));
function makeKeyIcon(size) {
	const scale = size / 144;
	return png(size, size, ({ roundedRect, star }) => {
		roundedRect(0, 0, size, size, 24 * scale, navy);
		roundedRect(4 * scale, 4 * scale, 136 * scale, 136 * scale, 20 * scale, aqua);
		roundedRect(7 * scale, 7 * scale, 130 * scale, 130 * scale, 17 * scale, navy);
		star(72 * scale, 70 * scale, 45 * scale, 21 * scale, aqua);
	});
}

const actionIcon = makeActionIcon(56);
const actionIcon2x = makeActionIcon(112);
const keyIcon = makeKeyIcon(144);
const keyIcon2x = makeKeyIcon(288);

await Promise.all([
	writeFile(new URL("action.png", outputDirectory), actionIcon),
	writeFile(new URL("action@2x.png", outputDirectory), actionIcon2x),
	writeFile(new URL("category.png", outputDirectory), categoryIcon),
	writeFile(new URL("category@2x.png", outputDirectory), categoryIcon2x),
	writeFile(new URL("key.png", outputDirectory), keyIcon),
	writeFile(new URL("key@2x.png", outputDirectory), keyIcon2x),
]);
