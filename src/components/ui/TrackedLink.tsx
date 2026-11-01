"use client";

import Link from "next/link";
import { trackPixel } from "@/lib/pixel";

// Lien qui déclenche un événement Meta Pixel au clic, tout en naviguant.
export default function TrackedLink({
  href,
  event,
  className,
  children,
}: {
  href: string;
  event: string;
  className?: string;
  children: React.ReactNode;
}) {
  return (
    <Link href={href} className={className} onClick={() => trackPixel(event)}>
      {children}
    </Link>
  );
}
