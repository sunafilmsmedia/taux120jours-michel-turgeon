import type { RenewalInput, RenewalResult } from "@/types/renewal";
import { analyserRenouvellement } from "./decision";
import { generateAnalysis } from "./ai";
import { getCurrentRates } from "./rates";

export interface EngineOutput {
  result: RenewalResult;
  aiGenerated: boolean;
}

/**
 * Pipeline complet : taux du marché -> décision -> texte IA.
 * Utilisé côté serveur dans /api/submit-lead.
 */
export async function processLead(input: RenewalInput): Promise<EngineOutput> {
  // Les taux du marché sont mis en cache côté serveur (voir lib/rates.ts) :
  // cet appel ne déclenche une recherche web que quelques fois par jour.
  const rates = await getCurrentRates();

  const decision = analyserRenouvellement(input, rates);
  const ai = await generateAnalysis(input, decision);

  return {
    result: { decision, rates, aiResponse: ai.text },
    aiGenerated: ai.generated,
  };
}
