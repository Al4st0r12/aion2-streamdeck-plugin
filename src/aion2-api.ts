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
	const response = await fetch(url, {
		headers: {
			Accept: "application/json",
			"User-Agent": USER_AGENT,
		},
		signal: AbortSignal.timeout(15_000),
	});
	if (!response.ok) {
		if (response.status === 404) throw new Error("Charakterprofil nicht gefunden oder noch nicht öffentlich.");
		if (response.status === 429 || response.status === 503) throw new Error("AION 2 begrenzt gerade Anfragen. Bitte später erneut versuchen.");
		throw new Error(`AION-2-API antwortet mit HTTP ${response.status}.`);
	}
	return (await response.json()) as T;
}

function normalizeRegion(region: string): AionRegion {
	const valid: AionRegion[] = ["eu", "nae", "naw", "la", "as"];
	return valid.includes(region as AionRegion) ? (region as AionRegion) : "eu";
}

async function lookupUncached(characterName: string, server: string, region: AionRegion): Promise<CharacterStats> {
	const searchUrl = new URL("https://api-search.plaync.com/aion2global/search/v2/character");
	searchUrl.search = new URLSearchParams({ keyword: characterName, region, localeInfo: "en-US" }).toString();
	const search = await getJson<SearchResponse>(searchUrl);
	const exactMatches = (search.list ?? []).filter((result) => {
		if (!result.name || !result.characterId || !result.serverId || !result.serverName) return false;
		const sameName = stripMarkup(result.name).toLocaleLowerCase() === characterName.toLocaleLowerCase();
		const sameServer = !server || result.serverName.toLocaleLowerCase() === server.toLocaleLowerCase();
		return sameName && sameServer;
	});

	if (exactMatches.length === 0) {
		throw new Error(server
			? `„${characterName}“ wurde auf ${server} (${region.toUpperCase()}) nicht gefunden.`
			: `„${characterName}“ wurde in ${region.toUpperCase()} nicht gefunden.`);
	}
	if (exactMatches.length > 1) {
		const servers = [...new Set(exactMatches.map((match) => match.serverName))].join(", ");
		throw new Error(`Name mehrfach gefunden. Bitte den Server eintragen (${servers}).`);
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
