import type { DecisionResult, RenewalInput } from "@/types/renewal";
import { VERDICT_LABELS } from "./decision";
import { LENDER_LABELS, RATE_TYPE_LABELS, formatCurrency, formatRatePercent } from "./format";

/**
 * Payload CRM (format GoHighLevel) construit à partir du lead.
 * C'est l'objet que Michel veut récupérer.
 */
export interface CrmPayload {
  firstName: string;
  lastName?: string;
  email: string;
  phone: string;
  // Segmentation jour/nuit remontée au premier niveau pour être visible
  // directement dans le webhook GHL.
  periode: "jour" | "nuit";
  lead_type: "lead_jour" | "lead_nuit";
  tags: string[];
  customFields: Record<string, string | number>;
}

/**
 * Segmentation jour/nuit selon l'heure du Québec (America/Toronto — gère
 * automatiquement l'heure d'été/hiver). Jour = 8h à 20h, Nuit = 20h à 8h.
 */
export function getLeadPeriod(): { periode: "jour" | "nuit"; lead_type: "lead_jour" | "lead_nuit" } {
  const hourStr = new Intl.DateTimeFormat("en-CA", {
    timeZone: "America/Toronto",
    hour: "2-digit",
    hourCycle: "h23",
  }).format(new Date());
  const hour = Number(hourStr) % 24;
  const isDay = hour >= 8 && hour < 20;
  return isDay
    ? { periode: "jour", lead_type: "lead_jour" }
    : { periode: "nuit", lead_type: "lead_nuit" };
}

export function buildCrmPayload(input: RenewalInput, decision: DecisionResult): CrmPayload {
  const { periode, lead_type } = getLeadPeriod();

  const tags = [
    "Lead - Outil renouvellement",
    `Verdict - ${VERDICT_LABELS[decision.verdict]}`,
    lead_type, // "lead_jour" ou "lead_nuit" — pour router le lead dans GHL
  ];
  if (decision.consolidation) tags.push("Consolidation de dettes");

  return {
    firstName: input.firstName,
    lastName: input.lastName,
    email: input.email,
    phone: input.phone,
    periode,
    lead_type,
    tags,
    customFields: {
      maturityDate: `${input.maturityMonth}/${input.maturityYear}`,
      joursAvantEcheance: decision.jours,
      currentRate: input.currentRate === null ? "Inconnu" : formatRatePercent(input.currentRate),
      rateType: RATE_TYPE_LABELS[input.rateType],
      balance: formatCurrency(input.balance),
      lender: LENDER_LABELS[input.lender],
      debtsToConsolidate: input.debtsToConsolidate > 0 ? formatCurrency(input.debtsToConsolidate) : "Aucune",
      verdict: VERDICT_LABELS[decision.verdict],
      penalite: decision.penalite !== null ? formatCurrency(decision.penalite) : "N/A",
      economies: decision.economies !== null ? formatCurrency(decision.economies) : "N/A",
      gainNet: decision.gainNet !== null ? formatCurrency(decision.gainNet) : "N/A",
      dateRelance: decision.relance,
      periode,
      lead_type,
    },
  };
}

export interface CrmSyncResult {
  ok: boolean;
  error?: string;
}

// Webhook GoHighLevel / LeadConnector — PAS hardcodé ici (même raisonnement
// que taux-elie) : tant que CRM_WEBHOOK_URL n'est pas défini, on logue le
// lead côté serveur au lieu de l'envoyer, pour ne jamais polluer le CRM de
// production pendant le développement/les tests. Voir .env.example pour
// l'URL du webhook déjà utilisé par refinancement-michel-turgeon (même
// courtier, même CRM) — à coller en prod une fois ce projet validé.
const CRM_WEBHOOK_URL = process.env.CRM_WEBHOOK_URL;

/**
 * Envoi du lead au CRM (POST JSON vers le webhook GoHighLevel/LeadConnector).
 * Un échec CRM ne doit jamais bloquer l'utilisateur (le lead est quand même
 * retourné à la personne).
 */
export async function sendToCrm(payload: CrmPayload): Promise<CrmSyncResult> {
  if (!CRM_WEBHOOK_URL) {
    console.log("[CRM_STUB] CRM_WEBHOOK_URL non défini — lead loggué localement :", payload);
    return { ok: true };
  }

  try {
    const res = await fetch(CRM_WEBHOOK_URL, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload),
    });
    if (!res.ok) {
      return { ok: false, error: `CRM_SYNC_FAILED: HTTP ${res.status}` };
    }
    return { ok: true };
  } catch (e) {
    return { ok: false, error: `CRM_SYNC_FAILED: ${(e as Error).message}` };
  }
}
