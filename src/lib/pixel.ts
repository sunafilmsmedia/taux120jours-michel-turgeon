// Déclenche un événement Meta (Facebook) Pixel côté client, en toute sécurité.
// Ne fait rien si le pixel n'est pas encore chargé ou côté serveur.
type Fbq = (
  action: "track" | "trackCustom",
  event: string,
  params?: Record<string, unknown>
) => void;

export function trackPixel(event: string, params?: Record<string, unknown>): void {
  if (typeof window === "undefined") return;
  const fbq = (window as unknown as { fbq?: Fbq }).fbq;
  if (typeof fbq === "function") {
    fbq("track", event, params);
  }
}
