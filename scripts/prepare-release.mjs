import { copyFile, mkdir, readFile, unlink } from "node:fs/promises";
import { fileURLToPath } from "node:url";
import path from "node:path";

const projectDirectory = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const manifestPath = path.join(projectDirectory, "com.codex.aion2stats.sdPlugin", "manifest.json");
const manifest = JSON.parse(await readFile(manifestPath, "utf8"));
const releaseDirectory = path.join(projectDirectory, "release");
const packagePath = path.join(releaseDirectory, `${manifest.UUID}.streamDeckPlugin`);
const releasePath = path.join(releaseDirectory, `AION-2-Stats-${manifest.Version}.streamDeckPlugin`);

await mkdir(releaseDirectory, { recursive: true });
await copyFile(packagePath, releasePath);
await unlink(packagePath);
console.log(`Installationsdatei bereit: ${releasePath}`);
