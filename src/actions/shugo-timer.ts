import { spawn } from "node:child_process";
import streamDeck, {
	action,
	type DidReceiveSettingsEvent,
	type KeyAction as StreamDeckKeyAction,
	type WillAppearEvent,
	type WillDisappearEvent,
	SingletonAction,
} from "@elgato/streamdeck";
import { readFileSync } from "node:fs";
import { join } from "node:path";

type ShugoSettings = { region?: string; alertMinutes?: number; soundEnabled?: boolean };
type ShugoKey = StreamDeckKeyAction<ShugoSettings>;
type ShugoInstance = { action: ShugoKey; settings: ShugoSettings; interval?: NodeJS.Timeout; lastSoundKey?: string };

const alertOptions = [0, 1, 3, 5, 10];
const hourMilliseconds = 3_600_000;

const timeZones: Record<string, { name: string; zone: string }> = {
	eu: { name: "EUROPA", zone: "Europe/Berlin" },
	nae: { name: "NA OST", zone: "America/New_York" },
	naw: { name: "NA WEST", zone: "America/Los_Angeles" },
	la: { name: "SÜDAMERIKA", zone: "America/Sao_Paulo" },
	as: { name: "ASIEN", zone: "Asia/Seoul" },
};

const instances = new Map<string, ShugoInstance>();
const playedWarnings = new Set<string>();
const shugoIcon = `data:image/png;base64,${readFileSync(join(__dirname, "..", "imgs", "aion2", "shugo_festa_icon.png")).toString("base64")}`;
const shugoTonePath = join(__dirname, "..", "imgs", "aion2", "shugo-alert.wav");

function playSignalTone(): void {
	try {
		if (process.platform === "win32") {
			const soundPath = shugoTonePath.replace(/'/g, "''");
			const command = `$player = New-Object System.Media.SoundPlayer '${soundPath}'; $player.PlaySync()`;
			const player = spawn("powershell.exe", ["-NoLogo", "-NoProfile", "-NonInteractive", "-WindowStyle", "Hidden", "-Command", command], {
				windowsHide: true,
				stdio: "ignore",
			});
			player.once("error", (error) => streamDeck.logger.warn(`Shugo-Signalton konnte nicht abgespielt werden: ${error.message}`));
			player.once("close", (code) => {
				if (code !== 0) streamDeck.logger.warn(`Shugo-Signalton-Prozess wurde mit Code ${code} beendet.`);
			});
		} else if (process.platform === "darwin") {
			const player = spawn("/usr/bin/afplay", [shugoTonePath], { stdio: "ignore" });
			player.once("error", (error) => streamDeck.logger.warn(`Shugo-Signalton konnte nicht abgespielt werden: ${error.message}`));
			player.once("close", (code) => {
				if (code !== 0) streamDeck.logger.warn(`Shugo-Signalton-Prozess wurde mit Code ${code} beendet.`);
			});
		}
	} catch (error) {
		streamDeck.logger.warn(`Shugo-Signalton konnte nicht abgespielt werden: ${String(error)}`);
	}
}

function escapeXml(value: string): string {
	return value.replace(/[<>&"']/g, (character) => ({
		"<": "&lt;",
		">": "&gt;",
		"&": "&amp;",
		"\"": "&quot;",
		"'": "&apos;",
	}[character]!));
}

function localTime(date: Date, timeZone: string): string {
	return new Intl.DateTimeFormat("de-DE", {
		timeZone,
		hour: "2-digit",
		minute: "2-digit",
		hourCycle: "h23",
	}).format(date);
}

function timerSvg(regionName: string, now: Date, timeZone: string, alertMinutes: number, soundEnabled: boolean): string {
	const millisecondsPastHour = now.getTime() % 3_600_000;
	const activeSeconds = 180 - Math.floor(millisecondsPastHour / 1000);
	const active = activeSeconds > 0;
	const secondsToEvent = Math.ceil((3_600_000 - millisecondsPastHour) / 1000);
	const countdown = active ? activeSeconds : secondsToEvent;
	const minutes = Math.floor(countdown / 60).toString().padStart(2, "0");
	const seconds = (countdown % 60).toString().padStart(2, "0");
	const criticalWarning = !active && secondsToEvent <= 30 && secondsToEvent > 0;
	const earlyWarning = !active && alertMinutes > 0 && secondsToEvent <= alertMinutes * 60;
	const pulseOn = !criticalWarning || Math.floor(now.getTime() / 500) % 2 === 0;
	const accent = active
		? "#e6c67a"
		: criticalWarning
			? pulseOn ? "#ff705f" : "#f2c96c"
			: earlyWarning ? "#f0bd66" : "#78f2fb";
	const status = active
		? "ANMELDUNG OFFEN"
		: criticalWarning
			? pulseOn ? "GLEICH START" : "START IN KÜRZE"
			: earlyWarning ? "BALD START" : "BIS ZUM START";
	const footer = active
		? `${regionName} · NOCH ${minutes}:${seconds}`
		: `${regionName} · UM ${localTime(new Date(now.getTime() + secondsToEvent * 1000), timeZone)}`;
	const logoOpacity = criticalWarning && !pulseOn ? 0.12 : 1;
	return `<svg xmlns="http://www.w3.org/2000/svg" width="144" height="144" viewBox="0 0 144 144">
<defs>
  <linearGradient id="bg" x1="0" y1="0" x2="1" y2="1"><stop stop-color="#172a3c"/><stop offset=".55" stop-color="#081522"/><stop offset="1" stop-color="#111018"/></linearGradient>
  <linearGradient id="edge" x1="0" y1="0" x2="1" y2="1"><stop stop-color="${accent}"/><stop offset="1" stop-color="#bda66f" stop-opacity=".8"/></linearGradient>
  <filter id="glow" x="-50%" y="-50%" width="200%" height="200%"><feGaussianBlur stdDeviation="3" result="blur"/><feMerge><feMergeNode in="blur"/><feMergeNode in="SourceGraphic"/></feMerge></filter>
</defs>
<rect width="144" height="144" rx="17" fill="url(#bg)"/><rect x="3" y="3" width="138" height="138" rx="14" fill="none" stroke="url(#edge)" stroke-width="2"/>
<path d="M12 26h120" stroke="#405a70" stroke-opacity=".7" stroke-width="1"/>
<text x="72" y="19" fill="${accent}" font-family="Arial,sans-serif" font-size="8" font-weight="700" letter-spacing="1.25" text-anchor="middle">AION 2 · SHUGO</text>
<text x="130" y="19" fill="${soundEnabled ? accent : "#405a70"}" font-family="Arial,sans-serif" font-size="10" font-weight="700" text-anchor="middle">♪</text>
<text x="72" y="59" fill="${earlyWarning ? accent : "#fff7e8"}" font-family="Arial,sans-serif" font-size="32" font-weight="700" letter-spacing="-.6" text-anchor="middle"${earlyWarning ? ' filter="url(#glow)"' : ""}>${minutes}:${seconds}</text>
<text x="72" y="76" fill="${accent}" font-family="Arial,sans-serif" font-size="8" font-weight="700" letter-spacing=".8" text-anchor="middle">${status}</text>
<circle cx="72" cy="103" r="26" fill="#030912" stroke="${accent}" stroke-opacity=".72" stroke-width="1.5"/>
<image x="47" y="78" width="50" height="50" href="${shugoIcon}" preserveAspectRatio="xMidYMid meet" opacity="${logoOpacity}"${criticalWarning && pulseOn ? ' filter="url(#glow)"' : ""}/>
<text x="72" y="137" fill="#a8bac4" font-family="Arial,sans-serif" font-size="7.5" font-weight="700" letter-spacing=".5" text-anchor="middle">${escapeXml(footer)}</text>
</svg>`;
}

function update(instance: ShugoInstance): void {
	const { action, settings } = instance;
	const region = timeZones[settings.region ?? "eu"] ? settings.region ?? "eu" : "eu";
	const selected = timeZones[region]!;
	const requestedAlert = Number(settings.alertMinutes ?? 5);
	const alertMinutes = alertOptions.includes(requestedAlert) ? requestedAlert : 5;
	const soundEnabled = settings.soundEnabled !== false;
	const now = new Date();
	const millisecondsPastHour = now.getTime() % hourMilliseconds;
	const active = 180 - Math.floor(millisecondsPastHour / 1000) > 0;
	const secondsToEvent = Math.ceil((hourMilliseconds - millisecondsPastHour) / 1000);
	const nextEvent = Math.floor(now.getTime() / hourMilliseconds) + 1;
	const warningKey = `${nextEvent}:${alertMinutes}`;
	for (const playedKey of playedWarnings) {
		if (Number(playedKey.split(":")[0]) < nextEvent - 2) playedWarnings.delete(playedKey);
	}
	if (soundEnabled && alertMinutes > 0 && !active && secondsToEvent > 0 && secondsToEvent <= alertMinutes * 60 && instance.lastSoundKey !== warningKey) {
		instance.lastSoundKey = warningKey;
		if (!playedWarnings.has(warningKey)) {
			playedWarnings.add(warningKey);
			playSignalTone();
		}
	}
	void action.setImage(`data:image/svg+xml,${encodeURIComponent(timerSvg(selected.name, now, selected.zone, alertMinutes, soundEnabled))}`);
}

@action({ UUID: "com.codex.aion2stats.shugo" })
export class ShugoTimerAction extends SingletonAction<ShugoSettings> {
	override onWillAppear(ev: WillAppearEvent<ShugoSettings>): void {
		const action = ev.action as ShugoKey;
		const settings = ev.payload.settings ?? {};
		const existing = instances.get(action.id);
		if (existing?.interval) clearInterval(existing.interval);
		const instance: ShugoInstance = { action, settings };
		instances.set(action.id, instance);
		update(instance);
		const interval = setInterval(() => {
			const current = instances.get(action.id);
			if (current) update(current);
		}, 500);
		instance.interval = interval;
	}

	override onWillDisappear(ev: WillDisappearEvent<ShugoSettings>): void {
		const instance = instances.get(ev.action.id);
		if (instance?.interval) clearInterval(instance.interval);
		instances.delete(ev.action.id);
	}

	override onDidReceiveSettings(ev: DidReceiveSettingsEvent<ShugoSettings>): void {
		const action = ev.action as ShugoKey;
		const settings = ev.payload.settings ?? {};
		let instance = instances.get(action.id);
		if (!instance) {
			instance = { action, settings };
			instances.set(action.id, instance);
		} else {
			instance.settings = settings;
		}
		update(instance);
	}
}
