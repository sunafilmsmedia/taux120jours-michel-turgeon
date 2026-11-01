import Anthropic from "@anthropic-ai/sdk";
import type { MarketRates } from "@/types/renewal";

/**
 * Taux hypothécaires canadiens actuels, via une recherche web faite par Claude
 * (outil serveur `web_search`, voir https://docs.claude.com — tool use).
 *
 * Le moteur de décision (lib/decision.ts) a besoin de 4 termes fixes distincts
 * (1, 2, 3 et 5 ans — voir la logique de l'IRD) plutôt que des 2 termes de
 * taux-elie : c'est la différence principale avec ce fichier-là.
 *
 * Mis en cache en mémoire pendant CACHE_TTL_MS : on ne veut PAS appeler l'API
 * à chaque visiteur (coût, latence, et un taux ne change pas plusieurs fois
 * par jour). Si la recherche échoue, on retombe sur le dernier résultat connu
 * (même périmé) plutôt que d'inventer un chiffre — et si on n'a jamais rien
 * obtenu, on retourne un snapshot vide (`generated: false`) : l'UI doit alors
 * afficher un texte qualitatif, jamais un chiffre halluciné.
 */

const CACHE_TTL_MS = 12 * 60 * 60 * 1000; // 12h
const TRUSTED_RATE_SOURCES = ["ratehub.ca", "wowa.ca", "nesto.ca"];

const RATES_SYSTEM_PROMPT = `Tu es un outil de recherche factuelle. Tu dois trouver les meilleurs taux hypothécaires résidentiels affichés PUBLIQUEMENT au Canada en ce moment (fixe 1 an, fixe 2 ans, fixe 3 ans, fixe 5 ans, variable). Utilise uniquement l'outil de recherche web fourni. Réponds UNIQUEMENT avec un objet JSON valide, sans balises markdown, sans texte avant ou après. Si tu ne trouves pas un chiffre fiable pour un champ, mets null — n'invente jamais un taux.`;

const RATES_USER_PROMPT = `Cherche les meilleurs taux hypothécaires résidentiels affichés actuellement sur un comparateur canadien fiable (Ratehub, Wowa ou Nesto) pour : taux fixe 1 an, fixe 2 ans, fixe 3 ans, fixe 5 ans, et variable. Réponds avec UNIQUEMENT ce JSON (aucun autre texte) :
{"fixe1": number|null, "fixe2": number|null, "fixe3": number|null, "fixe5": number|null, "variable": number|null, "sourceName": string|null, "sourceUrl": string|null, "asOfDate": string|null}
Les taux sont des pourcentages annuels (ex: 4.19, pas "4.19%"). "asOfDate" est la date affichée sur la page source, telle quelle (ex: "28 octobre 2026"), ou null si absente.`;

let cached: MarketRates | null = null;

function emptySnapshot(fetchedAt: number): MarketRates {
  return {
    fixe1: null,
    fixe2: null,
    fixe3: null,
    fixe5: null,
    variable: null,
    sourceName: null,
    sourceUrl: null,
    asOfDate: null,
    fetchedAt,
    generated: false,
  };
}

// Garde-fou : un taux hypothécaire canadien plausible se situe grosso modo
// entre 1 % et 12 %. Hors de cette plage, on préfère null à un chiffre
// probablement mal extrait (erreur de parsing, confusion d'unité, etc.).
function toPlausibleRate(value: unknown): number | null {
  const n = typeof value === "number" ? value : Number(value);
  if (!Number.isFinite(n) || n < 1 || n > 12) return null;
  return n;
}

function extractJsonObject(text: string): string {
  const fenced = text.match(/```(?:json)?\s*([\s\S]*?)```/i);
  const candidate = fenced ? fenced[1] : text;
  const start = candidate.indexOf("{");
  const end = candidate.lastIndexOf("}");
  if (start === -1 || end === -1 || end < start) {
    throw new Error("Aucun objet JSON trouvé dans la réponse IA.");
  }
  return candidate.slice(start, end + 1);
}

async function fetchRatesFromWeb(apiKey: string): Promise<MarketRates> {
  const anthropic = new Anthropic({ apiKey });
  const model = process.env.ANTHROPIC_MODEL ?? "claude-opus-5-5";

  const message = await anthropic.messages.create({
    model,
    max_tokens: 1024,
    system: RATES_SYSTEM_PROMPT,
    tools: [
      {
        type: "web_search_20260209",
        name: "web_search",
        max_uses: 4,
        allowed_domains: TRUSTED_RATE_SOURCES,
      },
    ],
    messages: [{ role: "user", content: RATES_USER_PROMPT }],
  });

  const text = message.content
    .filter((b): b is Anthropic.TextBlock => b.type === "text")
    .map((b) => b.text)
    .join("\n")
    .trim();

  const parsed = JSON.parse(extractJsonObject(text)) as Record<string, unknown>;

  return {
    fixe1: toPlausibleRate(parsed.fixe1),
    fixe2: toPlausibleRate(parsed.fixe2),
    fixe3: toPlausibleRate(parsed.fixe3),
    fixe5: toPlausibleRate(parsed.fixe5),
    variable: toPlausibleRate(parsed.variable),
    sourceName: typeof parsed.sourceName === "string" ? parsed.sourceName : null,
    sourceUrl: typeof parsed.sourceUrl === "string" ? parsed.sourceUrl : null,
    asOfDate: typeof parsed.asOfDate === "string" ? parsed.asOfDate : null,
    fetchedAt: Date.now(),
    generated: true,
  };
}

export async function getCurrentRates(): Promise<MarketRates> {
  const now = Date.now();
  if (cached && now - cached.fetchedAt < CACHE_TTL_MS) {
    return cached;
  }

  const apiKey = process.env.ANTHROPIC_API_KEY;
  if (!apiKey) {
    return cached ?? emptySnapshot(now);
  }

  try {
    const fresh = await fetchRatesFromWeb(apiKey);
    cached = fresh;
    return fresh;
  } catch (e) {
    console.error("RATES_FETCH_FAILED", e);
    return cached ?? emptySnapshot(now);
  }
}
