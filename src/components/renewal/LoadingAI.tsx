"use client";

import { useEffect, useState } from "react";

const STEPS = [
  "Analyse de ton échéance…",
  "Calcul de la pénalité estimée…",
  "Comparaison avec le marché…",
  "Préparation de ton résultat…",
];

export default function LoadingAI() {
  const [index, setIndex] = useState(0);

  useEffect(() => {
    const id = setInterval(() => {
      setIndex((i) => (i < STEPS.length - 1 ? i + 1 : i));
    }, 400);
    return () => clearInterval(id);
  }, []);

  return (
    <div className="flex min-h-[60vh] flex-col items-center justify-center px-6 text-center">
      <div className="relative mb-8 h-16 w-16">
        <div className="absolute inset-0 animate-spin rounded-full border-4 border-tint border-t-primary" />
        <div className="absolute inset-0 flex items-center justify-center text-xl">🏠</div>
      </div>
      <h2 className="font-serif text-xl font-semibold text-ink">{STEPS[index]}</h2>
      <div className="mt-6 flex gap-1.5">
        {STEPS.map((_, i) => (
          <span
            key={i}
            className={`h-2 w-2 rounded-full transition ${i <= index ? "bg-primary" : "bg-line"}`}
          />
        ))}
      </div>
    </div>
  );
}
