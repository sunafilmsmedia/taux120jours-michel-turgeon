import { echeanceDate } from "./decision";
import { scoreFromDays, scoreLabel } from "./score";

export interface LivePreview {
  jours: number | null;
  score: number | null;
  label: string;
  hasEnoughInfo: boolean;
}

interface PartialMaturity {
  maturityMonth?: number;
  maturityYear?: number;
}

/**
 * Aperçu en direct pendant le quiz, calculé uniquement à partir de la date
 * d'échéance (seule info disponible avant la fin du formulaire). Le score
 * final (lib/score.ts, computeOpportunityScore) tient compte en plus du taux
 * et du marché une fois le formulaire soumis — cet aperçu est volontairement
 * une approximation, jamais le verdict final.
 */
export function computeLivePreview(answers: PartialMaturity): LivePreview {
  if (!answers.maturityMonth || !answers.maturityYear) {
    return { jours: null, score: null, label: "", hasEnoughInfo: false };
  }

  const d = echeanceDate(answers.maturityMonth, answers.maturityYear);
  const jours = Math.round((d.getTime() - Date.now()) / (1000 * 60 * 60 * 24));
  const score = scoreFromDays(Math.max(0, jours));

  return { jours, score, label: scoreLabel(score), hasEnoughInfo: true };
}
