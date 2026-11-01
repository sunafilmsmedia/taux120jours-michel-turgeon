import type { LenderKind, RateKind } from "@/types/renewal";

export function formatCurrency(value: number | undefined | null): string {
  if (value === undefined || value === null || Number.isNaN(value)) return "—";
  return new Intl.NumberFormat("fr-CA", {
    style: "currency",
    currency: "CAD",
    maximumFractionDigits: 0,
  }).format(value);
}

// Les taux (MarketRates) sont déjà stockés comme pourcentages (ex: 4.19),
// pas comme fractions décimales — pas de multiplication par 100 ici.
export function formatRatePercent(value: number | null | undefined): string {
  if (value === null || value === undefined || Number.isNaN(value)) return "—";
  return `${value.toLocaleString("fr-CA", { minimumFractionDigits: 2, maximumFractionDigits: 2 })} %`;
}

export const MONTH_LABELS = [
  "Janvier",
  "Février",
  "Mars",
  "Avril",
  "Mai",
  "Juin",
  "Juillet",
  "Août",
  "Septembre",
  "Octobre",
  "Novembre",
  "Décembre",
];

export const RATE_TYPE_LABELS: Record<RateKind, string> = {
  fixe: "Taux fixe",
  variable: "Taux variable",
};

export const LENDER_LABELS: Record<LenderKind, string> = {
  grande_banque: "Une grande banque",
  autre: "Un autre prêteur",
  ne_sais_pas: "Je ne sais pas",
};
