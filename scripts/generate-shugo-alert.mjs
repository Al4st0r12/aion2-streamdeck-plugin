import { mkdir, rm, writeFile } from "node:fs/promises";
import { fileURLToPath } from "node:url";
import path from "node:path";

const projectDirectory = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const outputDirectory = path.join(projectDirectory, "AION-2-Stats.sdPlugin", "imgs", "aion2");
const sampleRate = 22_050;
const tones = {
	soft: { notes: [659, 784], noteDuration: 0.19 },
	classic: { notes: [784, 988], noteDuration: 0.16 },
	bright: { notes: [988, 1175], noteDuration: 0.14 },
};

await mkdir(outputDirectory, { recursive: true });
await rm(path.join(outputDirectory, "shugo-alert.wav"), { force: true });

for (const [style, tone] of Object.entries(tones)) {
	const samplesPerNote = Math.floor(sampleRate * tone.noteDuration);
	const gapSamples = Math.floor(sampleRate * 0.035);
	const sampleCount = samplesPerNote * tone.notes.length + gapSamples;
	const pcm = Buffer.alloc(sampleCount * 2);
	let sampleOffset = 0;

	for (const [noteIndex, frequency] of tone.notes.entries()) {
		for (let index = 0; index < samplesPerNote; index += 1) {
			const edge = Math.min(1, index / 330, (samplesPerNote - index - 1) / 660);
			const envelope = Math.max(0, edge);
			const sample = Math.sin((2 * Math.PI * frequency * index) / sampleRate) * envelope * 0.22;
			pcm.writeInt16LE(Math.round(sample * 32_767), sampleOffset * 2);
			sampleOffset += 1;
		}
		if (noteIndex < tone.notes.length - 1) sampleOffset += gapSamples;
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

	const outputPath = path.join(outputDirectory, `shugo-alert-${style}.wav`);
	await writeFile(outputPath, Buffer.concat([header, pcm]));
	console.log(`Shugo-Signalton erstellt: ${outputPath}`);
}
