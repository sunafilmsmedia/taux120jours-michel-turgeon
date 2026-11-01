import type { DecisionResult, RenewalInput, Verdict } from "@/types/renewal";
import { formatCurrency } from "./format";

export interface VerdictContent {
  verdict: Verdict;
  headline: string;
  message: string;
  cta: string;
  tone: "positive" | "urgent" | "neutral" | "info";
}

const LENDER_LABEL: Record<RenewalInput["lender"], string> = {
  grande_banque: "une grande banque",
  autre: "un autre prêteur",
  ne_sais_pas: "ton prêteur",
};

export function buildVerdictContent(input: RenewalInput, decision: DecisionResult): VerdictContent {
  const moisRestants = Math.round(decision.mois);

  switch (decision.verdict) {
    case "TAUX_INCONNU":
      return {
        verdict: decision.verdict,
        headline: "On doit d'abord retrouver ton taux actuel",
        message:
          "Tu ne connais pas ton taux actuel exact, et c'est correct — c'est souvent le cas. Michel peut l'obtenir directement auprès de ton prêteur, puis analyser ton dossier avec le bon chiffre. On enregistre ta date d'échéance dès maintenant pour ne pas manquer ta fenêtre.",
        cta: "Laisser mes coordonnées à Michel",
        tone: "info",
      };

    case "BLOQUER_MAINTENANT":
      return {
        verdict: decision.verdict,
        headline: "Ta fenêtre de renouvellement est ouverte",
        message: `Ton échéance arrive dans ${decision.jours} jours — tu es déjà dans la fenêtre où la plupart des prêteurs permettent de garantir un taux sans pénalité, sans rien briser. L'objectif maintenant, c'est de bloquer le meilleur taux disponible avant l'échéance.`,
        cta: "Bloquer mon taux avec Michel",
        tone: "positive",
      };

    case "FAIRE_MIEUX_MAINTENANT":
      return {
        verdict: decision.verdict,
        headline: "Tu pourrais faire mieux dès maintenant",
        message: `Selon ton taux actuel et le marché, briser ton terme maintenant plutôt que d'attendre l'échéance (encore ~${moisRestants} mois) pourrait valoir la peine, même en payant la pénalité estimée. C'est une estimation à confirmer avec Michel à partir du relevé exact de ${LENDER_LABEL[input.lender]}.`,
        cta: "Faire confirmer mon estimation",
        tone: "positive",
      };

    case "FENETRE_A_VENIR":
      return {
        verdict: decision.verdict,
        headline: "Ta fenêtre approche",
        message: `Ton échéance est encore dans environ ${moisRestants} mois — ni assez proche pour bloquer un taux, ni assez avantageux pour briser maintenant selon notre estimation. Michel va te recontacter autour du ${formatDateFr(decision.relance)}, 120 jours avant ton échéance, pour bloquer le meilleur taux au bon moment.`,
        cta: "Être rappelé(e) au bon moment",
        tone: "neutral",
      };

    case "A_SURVEILLER":
    default:
      return {
        verdict: decision.verdict,
        headline: "Rien à faire pour l'instant",
        message: `Ton échéance est encore loin (environ ${moisRestants} mois). Il n'y a pas d'avantage à bouger maintenant. On garde ton dossier ouvert et Michel te recontacte vers le ${formatDateFr(decision.relance)}, 120 jours avant ton échéance.`,
        cta: "Garder mon dossier ouvert",
        tone: "neutral",
      };
  }
}

export function formatDateFr(iso: string): string {
  const d = new Date(`${iso}T00:00:00Z`);
  return d.toLocaleDateString("fr-CA", { year: "numeric", month: "long", day: "numeric", timeZone: "UTC" });
}

export function buildNumbersSummary(decision: DecisionResult): string[] {
  const lines: string[] = [];
  if (decision.penalite !== null) lines.push(`Pénalité estimée : ${formatCurrency(decision.penalite)}`);
  if (decision.economies !== null) lines.push(`Économies estimées sur le terme restant : ${formatCurrency(decision.economies)}`);
  if (decision.gainNet !== null) lines.push(`Gain net estimé (économies − pénalité) : ${formatCurrency(decision.gainNet)}`);
  return lines;
}
