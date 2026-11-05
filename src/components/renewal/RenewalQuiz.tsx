"use client";

import { useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import type { LenderKind, RateKind, RenewalInput } from "@/types/renewal";
import ProgressBar from "@/components/ui/ProgressBar";
import ScoreGauge from "@/components/ui/ScoreGauge";
import LoadingAI from "./LoadingAI";
import { LENDER_OPTIONS, MONTH_OPTIONS, RATE_TYPE_OPTIONS, YEAR_OPTIONS, type ChoiceOption } from "./fields";
import { echeanceDate, FENETRE_BLOCAGE_JOURS } from "@/lib/decision";
import { computeLivePreview } from "@/lib/livePreview";
import { formatCurrency } from "@/lib/format";
import { trackPixel } from "@/lib/pixel";

type StepKey = "maturity" | "currentRate" | "rateType" | "balance" | "lender" | "debts" | "contact";

const STEPS: StepKey[] = ["maturity", "currentRate", "rateType", "balance", "lender", "debts", "contact"];

interface Answers {
  maturityMonth?: number;
  maturityYear?: number;
  currentRate?: number | null; // undefined = pas encore répondu, null = "je ne sais pas"
  rateType?: RateKind;
  balance?: number;
  lender?: LenderKind;
  debtsToConsolidate?: number;
  fullName?: string;
  email?: string;
  phone?: string;
  consentContact?: boolean;
}

export default function RenewalQuiz() {
  const router = useRouter();
  const [answers, setAnswers] = useState<Answers>({});
  const [stepIndex, setStepIndex] = useState(0);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const clampedIndex = Math.min(stepIndex, STEPS.length - 1);
  const currentStep = STEPS[clampedIndex];

  const preview = useMemo(() => computeLivePreview(answers), [answers.maturityMonth, answers.maturityYear]);
  const showMobilePreview = preview.hasEnoughInfo && currentStep !== "contact";

  function update(patch: Partial<Answers>) {
    setAnswers((prev) => ({ ...prev, ...patch }));
    setError(null);
  }

  function goNext() {
    if (clampedIndex < STEPS.length - 1) setStepIndex(clampedIndex + 1);
  }

  function goBack() {
    if (clampedIndex > 0) setStepIndex(clampedIndex - 1);
  }

  const canContinue = useMemo(() => validateStep(currentStep, answers), [currentStep, answers]);

  async function handleSubmit() {
    setSubmitting(true);
    setError(null);

    const payload = buildPayload(answers);
    const startedAt = Date.now();

    try {
      const res = await fetch("/api/submit-lead", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });
      const data = await res.json();

      if (!res.ok || !data.success) {
        setError(data.error ?? "Il manque quelques informations avant de générer ton résultat.");
        setSubmitting(false);
        return;
      }

      trackPixel("Lead");
      const elapsed = Date.now() - startedAt;
      const wait = Math.max(1000 - elapsed, 0);
      sessionStorage.setItem(
        `result:${data.leadId}`,
        JSON.stringify({ result: data.result, input: payload })
      );
      setTimeout(() => router.push(data.resultUrl), wait);
    } catch {
      setError("Une erreur est survenue. Réessaie dans un instant.");
      setSubmitting(false);
    }
  }

  if (submitting) return <LoadingAI />;

  return (
    <div className="mx-auto grid max-w-[1100px] gap-10 lg:grid-cols-[1fr_320px]">
      <div>
        {showMobilePreview && (
          <div className="sticky top-3 z-20 mb-5 lg:hidden">
            <div className="rounded-2xl border border-line bg-white/95 px-4 py-3 text-center shadow-card backdrop-blur">
              <span className="caps-label text-[10px] font-semibold text-primary">Ton score en direct</span>
              <p className="mt-0.5 text-base font-bold text-ink">
                <span className="select-none blur-[6px]">{preview.label}</span>
              </p>
              <p className="mt-0.5 text-[10px] font-medium text-muted">🔒 Débloque les détails à la fin</p>
            </div>
          </div>
        )}

        <ProgressBar current={clampedIndex + 1} total={STEPS.length} />

        <div key={currentStep} className="mt-8 animate-fadeUp">
          <StepContent step={currentStep} answers={answers} update={update} advance={goNext} />
        </div>

        {error && (
          <p className="mt-4 rounded-xl border border-danger/30 bg-danger/5 px-4 py-3 text-sm text-danger">{error}</p>
        )}

        <div className="mt-8 flex items-center gap-3">
          {clampedIndex > 0 && (
            <button
              onClick={goBack}
              className="h-14 rounded-2xl border border-line px-6 text-sm font-semibold text-ink transition hover:bg-tint"
            >
              Retour
            </button>
          )}
          {currentStep === "contact" ? (
            <button
              onClick={handleSubmit}
              disabled={!canContinue}
              className="h-14 flex-1 rounded-2xl bg-primary px-8 text-base font-bold text-white shadow-glow transition enabled:hover:bg-primary-light disabled:cursor-not-allowed disabled:opacity-40"
            >
              Voir mon analyse
            </button>
          ) : NEEDS_EXPLICIT_CONTINUE.has(currentStep) ? (
            <button
              onClick={goNext}
              disabled={!canContinue}
              className="h-14 flex-1 rounded-2xl bg-primary px-8 text-base font-bold text-white shadow-glow transition enabled:hover:bg-primary-light disabled:cursor-not-allowed disabled:opacity-40"
            >
              Continuer
            </button>
          ) : (
            <p className="text-sm text-muted">Touche une réponse pour continuer →</p>
          )}
        </div>
      </div>

      <aside className="hidden flex-col gap-4 lg:flex">
        <div className="rounded-3xl border border-line bg-white p-6 shadow-card">
          <div className="caps-label flex items-center gap-2 text-[11px] font-semibold text-primary">
            <span className="inline-flex h-5 w-5 items-center justify-center rounded-full bg-primary/10">⚡</span>
            Ton score en direct
          </div>
          <div className="mt-4 text-xl font-bold text-ink">
            {preview.hasEnoughInfo ? preview.label : "À découvrir"}
          </div>
          <div className="mt-4">
            <ScoreGauge score={preview.score ?? 0} active={preview.hasEnoughInfo} />
          </div>
          {preview.hasEnoughInfo && preview.jours !== null && (
            <p className="mt-3 text-xs text-muted">Échéance dans {preview.jours} jours.</p>
          )}
        </div>
      </aside>
    </div>
  );
}

const NEEDS_EXPLICIT_CONTINUE = new Set<StepKey>(["maturity", "currentRate", "balance", "debts"]);

/* --------------------------- Validation par étape --------------------------- */

function validateStep(step: StepKey, a: Answers): boolean {
  switch (step) {
    case "maturity": {
      if (!a.maturityMonth || !a.maturityYear) return false;
      const jours = Math.round(
        (echeanceDate(a.maturityMonth, a.maturityYear).getTime() - Date.now()) / (1000 * 60 * 60 * 24)
      );
      // On bloque seulement si c'est trop loin dans le futur — une date déjà
      // passée (jours négatif) reste acceptée, Michel verra ça avec la personne.
      return jours <= FENETRE_BLOCAGE_JOURS;
    }
    case "currentRate":
      return a.currentRate === null || (typeof a.currentRate === "number" && a.currentRate > 0 && a.currentRate <= 25);
    case "rateType":
      return !!a.rateType;
    case "balance":
      return typeof a.balance === "number" && a.balance > 0;
    case "lender":
      return !!a.lender;
    case "debts":
      return typeof a.debtsToConsolidate === "number" && a.debtsToConsolidate >= 0;
    case "contact":
      return (
        !!a.fullName?.trim() &&
        !!a.email?.trim() &&
        /.+@.+\..+/.test(a.email ?? "") &&
        !!a.phone?.trim() &&
        a.consentContact === true
      );
    default:
      return false;
  }
}

/* ------------------------------- Payload final ------------------------------ */

function buildPayload(a: Answers): RenewalInput {
  const nameParts = (a.fullName ?? "").trim().split(/\s+/).filter(Boolean);
  const firstName = nameParts[0] ?? "";
  const lastName = nameParts.slice(1).join(" ") || undefined;

  return {
    firstName,
    lastName,
    email: a.email?.trim() ?? "",
    phone: a.phone?.trim() ?? "",
    maturityMonth: a.maturityMonth!,
    maturityYear: a.maturityYear!,
    currentRate: a.currentRate === undefined ? null : a.currentRate,
    rateType: a.rateType!,
    balance: a.balance!,
    lender: a.lender!,
    debtsToConsolidate: a.debtsToConsolidate ?? 0,
    consentContact: a.consentContact === true,
  };
}

/* ------------------------------- Rendu étapes ------------------------------- */

interface StepContentProps {
  step: StepKey;
  answers: Answers;
  update: (patch: Partial<Answers>) => void;
  advance: () => void;
}

function StepContent({ step, answers, update, advance }: StepContentProps) {
  const pick = <K extends keyof Answers>(key: K, value: Answers[K]) => {
    update({ [key]: value } as Partial<Answers>);
    advance();
  };

  switch (step) {
    case "maturity":
      return <MaturityStep answers={answers} update={update} />;
    case "currentRate":
      return <CurrentRateStep answers={answers} update={update} advance={advance} />;
    case "rateType":
      return (
        <SingleChoice
          title="Ton taux actuel est-il fixe ou variable?"
          options={RATE_TYPE_OPTIONS}
          value={answers.rateType}
          onSelect={(v) => pick("rateType", v)}
        />
      );
    case "balance":
      return <BalanceStep answers={answers} update={update} />;
    case "lender":
      return (
        <SingleChoice
          title="Quel est ton prêteur actuel?"
          subtitle="Les grandes banques calculent généralement une pénalité plus élevée sur un taux fixe."
          options={LENDER_OPTIONS}
          value={answers.lender}
          onSelect={(v) => pick("lender", v)}
        />
      );
    case "debts":
      return <DebtsStep answers={answers} update={update} advance={advance} />;
    case "contact":
      return <ContactStep answers={answers} update={update} />;
    default:
      return null;
  }
}

/* ------------------------------ Sous-composants ----------------------------- */

function StepTitle({ title, subtitle }: { title: string; subtitle?: string }) {
  return (
    <div className="mb-6">
      <h2 className="font-serif text-2xl font-bold leading-tight text-ink sm:text-3xl">{title}</h2>
      {subtitle && <p className="mt-2 text-sm text-muted">{subtitle}</p>}
    </div>
  );
}

function SingleChoice<T extends string>({
  title,
  subtitle,
  options,
  value,
  onSelect,
}: {
  title: string;
  subtitle?: string;
  options: ChoiceOption<T>[];
  value?: T;
  onSelect: (v: T) => void;
}) {
  return (
    <div>
      <StepTitle title={title} subtitle={subtitle} />
      <div className="grid gap-3">
        {options.map((opt) => (
          <OptionButton
            key={opt.value}
            label={opt.label}
            sublabel={opt.sublabel}
            icon={opt.icon}
            selected={value === opt.value}
            onClick={() => onSelect(opt.value)}
          />
        ))}
      </div>
    </div>
  );
}

function OptionButton({
  label,
  sublabel,
  icon,
  selected,
  onClick,
}: {
  label: string;
  sublabel?: string;
  icon?: string;
  selected: boolean;
  onClick: () => void;
}) {
  return (
    <button
      onClick={onClick}
      className={`flex items-center gap-3 rounded-2xl border px-5 py-4 text-left text-sm font-semibold transition ${
        selected ? "border-primary bg-primary/5 text-ink shadow-glow" : "border-line bg-white text-ink hover:border-primary/40 hover:bg-tint"
      }`}
    >
      {icon && <span className="text-xl">{icon}</span>}
      <span className="flex-1">
        {label}
        {sublabel && <span className="mt-0.5 block text-xs font-normal text-muted">{sublabel}</span>}
      </span>
      <span
        className={`flex h-5 w-5 shrink-0 items-center justify-center rounded-full border text-[10px] ${
          selected ? "border-primary bg-primary text-white" : "border-line"
        }`}
      >
        {selected ? "✓" : ""}
      </span>
    </button>
  );
}

function MaturityStep({ answers, update }: { answers: Answers; update: (patch: Partial<Answers>) => void }) {
  const jours = useMemo(() => {
    if (!answers.maturityMonth || !answers.maturityYear) return null;
    const d = echeanceDate(answers.maturityMonth, answers.maturityYear);
    return Math.round((d.getTime() - Date.now()) / (1000 * 60 * 60 * 24));
  }, [answers.maturityMonth, answers.maturityYear]);

  return (
    <div>
      <StepTitle title="À quand l'échéance de ton terme actuel?" subtitle="Le mois et l'année suffisent — pas besoin du jour exact." />
      <div className="grid grid-cols-2 gap-3">
        <Select
          label="Mois"
          value={answers.maturityMonth ?? ""}
          onChange={(v) => update({ maturityMonth: Number(v) })}
          options={MONTH_OPTIONS.map((m) => ({ label: m.label, value: m.value }))}
        />
        <Select
          label="Année"
          value={answers.maturityYear ?? ""}
          onChange={(v) => update({ maturityYear: Number(v) })}
          options={YEAR_OPTIONS.map((y) => ({ label: String(y), value: y }))}
        />
      </div>
      {jours !== null && (
        <p
          className={`mt-4 rounded-xl px-4 py-3 text-sm ${
            jours > FENETRE_BLOCAGE_JOURS ? "bg-danger/5 text-danger" : "bg-tint text-ink"
          }`}
        >
          {jours < 0 ? (
            <>Cette date est déjà passée — ton terme est probablement déjà échu ou renouvelé automatiquement, on y verra avec Michel.</>
          ) : jours > FENETRE_BLOCAGE_JOURS ? (
            <>
              Ton échéance arrive dans <strong>{jours} jours</strong> — on ne peut rien faire pour toi dans plus de 120
              jours avant ton échéance, ça ne vaut pas la peine de continuer maintenant. Reviens compléter ce formulaire
              quand il restera 120 jours ou moins — Michel pourra alors bloquer ton taux.
            </>
          ) : (
            <>
              Ton échéance arrive dans <strong>{jours} jours</strong>.
            </>
          )}
        </p>
      )}
    </div>
  );
}

function CurrentRateStep({
  answers,
  update,
  advance,
}: {
  answers: Answers;
  update: (patch: Partial<Answers>) => void;
  advance: () => void;
}) {
  const dontKnow = answers.currentRate === null;

  return (
    <div>
      <StepTitle title="Quel est ton taux d'intérêt actuel?" subtitle="Une valeur approximative suffit si tu ne l'as pas sous les yeux." />
      <div className="relative">
        <input
          type="number"
          inputMode="decimal"
          step="0.01"
          min={0}
          max={25}
          placeholder="Ex. 5.24"
          disabled={dontKnow}
          value={typeof answers.currentRate === "number" ? answers.currentRate : ""}
          onChange={(e) => update({ currentRate: e.target.value === "" ? undefined : Number(e.target.value) })}
          className="h-14 w-full rounded-2xl border border-line bg-white px-4 pr-12 text-lg font-semibold text-ink placeholder:text-muted/60 focus:border-primary focus:outline-none disabled:bg-tint disabled:text-muted"
        />
        <span className="pointer-events-none absolute right-4 top-1/2 -translate-y-1/2 text-muted">%</span>
      </div>
      <button
        onClick={() => {
          update({ currentRate: dontKnow ? undefined : null });
          if (!dontKnow) advance();
        }}
        className={`mt-3 w-full rounded-2xl border px-4 py-3 text-sm font-semibold transition ${
          dontKnow ? "border-primary bg-primary/5 text-ink" : "border-line bg-white text-muted hover:border-primary/40 hover:bg-tint"
        }`}
      >
        🤷 Je ne connais pas mon taux exact
      </button>
    </div>
  );
}

function BalanceStep({ answers, update }: { answers: Answers; update: (patch: Partial<Answers>) => void }) {
  const value = answers.balance ?? 350_000;

  // Le curseur affiche 350 000 $ par défaut avant toute interaction — il faut
  // écrire cette valeur dans l'état dès le montage, sinon "Continuer" reste
  // désactivé tant que l'utilisateur n'a pas touché au curseur.
  useEffect(() => {
    if (answers.balance === undefined) update({ balance: value });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  return (
    <div>
      <StepTitle title="Quel est le solde restant sur ton prêt hypothécaire?" subtitle="Une estimation approximative suffit." />
      <div className="rounded-2xl border border-line bg-white p-6 text-center">
        <div className="font-serif text-3xl font-bold text-ink">{formatCurrency(value)}</div>
        <input
          type="range"
          min={25_000}
          max={1_500_000}
          step={5_000}
          value={value}
          onChange={(e) => update({ balance: Number(e.target.value) })}
          className="mt-5 w-full accent-primary"
        />
        <p className="mt-2 text-xs text-muted">Glisse pour ajuster</p>
      </div>
    </div>
  );
}

function DebtsStep({
  answers,
  update,
  advance,
}: {
  answers: Answers;
  update: (patch: Partial<Answers>) => void;
  advance: () => void;
}) {
  const hasDebts = (answers.debtsToConsolidate ?? 0) > 0;

  return (
    <div>
      <StepTitle
        title="As-tu des dettes que tu aimerais consolider dans ton renouvellement?"
        subtitle="Cartes de crédit, marges de crédit, prêts personnels — 0 $ si aucune."
      />
      <div className="relative">
        <span className="pointer-events-none absolute left-4 top-1/2 -translate-y-1/2 text-muted">$</span>
        <input
          type="number"
          inputMode="decimal"
          min={0}
          step="500"
          placeholder="0"
          value={answers.debtsToConsolidate ?? ""}
          onChange={(e) => update({ debtsToConsolidate: e.target.value === "" ? undefined : Number(e.target.value) })}
          className="h-14 w-full rounded-2xl border border-line bg-white pl-8 pr-4 text-lg font-semibold text-ink placeholder:text-muted/60 focus:border-primary focus:outline-none"
        />
      </div>
      {!hasDebts && (
        <button
          onClick={() => {
            update({ debtsToConsolidate: 0 });
            advance();
          }}
          className="mt-3 w-full rounded-2xl border border-line bg-white px-4 py-3 text-sm font-semibold text-muted transition hover:border-primary/40 hover:bg-tint"
        >
          Aucune dette à consolider
        </button>
      )}
    </div>
  );
}

function ContactStep({ answers, update }: { answers: Answers; update: (patch: Partial<Answers>) => void }) {
  return (
    <div>
      <div className="rounded-2xl border border-primary/20 bg-primary/5 p-4 text-center">
        <span className="caps-label text-[11px] font-semibold text-primary">Dernière étape</span>
        <p className="mt-1 font-serif text-lg font-semibold text-ink">Reçois ton analyse complète</p>
        <p className="mt-1 text-xs text-muted">
          Michel analyse ton dossier et peut confirmer les chiffres exacts. Gratuit, sans engagement.
        </p>
      </div>

      <div className="mt-4 space-y-2.5">
        <Field label="Nom complet" value={answers.fullName ?? ""} onChange={(v) => update({ fullName: v })} />
        <Field label="Courriel" type="email" value={answers.email ?? ""} onChange={(v) => update({ email: v })} />
        <Field label="Numéro de téléphone" type="tel" value={answers.phone ?? ""} onChange={(v) => update({ phone: v })} />
      </div>

      <label className="mt-3 flex cursor-pointer items-start gap-2 text-xs text-muted">
        <input
          type="checkbox"
          checked={answers.consentContact === true}
          onChange={(e) => update({ consentContact: e.target.checked })}
          className="mt-0.5 h-4 w-4 rounded border-line accent-primary"
        />
        J&apos;accepte d&apos;être contacté(e) au sujet de mon analyse et de mon renouvellement hypothécaire.
      </label>
    </div>
  );
}

function Field({
  label,
  value,
  onChange,
  type = "text",
}: {
  label: string;
  value: string;
  onChange: (v: string) => void;
  type?: string;
}) {
  return (
    <label className="block">
      <span className="mb-1 block text-[11px] font-semibold uppercase tracking-wide text-muted">{label}</span>
      <input
        type={type}
        value={value}
        onChange={(e) => onChange(e.target.value)}
        className="w-full rounded-xl border border-line bg-white px-3.5 py-2.5 text-sm text-ink placeholder:text-muted/60 focus:border-primary focus:outline-none"
      />
    </label>
  );
}

function Select({
  label,
  value,
  onChange,
  options,
}: {
  label: string;
  value: number | "";
  onChange: (v: string) => void;
  options: { label: string; value: number }[];
}) {
  return (
    <label className="block">
      <span className="mb-1 block text-[11px] font-semibold uppercase tracking-wide text-muted">{label}</span>
      <select
        value={value}
        onChange={(e) => onChange(e.target.value)}
        className="h-14 w-full rounded-2xl border border-line bg-white px-4 text-sm font-semibold text-ink focus:border-primary focus:outline-none"
      >
        <option value="" disabled>
          Choisir…
        </option>
        {options.map((opt) => (
          <option key={opt.value} value={opt.value}>
            {opt.label}
          </option>
        ))}
      </select>
    </label>
  );
}
