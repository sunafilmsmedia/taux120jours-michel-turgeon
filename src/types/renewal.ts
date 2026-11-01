export type RateKind = "fixe" | "variable";
export type LenderKind = "grande_banque" | "autre" | "ne_sais_pas";

export type Verdict =
  | "BLOQUER_MAINTENANT"
  | "FAIRE_MIEUX_MAINTENANT"
  | "FENETRE_A_VENIR"
  | "A_SURVEILLER"
  | "TAUX_INCONNU";

export interface RenewalInput {
  firstName: string;
  lastName?: string;
  email: string;
  phone: string;

  // 1. Échéance du terme — mois + année (jour fixé au 1er, voir lib/decision.ts).
  maturityMonth: number; // 1-12
  maturityYear: number;

  // 2. Taux actuel — null = "je ne sais pas".
  currentRate: number | null;

  // 3. Fixe ou variable.
  rateType: RateKind;

  // 4. Solde restant approximatif ($).
  balance: number;

  // 5. Prêteur actuel.
  lender: LenderKind;

  // 6. Dettes à consolider ($, 0 = aucune).
  debtsToConsolidate: number;

  consentContact: boolean;
}

export interface MarketRates {
  fixe1: number | null;
  fixe2: number | null;
  fixe3: number | null;
  fixe5: number | null;
  variable: number | null;
  sourceName: string | null;
  sourceUrl: string | null;
  asOfDate: string | null;
  fetchedAt: number;
  generated: boolean;
}

export interface DecisionResult {
  jours: number;
  mois: number;
  verdict: Verdict;
  penalite: number | null;
  economies: number | null;
  gainNet: number | null;
  consolidation: boolean;
  relance: string; // ISO yyyy-mm-dd — date de relance (échéance - fenêtre de blocage)
  tauxMarche: number | null;
  tauxComparaison: number | null;
}

export interface RenewalResult {
  decision: DecisionResult;
  rates: MarketRates;
  aiResponse: string;
}

export interface SubmitLeadResponse {
  success: boolean;
  result: RenewalResult;
}
