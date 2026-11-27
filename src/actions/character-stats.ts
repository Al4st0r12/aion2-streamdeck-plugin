import streamDeck, {
	action,
	type DidReceiveSettingsEvent,
	type KeyAction as StreamDeckKeyAction,
	type KeyDownEvent,
	type WillAppearEvent,
	type WillDisappearEvent,
	SingletonAction,
} from "@elgato/streamdeck";
import { readFileSync } from "node:fs";
import { join } from "node:path";
import { lookupCharacter, type CharacterStats } from "../aion2-api";

type Settings = {
	characterName?: string;
	region?: string;
	server?: string;
	refreshMinutes?: number;
};

type KeyInstance = StreamDeckKeyAction<Settings>;
type KeyInstanceState = {
	action: KeyInstance;
	settings: Settings;
	interval?: NodeJS.Timeout;
	debounce?: NodeJS.Timeout;
	lastStats?: CharacterStats;
	lastUpdatedAt?: Date;
};
// The character currently visible during setup, used only for a new/blank key.
const FIRST_RUN_SETTINGS: Settings = {
	characterName: "Azyndralin",
	region: "eu",
	server: "Tiamat",
	refreshMinutes: 5,
};

const instances = new Map<string, KeyInstanceState>();

function escapeXml(value: string): string {
	return value.replace(/[<>&"']/g, (character) => ({
		"<": "&lt;",
		">": "&gt;",
		"&": "&amp;",
		"\"": "&quot;",
		"'": "&apos;",
	}[character]!));
}

function formatNumber(value: number): string {
	return new Intl.NumberFormat("de-DE").format(value);
}

const iconCache = new Map<string, string>();

function iconData(fileName: string): string {
	const cached = iconCache.get(fileName);
	if (cached) return cached;
	const filePath = join(__dirname, "..", "imgs", "aion2", fileName);
	const data = `data:image/png;base64,${readFileSync(filePath).toString("base64")}`;
	iconCache.set(fileName, data);
	return data;
}

function classInfo(className: string): { icon: string; label: string } {
	const key = className.trim().toLocaleLowerCase().replace(/[\s_-]/g, "");
	const classes: Record<string, { icon: string; label: string }> = {
		assassin: { icon: "class_icon_assassin.png", label: "ASSASSINE" },
		assassine: { icon: "class_icon_assassin.png", label: "ASSASSINE" },
		chanter: { icon: "class_icon_chanter.png", label: "KANTOR" },
		kantor: { icon: "class_icon_chanter.png", label: "KANTOR" },
		cleric: { icon: "class_icon_cleric.png", label: "KLERIKER" },
		kleriker: { icon: "class_icon_cleric.png", label: "KLERIKER" },
		elementalist: { icon: "class_icon_elementalist.png", label: "ELEMENTARMAGIER" },
		spiritmaster: { icon: "class_icon_elementalist.png", label: "ELEMENTARMAGIER" },
		elementarmagier: { icon: "class_icon_elementalist.png", label: "ELEMENTARMAGIER" },
		gladiator: { icon: "class_icon_gladiator.png", label: "GLADIATOR" },
		ranger: { icon: "class_icon_ranger.png", label: "JÄGER" },
		jaeger: { icon: "class_icon_ranger.png", label: "JÄGER" },
		jager: { icon: "class_icon_ranger.png", label: "JÄGER" },
		sorcerer: { icon: "class_icon_sorcerer.png", label: "ZAUBERER" },
		zauberer: { icon: "class_icon_sorcerer.png", label: "ZAUBERER" },
		templar: { icon: "class_icon_templar.png", label: "TEMPLER" },
		templer: { icon: "class_icon_templar.png", label: "TEMPLER" },
	};
	return classes[key] ?? { icon: "", label: className.toLocaleUpperCase() };
}

function updateTime(date?: Date): string {
	if (!date) return "--:--";
	return new Intl.DateTimeFormat("de-DE", { hour: "2-digit", minute: "2-digit" }).format(date);
}

function statChange(current: number, previous?: number): { label: string; color: string } {
	if (previous === undefined) return { label: "NEU", color: "#8194a1" };
	const difference = current - previous;
	if (difference === 0) return { label: "—", color: "#8194a1" };
	return difference > 0
		? { label: `▲ +${formatNumber(difference)}`, color: "#8df0a4" }
		: { label: `▼ -${formatNumber(Math.abs(difference))}`, color: "#ff8888" };
}

function statsSvg(data: CharacterStats, previous?: CharacterStats, lastUpdatedAt?: Date): string {
	const name = escapeXml(data.name.length > 13 ? `${data.name.slice(0, 12)}…` : data.name);
	const cp = formatNumber(data.combatPower);
	const gs = formatNumber(data.gearScore);
	const cpChange = statChange(data.combatPower, previous?.combatPower);
	const gearChange = statChange(data.gearScore, previous?.gearScore);
	const classData = classInfo(data.className);
	const meta = escapeXml(`${classData.label} · LV ${data.level}`);
	const server = escapeXml(data.serverName.toLocaleUpperCase());
	const classIcon = classData.icon ? iconData(classData.icon) : "";
	const classBadge = classIcon
		? `<image x="8" y="8" width="34" height="34" href="${classIcon}" preserveAspectRatio="xMidYMid meet"/>`
		: `<text x="25" y="29" fill="#78f2fb" font-family="Arial,sans-serif" font-size="8" font-weight="700" text-anchor="middle">AION 2</text>`;
	const powerIcon = iconData("profile_power_icon_pc.png");
	const levelIcon = iconData("profile_level_icon_pc.png");
	return `<svg xmlns="http://www.w3.org/2000/svg" width="144" height="144" viewBox="0 0 144 144">
<defs>
  <linearGradient id="bg" x1="0" y1="0" x2="1" y2="1"><stop stop-color="#172a3c"/><stop offset=".48" stop-color="#0a1724"/><stop offset="1" stop-color="#11111a"/></linearGradient>
  <linearGradient id="edge" x1="0" y1="0" x2="1" y2="1"><stop stop-color="#78f2fb"/><stop offset=".52" stop-color="#426b7b"/><stop offset="1" stop-color="#bda66f"/></linearGradient>
  <linearGradient id="power" x1="0" y1="0" x2="0" y2="1"><stop stop-color="#fff"/><stop offset="1" stop-color="#78f2fb"/></linearGradient>
  <linearGradient id="gear" x1="0" y1="0" x2="0" y2="1"><stop stop-color="#fff4d5"/><stop offset="1" stop-color="#d4ad65"/></linearGradient>
</defs>
<rect width="144" height="144" rx="16" fill="url(#bg)"/><rect x="3" y="3" width="138" height="138" rx="14" fill="none" stroke="url(#edge)" stroke-opacity=".8" stroke-width="1.5"/>
<path d="M9 48.5h126M10 96.5h124" stroke="#456075" stroke-opacity=".72" stroke-width="1"/>
<path d="M8 52h128v40H8zM8 100h128v36H8z" fill="#fff" fill-opacity=".025"/>
${classBadge}
<text x="47" y="15" fill="#78f2fb" font-family="Arial,sans-serif" font-size="7" font-weight="700" letter-spacing="1.4">AION 2</text>
<text x="136" y="15" fill="#a8bac4" font-family="Arial,sans-serif" font-size="6.4" font-weight="700" text-anchor="end">AKT ${updateTime(lastUpdatedAt)}</text>
<text x="47" y="30" fill="#fff7e8" font-family="Arial,sans-serif" font-size="12.5" font-weight="700">${name}</text>
<text x="47" y="42" fill="#a8bac4" font-family="Arial,sans-serif" font-size="7.4" font-weight="700" letter-spacing=".35">${meta}</text>
<image x="10" y="55" width="31" height="31" href="${powerIcon}" preserveAspectRatio="xMidYMid meet"/>
<text x="45" y="64" fill="#89a5b5" font-family="Arial,sans-serif" font-size="7.2" font-weight="700" letter-spacing=".7">KAMPFKRAFT</text>
<text x="136" y="64" fill="${cpChange.color}" font-family="Arial,sans-serif" font-size="6.2" font-weight="700" text-anchor="end">${cpChange.label}</text>
<text x="44" y="87" fill="url(#power)" font-family="Arial,sans-serif" font-size="23" font-weight="700" letter-spacing="-.45">${cp}</text>
<image x="10" y="102" width="31" height="31" href="${levelIcon}" preserveAspectRatio="xMidYMid meet"/>
<text x="45" y="111" fill="#b9a779" font-family="Arial,sans-serif" font-size="7.2" font-weight="700" letter-spacing=".7">ITEM-LEVEL</text>
<text x="136" y="111" fill="${gearChange.color}" font-family="Arial,sans-serif" font-size="6.2" font-weight="700" text-anchor="end">${gearChange.label}</text>
<text x="44" y="134" fill="url(#gear)" font-family="Arial,sans-serif" font-size="23" font-weight="700" letter-spacing="-.45">${gs}</text>
<text x="136" y="134" fill="#738a99" font-family="Arial,sans-serif" font-size="6.8" font-weight="700" text-anchor="end">${server}</text>
</svg>`;
}

function placeholderSvg(message: string, hint = "Taste zum erneuten Laden", footer = "AION 2 · ÖFFENTLICHES PROFIL"): string {
	const text = escapeXml(message.slice(0, 24));
	const hintText = escapeXml(hint.slice(0, 32));
	const footerText = escapeXml(footer.slice(0, 32));
	return `<svg xmlns="http://www.w3.org/2000/svg" width="144" height="144" viewBox="0 0 144 144">
<rect width="144" height="144" rx="22" fill="#0b1422"/><rect x="4" y="4" width="136" height="136" rx="19" fill="none" stroke="#57d5d2" stroke-width="2.5"/>
<text x="72" y="42" fill="#57d5d2" font-family="Arial,sans-serif" font-size="14" font-weight="700" text-anchor="middle">AION 2</text>
<text x="72" y="74" fill="#e7edf5" font-family="Arial,sans-serif" font-size="10" font-weight="700" text-anchor="middle">${text}</text>
<text x="72" y="94" fill="#b3c0ca" font-family="Arial,sans-serif" font-size="8" text-anchor="middle">${hintText}</text>
<text x="72" y="126" fill="#8393a8" font-family="Arial,sans-serif" font-size="7" text-anchor="middle">${footerText}</text>
</svg>`;
}

function explainError(error: unknown): { title: string; hint: string } {
	const message = error instanceof Error ? error.message : "Unbekannter Fehler beim Laden.";
	if (/nicht gefunden|gefunden, aber nicht auf Server|mehrfach vorhanden|mehrfach gefunden|öffentlich|Schreibweise/i.test(message)) {
		return { title: "PROFIL NICHT GEFUNDEN", hint: "Name, Region & Server prüfen" };
	}
	if (/begrenzt|HTTP 429|HTTP 503|rate limit/i.test(message)) {
		return { title: "ANFRAGE BEGRENZT", hint: "In Kürze erneut laden" };
	}
	if (/keine verbindung|nicht erreichbar|zeitüberschreitung|timeout|fetch failed|internet/i.test(message)) {
		return { title: "VERBINDUNG FEHLT", hint: "Internet prüfen, Taste drücken" };
	}
	if (/nicht verfügbar|enthält keine|ungültige antwort/i.test(message)) {
		return { title: "PROFIL UNVOLLSTÄNDIG", hint: "Öffentliches Profil prüfen" };
	}
	return { title: "AKTUALISIERUNG FEHLGESCHLAGEN", hint: "Details in den Einstellungen" };
}

function setImage(action: KeyInstance, svg: string): void {
	void action.setImage(`data:image/svg+xml,${encodeURIComponent(svg)}`);
}

function settingsMatch(first: Settings, second: Settings): boolean {
	return first.characterName === second.characterName && first.region === second.region && first.server === second.server;
}

async function refresh(action: KeyInstance, settings: Settings): Promise<void> {
	try {
		const data = await lookupCharacter(settings.characterName ?? "", settings.server ?? "", settings.region ?? "eu");
		const current = instances.get(action.id);
		if (current && !settingsMatch(current.settings, settings)) return;
		const updatedAt = new Date();
		setImage(action, statsSvg(data, current?.lastStats, updatedAt));
		if (current) {
			current.lastStats = data;
			current.lastUpdatedAt = updatedAt;
		}
		await streamDeck.ui.sendToPropertyInspector({ status: `Aktualisiert: ${data.name} · ${data.serverName} · ${updatedAt.toLocaleString("de-DE")}` });
	} catch (error) {
		const current = instances.get(action.id);
		if (current && !settingsMatch(current.settings, settings)) return;
		const message = error instanceof Error ? error.message : "Unbekannter Fehler beim Laden.";
		const display = explainError(error);
		const lastSuccess = current?.lastUpdatedAt ? `Letzter Erfolg ${updateTime(current.lastUpdatedAt)}` : "Noch keine erfolgreichen Daten";
		setImage(action, placeholderSvg(display.title, display.hint, lastSuccess));
		await streamDeck.ui.sendToPropertyInspector({ status: `Fehler: ${message} · ${lastSuccess}` });
		streamDeck.logger.warn(`AION 2 profile lookup failed: ${message}`);
	}
}

function updateInterval(context: string): void {
	const instance = instances.get(context);
	if (!instance) return;
	if (instance.interval) clearInterval(instance.interval);
	if (!instance.settings.characterName?.trim()) {
		instance.interval = undefined;
		return;
	}
	const interval = Math.max(1, Number(instance.settings.refreshMinutes) || 5) * 60_000;
	instance.interval = setInterval(() => {
		void refresh(instance.action, instance.settings);
	}, interval);
}

@action({ UUID: "com.codex.aion2stats.character" })
export class CharacterStatsAction extends SingletonAction<Settings> {
	override onWillAppear(ev: WillAppearEvent<Settings>): void {
		const action = ev.action as KeyInstance;
		let settings = ev.payload.settings ?? {};
		if (!settings.characterName?.trim()) {
			settings = {
				...FIRST_RUN_SETTINGS,
				...settings,
				characterName: FIRST_RUN_SETTINGS.characterName,
				server: settings.server?.trim() ? settings.server : FIRST_RUN_SETTINGS.server,
				region: settings.region || FIRST_RUN_SETTINGS.region,
			};
			void action.setSettings(settings);
		}
		setImage(action, settings.characterName?.trim() ? placeholderSvg("Lade Charakter …") : placeholderSvg("Name einstellen"));
		instances.set(action.id, { action, settings });
		if (settings.characterName?.trim()) void refresh(action, settings);
		updateInterval(action.id);
	}

	override onWillDisappear(ev: WillDisappearEvent<Settings>): void {
		const action = ev.action as KeyInstance;
		const instance = instances.get(action.id);
		if (instance?.interval) clearInterval(instance.interval);
		if (instance?.debounce) clearTimeout(instance.debounce);
		instances.delete(action.id);
	}

	override onDidReceiveSettings(ev: DidReceiveSettingsEvent<Settings>): void {
		const action = ev.action as KeyInstance;
		const settings = ev.payload.settings ?? {};
		let instance = instances.get(action.id);
		if (!instance) {
			instance = { action, settings };
			instances.set(action.id, instance);
		} else {
			if (!settingsMatch(instance.settings, settings)) {
				instance.lastStats = undefined;
				instance.lastUpdatedAt = undefined;
			}
			instance.settings = settings;
		}
		setImage(action, settings.characterName?.trim() ? placeholderSvg("Lade Charakter …") : placeholderSvg("Name einstellen"));
		updateInterval(action.id);
		if (settings.characterName?.trim()) {
			void streamDeck.ui.sendToPropertyInspector({ status: `Einstellungen gespeichert. Suche „${settings.characterName.trim()}“ …` });
		}
		if (instance.debounce) clearTimeout(instance.debounce);
		instance.debounce = setTimeout(() => {
			const latest = instances.get(action.id);
			if (latest?.settings.characterName?.trim()) void refresh(latest.action, latest.settings);
			else void streamDeck.ui.sendToPropertyInspector({ status: "Bitte den Namen im Feld „Charaktername“ eintragen. Das Feld „Titel“ benennt nur die Taste." });
		}, 700);
	}

	override onKeyDown(ev: KeyDownEvent<Settings>): void {
		void refresh(ev.action as KeyInstance, ev.payload.settings ?? {});
	}
}
