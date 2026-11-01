"use client";

import type { RenewalInput, RenewalResult, Verdict } from "@/types/renewal";
import { buildVerdictContent, formatDateFr } from "@/lib/messages";
import { formatCurrency, formatRatePercent } from "@/lib/format";
import { renewalConfig } from "@/lib/config";
import BrokerCard from "@/components/ui/BrokerCard";

const TONE_STYLES: Record<string, string> = {
  positive: "border-positive/30 bg-positive/5 text-positive",
  urgent: "border-danger/30 bg-danger/5 text-danger",
  neutral: "border-primary/20 bg-primary/5 text-primary",
  info: "border-accent/40 bg-tint text-ink",
};

// La date de rappel (échéance - 120 jours) n'a de sens que pour un verdict
// "attends" : pour BLOQUER_MAINTENANT et FAIRE_MIEUX_MAINTENANT, cette date
// est déjà passée (on est déjà dans ou après la fenêtre), donc trompeuse.
function showRelance(verdict: Verdict): boolean {
  return verdict === "FENETRE_A_VENIR" || verdict === "A_SURVEILLER" || verdict === "TAUX_INCONNU";
}

export default function ResultPanel({
  input,
  result,
  onRestart,
}: {
  input: RenewalInput;
  result: RenewalResult;
  onRestart: () => void;
}) {
  const { decision, rates, aiResponse } = result;
  const content = buildVerdictContent(input, decision);
  const hasRates = rates.generated && (rates.fixe3 || rates.fixe5 || rates.variable);
  const hasNumbers = decision.penalite !== null || decision.economies !== null || decision.gainNet !== null;

  return (
    <div className="mx-auto w-full max-w-2xl animate-fadeUp">
      <span className="caps-label text-xs font-semibold text-primary">Ton analyse</span>
      <h1 className="mt-3 font-serif text-3xl font-bold leading-tight text-ink sm:text-4xl">
        {input.firstName}, {content.headline.toLowerCase()}.
      </h1>

      <div className={`mt-6 rounded-3xl border p-6 ${TONE_STYLES[content.tone]}`}>
        <p className="text-sm leading-relaxed sm:text-base">{content.message}</p>
      </div>

      {hasNumbers && (
        <div className="mt-4 grid gap-4 sm:grid-cols-3">
          {decision.penalite !== null && <Figure label="Pénalité estimée" value={decision.penalite} />}
          {decision.economies !== null && <Figure label="Économies estimées" value={decision.economies} />}
          {decision.gainNet !== null && <Figure label="Gain net estimé" value={decision.gainNet} emphasis />}
        </div>
      )}

      {decision.consolidation && (
        <div className="mt-4 rounded-2xl border border-line bg-tint p-5 text-sm text-ink">
          Tu as aussi mentionné <strong>{formatCurrency(input.debtsToConsolidate)}</strong> de dettes à consolider — Michel
          regardera aussi cette option avec toi.
        </div>
      )}

      {showRelance(decision.verdict) && (
        <div className="mt-4 rounded-2xl border border-line bg-white p-5 text-sm text-muted">
          Date de rappel prévue : <strong className="text-ink">{formatDateFr(decision.relance)}</strong> (120 jours avant
          ton échéance, la fenêtre où tu peux bloquer un taux sans pénalité).
        </div>
      )}

      <div className="mt-6 rounded-3xl border border-line bg-white p-6 shadow-card">
        <div className="caps-label mb-3 text-xs font-semibold text-primary">Taux actuellement observés sur le marché</div>
        {hasRates ? (
          <>
            <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
              <RateFigure label="Fixe 3 ans" value={rates.fixe3} />
              <RateFigure label="Fixe 5 ans" value={rates.fixe5} />
              <RateFigure label="Variable" value={rates.variable} />
              <RateFigure label="Fixe 1 an" value={rates.fixe1} />
            </div>
            <p className="mt-3 text-xs text-muted">
              Source : {rates.sourceName ?? "comparateur en ligne"}
              {rates.asOfDate ? ` — en date du ${rates.asOfDate}` : ""}. À titre indicatif seulement : les taux fluctuent et
              ton taux réel dépendra de ton dossier.
            </p>
          </>
        ) : (
          <p className="text-sm leading-relaxed text-muted">
            Les taux fluctuent quotidiennement — {renewalConfig.brokerName} pourra te donner les taux exacts du jour lors de
            votre appel.
          </p>
        )}
      </div>

      <div className="mt-6 rounded-3xl border border-line bg-white p-6 shadow-card">
        <h2 className="mb-3 font-serif text-lg font-bold text-ink">Ton analyse personnalisée</h2>
        <div className="space-y-3 text-sm leading-relaxed text-ink/90">
          {aiResponse.split("\n").map((line, i) =>
            line.trim() === "" ? <div key={i} className="h-1" /> : <p key={i}>{line}</p>
          )}
        </div>
      </div>

      <p className="mt-6 rounded-2xl border border-line bg-tint p-4 text-xs leading-relaxed text-muted">
        Ce résultat est fourni à titre informatif seulement, à partir des informations fournies. Il ne constitue pas un
        conseil financier personnalisé. La pénalité, les économies et le gain net sont des estimations qui doivent être
        confirmées par Michel Turgeon à partir du relevé exact de ton prêteur avant toute décision de renouvellement.
      </p>

      <div className="mt-8">
        <BrokerCard />
      </div>

      <button
        onClick={onRestart}
        className="mt-6 w-full rounded-2xl border border-line px-6 py-3 text-sm font-semibold text-muted transition hover:bg-tint"
      >
        Recommencer l&apos;analyse
      </button>
    </div>
  );
}

function Figure({ label, value, emphasis }: { label: string; value: number; emphasis?: boolean }) {
  return (
    <div className={`rounded-2xl border p-4 text-center ${emphasis ? "border-primary/30 bg-primary/5" : "border-line bg-white"}`}>
      <div className="caps-label text-[10px] font-semibold text-muted">{label}</div>
      <div className="mt-1 font-serif text-xl font-bold text-ink">{formatCurrency(value)}</div>
    </div>
  );
}

function RateFigure({ label, value }: { label: string; value: number | null }) {
  return (
    <div className="rounded-xl bg-tint p-3 text-center">
      <div className="text-[10px] font-semibold uppercase tracking-wide text-muted">{label}</div>
      <div className="mt-1 text-lg font-bold text-primary">{formatRatePercent(value)}</div>
    </div>
  );
}
