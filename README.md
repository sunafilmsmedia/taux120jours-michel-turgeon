# Renouvellement hypothécaire — Michel Turgeon

Outil de décision pour Michel Turgeon, courtier hypothécaire. Un client qui renouvelle son
hypothèque répond à 6 questions (échéance, taux actuel, type de taux, solde, prêteur, dettes à
consolider) et l'app applique un moteur de décision **déterministe** (pas une IA) pour trancher
entre quatre verdicts :

- **BLOQUER_MAINTENANT** — déjà dans la fenêtre de 120 jours avant l'échéance : on bloque un taux,
  sans rien briser.
- **FAIRE_MIEUX_MAINTENANT** — le taux actuel est plus haut que le marché, et le gain net (économies
  moins pénalité estimée) dépasse le seuil minimum : briser maintenant peut valoir la peine.
- **FENETRE_A_VENIR** / **A_SURVEILLER** — rien à faire pour l'instant ; une date de rappel (échéance
  − 120 jours) est calculée automatiquement.
- **TAUX_INCONNU** — le client ne connaît pas son taux actuel : Michel doit d'abord le retrouver.

La logique complète (pénalité 3 mois d'intérêts vs IRD, comparaison au marché, seuil de gain net)
est dans `src/lib/decision.ts` — traduction fidèle de la formule fournie par Michel. Une IA (Claude)
sert uniquement à **expliquer** ce verdict en langage simple ; elle ne le calcule jamais et ne
prédit jamais l'évolution des taux — voir `src/lib/ai.ts` (`SYSTEM_PROMPT`).

## Démarrage

```bash
npm install
npm run dev        # http://localhost:3000
```

## Statut des intégrations

| Service | État | Où le brancher |
|---|---|---|
| Moteur de décision | ✅ réel, local, aucune clé requise | `src/lib/decision.ts` |
| Taux du marché (1/2/3/5 ans + variable) | 🟡 recherche web Claude, cache 12h | `src/lib/rates.ts` — nécessite `ANTHROPIC_API_KEY` |
| Réponse IA personnalisée | 🟡 **stub** (texte généré localement) sans clé | `src/lib/ai.ts` — nécessite `ANTHROPIC_API_KEY` |
| Envoi CRM | 🟡 **stub** (log serveur) sans URL | `src/lib/crm.ts` → définir `CRM_WEBHOOK_URL` (voir `.env.example` pour le webhook déjà utilisé par refinancement-michel-turgeon) |

Sans `ANTHROPIC_API_KEY`, le verdict reste 100 % correct (le calcul ne dépend pas de l'IA) mais les
taux du marché restent `null` — donc `FAIRE_MIEUX_MAINTENANT` ne peut jamais être atteint en local,
puisqu'il faut un taux de marché connu pour comparer. Le texte affiché retombe sur un gabarit local
clair, pas un chiffre halluciné.

## Flux

Page unique (`src/components/renewal/RenewalApp.tsx`) : hero → questionnaire en 7 étapes →
`POST /api/submit-lead` (validation Zod → taux du marché → décision → texte IA → CRM) → résultat,
sans changement d'URL (même logique UX que refinancement-michel-turgeon.vercel.app).

## Branding

Repris tel quel du CONFIG déjà en production sur `refinancement-michel-turgeon.vercel.app` :
palette navy `#0A1F44` / argent `#C3C9D2`, polices Cinzel (`caps-label`) + Playfair Display
(`font-serif`) + Montserrat (`font-sans`), logo `public/logo-mt.png`, téléphone, pixel Meta et
Clarity de Michel (même compte pub, mêmes IDs — voir `src/app/layout.tsx` et `src/lib/config.ts`).

## Configuration métier

Coordonnées du courtier : `src/lib/config.ts`. Paramètres fixes du moteur (fenêtre de 120 jours,
frais de transfert, seuil de gain net minimum) : constantes en haut de `src/lib/decision.ts`.
