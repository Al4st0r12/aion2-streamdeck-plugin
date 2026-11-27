import { mkdir, writeFile } from "node:fs/promises";
import { fileURLToPath } from "node:url";
import path from "node:path";

const projectDirectory = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const outputPath = path.join(projectDirectory, "com.codex.aion2stats.sdPlugin", "imgs", "aion2", "shugo-alert.wav");
const sampleRate = 22_050;
const samplesPerNote = Math.floor(sampleRate * 0.16);
const gapSamples = Math.floor(sampleRate * 0.035);
const notes = [784, 988];
const sampleCount = samplesPerNote * notes.length + gapSamples;
const pcm = Buffer.alloc(sampleCount * 2);

let sampleOffset = 0;
for (const frequency of notes) {
	for (let index = 0; index < samplesPerNote; index += 1) {
		const edge = Math.min(1, index / 330, (samplesPerNote - index - 1) / 660);
		const envelope = Math.max(0, edge);
		const sample = Math.sin((2 * Math.PI * frequency * index) / sampleRate) * envelope * 0.13;
		pcm.writeInt16LE(Math.round(sample * 32_767), sampleOffset * 2);
		sampleOffset += 1;
	}
	if (frequency !== notes.at(-1)) sampleOffset += gapSamples;
}

const header = Buffer.alloc(44);
header.write("RIFF", 0);
header.writeUInt32LE(36 + pcm.length, 4);
header.write("WAVE", 8);
header.write("fmt ", 12);
header.writeUInt32LE(16, 16);
header.writeUInt16LE(1, 20);
header.writeUInt16LE(1, 22);
header.writeUInt32LE(sampleRate, 24);
header.writeUInt32LE(sampleRate * 2, 28);
header.writeUInt16LE(2, 32);
header.writeUInt16LE(16, 34);
header.write("data", 36);
header.writeUInt32LE(pcm.length, 40);

await mkdir(path.dirname(outputPath), { recursive: true });
await writeFile(outputPath, Buffer.concat([header, pcm]));
console.log(`Shugo-Signalton erstellt: ${outputPath}`);
