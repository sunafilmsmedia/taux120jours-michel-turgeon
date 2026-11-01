"use client";

import { useState } from "react";
import { renewalConfig } from "@/lib/config";

export default function BrokerCard() {
  const [imgError, setImgError] = useState(false);

  return (
    <div className="rounded-3xl border border-line bg-white p-5 shadow-card">
      <div className="flex items-center gap-4">
        <div className="relative shrink-0">
          {imgError ? (
            <div className="flex h-16 w-16 items-center justify-center rounded-full bg-tint text-lg font-extrabold text-primary">
              MT
            </div>
          ) : (
            // eslint-disable-next-line @next/next/no-img-element
            <img
              src="/michel-turgeon.jpg"
              alt={renewalConfig.brokerName}
              onError={() => setImgError(true)}
              className="h-16 w-16 rounded-full object-cover ring-2 ring-primary/20"
            />
          )}
          <span className="absolute -bottom-0.5 -right-0.5 h-4 w-4 rounded-full border-2 border-white bg-positive" />
        </div>

        <div className="min-w-0 flex-1">
          <span className="caps-label inline-flex items-center gap-1.5 text-[10px] font-semibold text-positive">
            <span className="h-1.5 w-1.5 animate-pulseSoft rounded-full bg-positive" />
            En ligne
          </span>
          <p className="mt-1.5 truncate font-serif text-base font-bold text-ink">{renewalConfig.brokerName}</p>
          <p className="caps-label truncate text-[11px] text-muted">{renewalConfig.brokerTitle}</p>
        </div>
      </div>

      <a
        href={`tel:${renewalConfig.brokerPhoneTel}`}
        className="mt-4 flex h-12 w-full items-center justify-center gap-2 rounded-2xl bg-primary text-sm font-bold text-white transition hover:bg-primary-light"
      >
        <span aria-hidden>📞</span> Appeler {renewalConfig.brokerPhone}
      </a>
      <a
        href={`sms:${renewalConfig.brokerPhoneTel}`}
        className="mt-2.5 flex h-12 w-full items-center justify-center gap-2 rounded-2xl border border-line text-sm font-semibold text-ink transition hover:bg-tint"
      >
        <span aria-hidden>💬</span> Texter Michel
      </a>
    </div>
  );
}
