import type { LenderKind, RateKind } from "@/types/renewal";

export interface ChoiceOption<T = string> {
  label: string;
  sublabel?: string;
  value: T;
  icon?: string;
}

export const RATE_TYPE_OPTIONS: ChoiceOption<RateKind>[] = [
  { label: "Taux fixe", icon: "📌", value: "fixe" },
  { label: "Taux variable", icon: "📈", value: "variable" },
];

export const LENDER_OPTIONS: ChoiceOption<LenderKind>[] = [
  { label: "Une grande banque", sublabel: "RBC, BMO, TD, Banque Nationale…", icon: "🏦", value: "grande_banque" },
  { label: "Un autre prêteur", sublabel: "Coopérative, prêteur alternatif…", icon: "🏢", value: "autre" },
  { label: "Je ne sais pas", icon: "🤷", value: "ne_sais_pas" },
];

const currentYear = new Date().getFullYear();

export const MONTH_OPTIONS = [
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
].map((label, i) => ({ label, value: i + 1 }));

export const YEAR_OPTIONS = Array.from({ length: 8 }, (_, i) => currentYear - 1 + i);
