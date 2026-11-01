import type { DecisionResult } from "@/types/renewal";
import { FENETRE_BLOCAGE_JOURS, SEUIL_GAIN_MINIMUM } from "./decision";

/**
 * Score d'opportunité (0-100) — UNIQUEMENT une couche de présentation (jauge
 * visuelle, façon Spectrum de taux-elie). Le verdict et les montants restent
 * calculés par lib/decision.ts (analyserRenouvellement) ; ce score ne fait
 * que traduire ce verdict déjà tranché en position sur une jauge, il ne
 * décide jamais rien lui-même.
 */

export interface ScoreInfo {
  score: number | null; // null = pas assez d'info pour even une estimation (TAUX_INCONNU)
  label: string;
}

function clamp(n: number, min: number, max: number): number {
  return Math.min(max, Math.max(min, n));
}

/** Score basé uniquement sur les jours restants — utilisé pour l'aperçu en
 * direct pendant le quiz (avant de connaître le taux/solde), et comme base
 * pour les verdicts qui ne dépendent pas d'un gain net chiffré. */
export function scoreFromDays(jours: number): number {
  if (jours <= FENETRE_BLOCAGE_JOURS) {
    return clamp(70 + ((FENETRE_BLOCAGE_JOURS - jours) / FENETRE_BLOCAGE_JOURS) * 30, 70, 100);
  }
  if (jours <= 365) {
    return clamp(35 + ((365 - jours) / (365 - FENETRE_BLOCAGE_JOURS)) * 20, 35, 55);
  }
  return clamp(30 - (jours - 365) / 30, 5, 30);
}

export function scoreLabel(score: number): string {
  if (score >= 80) return "Agis maintenant";
  if (score >= 60) return "À considérer sérieusement";
  if (score >= 35) return "À suivre";
  return "Pas urgent";
}

export function computeOpportunityScore(decision: DecisionResult): ScoreInfo {
  if (decision.verdict === "TAUX_INCONNU") {
    return { score: null, label: "À déterminer" };
  }

  if (decision.verdict === "FAIRE_MIEUX_MAINTENANT" && decision.gainNet !== null) {
    // Chaque multiple du seuil de gain net minimum (1000 $) ajoute 5 points,
    // plafonné à 100 — un gain net plus élevé se traduit par un score plus haut.
    const score = clamp(65 + (decision.gainNet / SEUIL_GAIN_MINIMUM) * 5, 65, 100);
    return { score, label: scoreLabel(score) };
  }

  const score = scoreFromDays(decision.jours);
  return { score, label: scoreLabel(score) };
}
