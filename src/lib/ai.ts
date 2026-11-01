import Anthropic from "@anthropic-ai/sdk";
import type { DecisionResult, RenewalInput } from "@/types/renewal";
import { VERDICT_LABELS } from "./decision";
import { buildNumbersSummary, buildVerdictContent, formatDateFr } from "./messages";
import { formatCurrency, formatRatePercent } from "./format";

/**
 * Génération de la réponse IA personnalisée (côté serveur uniquement).
 *
 * Si ANTHROPIC_API_KEY est défini, on appelle l'API Anthropic (Claude). Sinon
 * (ou en cas d'échec), on retombe proprement sur un texte construit localement —
 * le formulaire ne casse jamais et l'utilisateur voit toujours un résultat.
 */

const ANTHROPIC_MODEL = process.env.ANTHROPIC_MODEL ?? "claude-opus-5-5";

export const SYSTEM_PROMPT = `Tu es un assistant spécialisé en vulgarisation hypothécaire pour Michel Turgeon, courtier hypothécaire au Canada.
Un moteur de calcul déterministe (pas toi) a déjà décidé, à partir du taux actuel du client, de son solde, du marché et d'une pénalité estimée, si c'est le bon moment pour bloquer un taux, pour briser son terme maintenant, ou pour attendre. Ton rôle est UNIQUEMENT d'expliquer ce verdict et ces chiffres en langage simple — jamais de le remettre en question ni d'en calculer un autre.
Règle la plus importante : tu ne dois JAMAIS prédire si les taux d'intérêt vont monter, baisser ou rester stables dans le futur. Le verdict se base sur le taux ACTUEL du marché au moment du calcul, jamais sur une anticipation.
Tu ne dois jamais présenter la pénalité, les économies ou le gain net comme des montants garantis — ce sont des ESTIMATIONS à confirmer par Michel à partir du relevé exact du prêteur.
Tu dois toujours encourager l'utilisateur à valider ces chiffres avec Michel avant de prendre une décision (briser un terme a des conséquences réelles).
Écris dans un français québécois professionnel, simple et humain. Ne sois pas trop technique.
Maximum 200 mots. Structure ta réponse en 4 sections avec ces titres exacts, chacun sur sa propre ligne :
Résumé simple
Ce que notre analyse indique
Pourquoi cette estimation
Prochaine étape avec Michel`;

export interface AIResult {
  text: string;
  generated: boolean;
}

export async function generateAnalysis(input: RenewalInput, decision: DecisionResult): Promise<AIResult> {
  const apiKey = process.env.ANTHROPIC_API_KEY;

  if (!apiKey) {
    return { text: buildLocalAnalysis(input, decision), generated: false };
  }

  try {
    const anthropic = new Anthropic({ apiKey });
    const message = await anthropic.messages.create({
      model: ANTHROPIC_MODEL,
      max_tokens: 600,
      system: SYSTEM_PROMPT,
      messages: [{ role: "user", content: buildUserPrompt(input, decision) }],
    });

    const text = message.content
      .filter((b): b is Anthropic.TextBlock => b.type === "text")
      .map((b) => b.text)
      .join("\n")
      .trim();
    if (!text) throw new Error("Réponse IA vide");
    return { text, generated: true };
  } catch (e) {
    console.error("AI_GENERATION_FAILED", e);
    return { text: buildLocalAnalysis(input, decision), generated: false };
  }
}

function buildUserPrompt(input: RenewalInput, decision: DecisionResult): string {
  const content = buildVerdictContent(input, decision);
  const numbers = buildNumbersSummary(decision);

  return `Voici le dossier d'un client qui renouvelle son hypothèque :

Prénom : ${input.firstName}
Jours avant l'échéance : ${decision.jours}
Taux actuel : ${input.currentRate === null ? "inconnu" : formatRatePercent(input.currentRate)}
Type de taux actuel : ${input.rateType === "fixe" ? "fixe" : "variable"}
Solde restant : ${formatCurrency(input.balance)}
Prêteur : ${input.lender === "grande_banque" ? "une grande banque" : input.lender === "autre" ? "un autre prêteur" : "inconnu"}
Dettes à consolider mentionnées : ${input.debtsToConsolidate > 0 ? formatCurrency(input.debtsToConsolidate) : "aucune"}

Verdict calculé par notre moteur (${VERDICT_LABELS[decision.verdict]}) — à expliquer, jamais à remettre en question :
${numbers.join("\n") || "(pas de chiffre de pénalité/économies pour ce verdict)"}
Date de relance prévue : ${formatDateFr(decision.relance)}

Message interne déjà rédigé pour ce verdict (base-toi dessus, reformule-le dans tes 4 sections, adressé directement à ${input.firstName}) :
${content.message}

Génère la réponse personnalisée en 4 sections (titres exacts demandés dans tes consignes). N'invente aucun chiffre qui n'est pas listé ci-dessus. Ne prédis jamais l'évolution future des taux.`;
}

function buildLocalAnalysis(input: RenewalInput, decision: DecisionResult): string {
  const content = buildVerdictContent(input, decision);
  const numbers = buildNumbersSummary(decision);

  return [
    "Résumé simple",
    `Bonjour ${input.firstName}, ${content.headline.toLowerCase()}.`,
    "",
    "Ce que notre analyse indique",
    content.message,
    "",
    "Pourquoi cette estimation",
    numbers.length > 0
      ? `Basé sur ton taux actuel, ton solde et le taux du marché au moment du calcul : ${numbers.join(", ")}.`
      : "Ce verdict ne dépend pas d'un calcul de pénalité à ce stade-ci de ton dossier.",
    "",
    "Prochaine étape avec Michel",
    "Ces chiffres sont des estimations basées sur les informations fournies, pas une prédiction de l'évolution des taux. La prochaine étape est de valider le relevé exact avec Michel, qui confirmera la pénalité réelle et les taux disponibles aujourd'hui, sans engagement.",
  ].join("\n");
}
