import { copyFile, cp, mkdir, mkdtemp, readFile, rm, unlink } from "node:fs/promises";
import { fileURLToPath } from "node:url";
import path from "node:path";
import { tmpdir } from "node:os";
import { spawnSync } from "node:child_process";

const projectDirectory = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const sourcePluginDirectory = path.join(projectDirectory, "AION-2-Stats.sdPlugin");
const manifestPath = path.join(sourcePluginDirectory, "manifest.json");
const manifest = JSON.parse(await readFile(manifestPath, "utf8"));
const releaseDirectory = path.join(projectDirectory, "release");
const packagePath = path.join(releaseDirectory, `${manifest.UUID}.streamDeckPlugin`);
const releasePath = path.join(releaseDirectory, `AION-2-Stats-${manifest.Version}.streamDeckPlugin`);
const cliPath = path.join(projectDirectory, "node_modules", "@elgato", "cli", "bin", "streamdeck.mjs");
const stagingDirectory = await mkdtemp(path.join(tmpdir(), "aion2-streamdeck-package-"));
const stagedPluginDirectory = path.join(stagingDirectory, `${manifest.UUID}.sdPlugin`);

if (!stagingDirectory.startsWith(`${path.resolve(tmpdir())}${path.sep}`)) {
	throw new Error(`Unsicherer temporärer Paketpfad: ${stagingDirectory}`);
}

try {
	await cp(sourcePluginDirectory, stagedPluginDirectory, { recursive: true });
	await mkdir(releaseDirectory, { recursive: true });
	const pack = spawnSync(process.execPath, [cliPath, "pack", stagedPluginDirectory, "--output", releaseDirectory, "--no-update-check", "--force"], {
		cwd: projectDirectory,
		stdio: "inherit",
	});
	if (pack.error) throw pack.error;
	if (pack.status !== 0) throw new Error(`Stream Deck packer exited with code ${pack.status ?? "unknown"}.`);
	await copyFile(packagePath, releasePath);
	await unlink(packagePath);
	console.log(`Installationsdatei bereit: ${releasePath}`);
} finally {
	await rm(stagingDirectory, { recursive: true, force: true });
}
