"use client";

import { useState } from "react";
import type { RenewalInput, RenewalResult } from "@/types/renewal";
import RenewalQuiz from "./RenewalQuiz";
import ResultPanel from "./ResultPanel";
import BrokerCard from "@/components/ui/BrokerCard";
import { renewalConfig } from "@/lib/config";
import { trackPixel } from "@/lib/pixel";

type View = "hero" | "quiz" | "result";

export default function RenewalApp() {
  const [view, setView] = useState<View>("hero");
  const [completed, setCompleted] = useState<{ input: RenewalInput; result: RenewalResult } | null>(null);

  function startQuiz() {
    trackPixel("ViewContent");
    setView("quiz");
  }

  function handleComplete(result: RenewalResult, input: RenewalInput) {
    setCompleted({ input, result });
    setView("result");
  }

  function restart() {
    setCompleted(null);
    setView("hero");
  }

  return (
    <main className="min-h-screen bg-gradient-to-b from-white via-white to-tint">
      <header className="mx-auto flex w-full max-w-[1280px] justify-center px-6 pt-8">
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img src="/logo-mt.png" alt={renewalConfig.brokerName} className="h-16 w-auto" />
      </header>

      <div className="mx-auto w-full max-w-[1280px] px-6 py-10">
        {view === "hero" && <Hero onStart={startQuiz} />}
        {view === "quiz" && <RenewalQuiz onComplete={handleComplete} />}
        {view === "result" && completed && (
          <ResultPanel input={completed.input} result={completed.result} onRestart={restart} />
        )}
      </div>
    </main>
  );
}

function Hero({ onStart }: { onStart: () => void }) {
  return (
    <div className="mx-auto flex w-full max-w-2xl flex-col items-center text-center">
      <span className="caps-label inline-flex items-center gap-2 rounded-full border border-line bg-white px-4 py-1.5 text-[11px] font-semibold text-primary shadow-card">
        ⏱️ 2 minutes · sans engagement
      </span>

      <h1 className="mt-6 font-serif text-4xl font-bold leading-[1.1] text-ink sm:text-5xl">
        Devrais-tu bloquer ton taux, <span className="italic text-primary">briser ton terme</span>, ou attendre?
      </h1>

      <p className="mt-6 text-lg text-muted">
        Réponds à quelques questions sur ton hypothèque actuelle et découvre si c&apos;est le bon moment pour agir —
        analyse gratuite et personnalisée par {renewalConfig.brokerName}.
      </p>

      <button
        onClick={onStart}
        className="mt-8 inline-flex h-14 items-center justify-center rounded-2xl bg-primary px-8 text-base font-bold text-white shadow-glow transition hover:bg-primary-light"
      >
        Analyser mon renouvellement →
      </button>

      <div className="mt-10 grid w-full gap-3 sm:grid-cols-3">
        <ValueProp icon="🔒" title="Confidentiel" subtitle="Tes réponses restent privées" />
        <ValueProp icon="✓" title="Sans engagement" subtitle="Juste une estimation claire" />
        <ValueProp icon="⚡" title="Réponse rapide" subtitle="Michel te recontacte vite" />
      </div>

      <div className="silver-line my-10 w-full max-w-xs" />

      <div className="w-full max-w-sm">
        <BrokerCard />
      </div>
    </div>
  );
}

function ValueProp({ icon, title, subtitle }: { icon: string; title: string; subtitle: string }) {
  return (
    <div className="rounded-2xl border border-line bg-white p-4 shadow-card">
      <div className="text-xl">{icon}</div>
      <div className="mt-1.5 text-sm font-bold text-ink">{title}</div>
      <div className="text-xs text-muted">{subtitle}</div>
    </div>
  );
}
