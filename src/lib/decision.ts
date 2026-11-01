import type { DecisionResult, MarketRates, RenewalInput, Verdict } from "@/types/renewal";

/**
 * Moteur de décision renouvellement — traduction fidèle de la logique fournie
 * par Michel (deux leviers : bloquer le taux dès l'ouverture de la fenêtre de
 * 120 jours si le taux actuel est déjà bon, ou comparer pénalité vs économies
 * si le taux actuel est plus haut que le marché).
 *
 * Paramètres "métier" fixes (pas des taux de marché — ceux-là viennent de
 * lib/rates.ts) : à ajuster ici si Michel les confirme différemment un jour.
 */
export const FENETRE_BLOCAGE_JOURS = 120;
export const FRAIS_TRANSFERT = 0; // souvent payés par le nouveau prêteur
export const SEUIL_GAIN_MINIMUM = 1000; // en bas de ça, briser ne vaut pas la peine

const JOURS_PAR_MOIS = 30.44;

function isoDate(d: Date): string {
  return d.toISOString().slice(0, 10);
}

/** 1er jour du mois d'échéance — la précision "mois + année" suffit pour ce calcul. */
export function echeanceDate(maturityMonth: number, maturityYear: number): Date {
  return new Date(Date.UTC(maturityYear, maturityMonth - 1, 1));
}

/**
 * Taux de comparaison pour l'IRD (différentiel de taux), selon les mois
 * restants, avec un rabais de 1% si le prêteur actuel est une grande banque
 * (elles calculent l'IRD avec leur taux affiché, pas le taux rabais consenti
 * à la signature, ce qui gonfle la pénalité estimée).
 */
function tauxComparaisonIRD(
  moisRestants: number,
  rates: MarketRates,
  grandeBanque: boolean
): number | null {
  const base = moisRestants <= 18 ? rates.fixe1 : moisRestants <= 30 ? rates.fixe2 : rates.fixe3;
  if (base === null) return null;
  return base - (grandeBanque ? 1.0 : 0);
}

export function analyserRenouvellement(input: RenewalInput, rates: MarketRates): DecisionResult {
  const echeance = echeanceDate(input.maturityMonth, input.maturityYear);
  const jours = Math.round((echeance.getTime() - Date.now()) / (1000 * 60 * 60 * 24));
  const mois = Math.max(0, jours / JOURS_PAR_MOIS);
  const tauxMarche = mois <= 42 ? rates.fixe3 : rates.fixe5;

  const relanceDate = new Date(echeance);
  relanceDate.setUTCDate(relanceDate.getUTCDate() - FENETRE_BLOCAGE_JOURS);

  const base: Omit<DecisionResult, "verdict" | "penalite" | "economies" | "gainNet" | "tauxComparaison"> = {
    jours,
    mois,
    consolidation: input.debtsToConsolidate > 0,
    relance: isoDate(relanceDate),
    tauxMarche,
  };

  if (input.currentRate == null) {
    return { ...base, verdict: "TAUX_INCONNU", penalite: null, economies: null, gainNet: null, tauxComparaison: null };
  }

  if (jours <= FENETRE_BLOCAGE_JOURS) {
    return { ...base, verdict: "BLOQUER_MAINTENANT", penalite: null, economies: null, gainNet: null, tauxComparaison: null };
  }

  const tauxActuel = input.currentRate;
  const grandeBanque = input.lender === "grande_banque";

  const troisMoisInterets = input.balance * (tauxActuel / 100) * (3 / 12);
  let penalite: number;
  let tauxComparaison: number | null = null;

  if (input.rateType === "variable") {
    penalite = troisMoisInterets;
  } else {
    tauxComparaison = tauxComparaisonIRD(mois, rates, grandeBanque);
    const ird =
      tauxComparaison !== null
        ? (input.balance * Math.max(0, tauxActuel - tauxComparaison) * mois) / 100 / 12
        : troisMoisInterets; // pas de taux de comparaison dispo : on retombe sur 3 mois d'intérêts
    penalite = Math.max(troisMoisInterets, ird);
  }

  let economies: number | null = null;
  let gainNet: number | null = null;

  if (tauxMarche !== null && tauxActuel > tauxMarche) {
    economies = (input.balance * (tauxActuel - tauxMarche) * mois) / 100 / 12;
    gainNet = economies - penalite - FRAIS_TRANSFERT;
    if (gainNet >= SEUIL_GAIN_MINIMUM) {
      return { ...base, verdict: "FAIRE_MIEUX_MAINTENANT", penalite, economies, gainNet, tauxComparaison };
    }
  }

  const verdict: Verdict = jours <= 365 ? "FENETRE_A_VENIR" : "A_SURVEILLER";
  return { ...base, verdict, penalite, economies, gainNet, tauxComparaison };
}

export const VERDICT_LABELS: Record<Verdict, string> = {
  BLOQUER_MAINTENANT: "Bloque ton taux maintenant",
  FAIRE_MIEUX_MAINTENANT: "Tu peux probablement faire mieux maintenant",
  FENETRE_A_VENIR: "Ta fenêtre approche",
  A_SURVEILLER: "À surveiller pour l'instant",
  TAUX_INCONNU: "On doit d'abord retrouver ton taux",
};
