/**
 * Configuration globale de l'outil de renouvellement.
 *
 * brokerPhone / webhookUrl / pixels repris tels quels du CONFIG déjà en
 * production sur refinancement-michel-turgeon.vercel.app (même courtier,
 * même compte CRM/pub) — confirmés le 2026-11-01.
 */
export const renewalConfig = {
  brokerName: "Michel Turgeon",
  brokerTitle: "Courtier hypothécaire",
  brokerPhone: "418 215 2060",
  brokerPhoneTel: "+14182152060",
  // Pas de lien d'agenda en ligne connu pour Michel (contrairement à Elie) —
  // le CTA principal est "Appeler" / "Texter", voir ui/BrokerCard.tsx.
  calendarLink: "",
};

export type RenewalConfig = typeof renewalConfig;
