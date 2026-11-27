export type AionRegion = "eu" | "nae" | "naw" | "la" | "as";

export type CharacterStats = {
	name: string;
	region: AionRegion;
	serverName: string;
	className: string;
	level: number;
	combatPower: number;
	gearScore: number;
};

type SearchResult = {
	characterId?: string;
	name?: string;
	serverId?: number | string;
	serverName?: string;
	region?: string;
};

type SearchResponse = {
	list?: SearchResult[];
};

type CharacterResponse = {
	profile?: {
		characterName?: string;
		serverName?: string;
		className?: string;
		characterLevel?: number;
		combatPower?: number;
		serverId?: number | string;
	};
	stat?: {
		statList?: Array<{
			type?: string;
			name?: string;
			value?: number | string;
		}>;
	};
};

const USER_AGENT = "AION2StreamDeckStats/0.1.0 (read-only public profile display)";
const CACHE_TTL_MS = 60_000;
const responseCache = new Map<string, { expiresAt: number; value: CharacterStats }>();
const inFlight = new Map<string, Promise<CharacterStats>>();

function stripMarkup(value: string): string {
	return value.replace(/<[^>]*>/g, "").trim();
}

async function getJson<T>(url: URL): Promise<T> {
	let response: Response;
	try {
		response = await fetch(url, {
			headers: {
				Accept: "application/json",
				"User-Agent": USER_AGENT,
			},
			signal: AbortSignal.timeout(15_000),
		});
	} catch (error) {
		if (error instanceof Error && (error.name === "TimeoutError" || error.name === "AbortError")) {
			throw new Error("Zeitüberschreitung beim Laden des AION-2-Profils. Prüfe deine Internetverbindung und versuche es erneut.");
		}
		if (error instanceof TypeError) {
			throw new Error("AION 2 ist gerade nicht erreichbar. Prüfe deine Internetverbindung und lade die Taste erneut.");
		}
		throw new Error("Das AION-2-Profil konnte nicht geladen werden. Bitte später erneut versuchen.");
	}
	if (!response.ok) {
		if (response.status === 404) throw new Error("AION-2-Profil oder Suchdienst nicht gefunden. Prüfe Name, Region und Server; das Profil muss öffentlich sein.");
		if (response.status === 429) throw new Error("AION 2 begrenzt gerade die Anfragen. Warte kurz und lade dann erneut.");
		if (response.status === 503 || response.status >= 500) throw new Error(`Der AION-2-Dienst ist vorübergehend nicht verfügbar (HTTP ${response.status}). Bitte später erneut versuchen.`);
		throw new Error(`AION 2 hat die Anfrage abgelehnt (HTTP ${response.status}). Prüfe Region und Einstellungen.`);
	}
	try {
		return (await response.json()) as T;
	} catch {
		throw new Error("AION 2 hat eine ungültige Antwort gesendet. Bitte später erneut versuchen.");
	}
}

function normalizeRegion(region: string): AionRegion {
	const valid: AionRegion[] = ["eu", "nae", "naw", "la", "as"];
	return valid.includes(region as AionRegion) ? (region as AionRegion) : "eu";
}

async function lookupUncached(characterName: string, server: string, region: AionRegion): Promise<CharacterStats> {
	const searchUrl = new URL("https://api-search.plaync.com/aion2global/search/v2/character");
	searchUrl.search = new URLSearchParams({ keyword: characterName, region, localeInfo: "en-US" }).toString();
	const search = await getJson<SearchResponse>(searchUrl);
	const nameMatches = (search.list ?? []).filter((result) => result.name && stripMarkup(result.name).toLocaleLowerCase() === characterName.toLocaleLowerCase());
	const exactMatches = nameMatches.filter((result) => {
		if (!result.characterId || !result.serverId || !result.serverName) return false;
		return !server || result.serverName.toLocaleLowerCase() === server.toLocaleLowerCase();
	});

	if (exactMatches.length === 0) {
		const availableServers = [...new Set(nameMatches.map((match) => match.serverName).filter((name): name is string => Boolean(name)))];
		if (server && availableServers.length > 0) {
			throw new Error(`„${characterName}“ wurde gefunden, aber nicht auf Server „${server}“. Verfügbare Server: ${availableServers.join(", ")}.`);
		}
		throw new Error(server
			? `Charakter „${characterName}“ wurde auf ${server} (${region.toUpperCase()}) nicht gefunden. Prüfe Schreibweise und Server; das Profil muss öffentlich sein.`
			: `Charakter „${characterName}“ wurde in ${region.toUpperCase()} nicht gefunden. Prüfe Schreibweise und ob das Profil öffentlich ist.`);
	}
	if (exactMatches.length > 1) {
		const servers = [...new Set(exactMatches.map((match) => match.serverName))].join(", ");
		throw new Error(`Der Name „${characterName}“ ist mehrfach vorhanden. Trage den Server ein: ${servers}.`);
	}

	const match = exactMatches[0];
	const characterId = decodeURIComponent(match.characterId!);
	const infoUrl = new URL("https://aion2.plaync.com/api/character/info");
	infoUrl.search = new URLSearchParams({
		region,
		lang: "en-US",
		characterId,
		serverId: String(match.serverId),
	}).toString();
	const character = await getJson<CharacterResponse>(infoUrl);
	const profile = character.profile;
	if (!profile || typeof profile.combatPower !== "number") {
		throw new Error("Das öffentliche Charakterprofil enthält keine Combat Power.");
	}
	const itemLevel = character.stat?.statList?.find((stat) => stat.type === "ItemLevel" || stat.name?.toLowerCase().includes("item level"))?.value;
	const gearScore = Number(itemLevel);
	if (!Number.isFinite(gearScore)) throw new Error("Der Gearscore ist im Charakterprofil nicht verfügbar.");

	return {
		name: profile.characterName || stripMarkup(match.name!),
		region,
		serverName: profile.serverName || match.serverName!,
		className: profile.className || "AION 2",
		level: Number(profile.characterLevel) || 0,
		combatPower: profile.combatPower,
		gearScore,
	};
}

export async function lookupCharacter(characterName: string, server: string, rawRegion: string): Promise<CharacterStats> {
	const cleanName = characterName.trim();
	const cleanServer = server.trim();
	const region = normalizeRegion(rawRegion);
	if (!cleanName) throw new Error("Trage zuerst einen Charakternamen in den Aktionseinstellungen ein.");

	const key = `${region}:${cleanServer.toLocaleLowerCase()}:${cleanName.toLocaleLowerCase()}`;
	const cached = responseCache.get(key);
	if (cached && cached.expiresAt > Date.now()) return cached.value;

	const existing = inFlight.get(key);
	if (existing) return existing;

	const pending = lookupUncached(cleanName, cleanServer, region)
		.then((value) => {
			responseCache.set(key, { expiresAt: Date.now() + CACHE_TTL_MS, value });
			return value;
		})
		.finally(() => inFlight.delete(key));
	inFlight.set(key, pending);
	return pending;
}
