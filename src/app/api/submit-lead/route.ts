import { NextResponse } from "next/server";
import { randomUUID } from "crypto";
import { renewalInputSchema } from "@/lib/validation";
import { processLead } from "@/lib/engine";
import { buildCrmPayload, sendToCrm } from "@/lib/crm";
import { echeanceDate, FENETRE_BLOCAGE_JOURS } from "@/lib/decision";

export async function POST(request: Request) {
  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json(
      { success: false, error: "Corps de requête invalide." },
      { status: 400 }
    );
  }

  const parsed = renewalInputSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json(
      {
        success: false,
        error: "Il manque quelques informations avant de pouvoir générer ton résultat.",
        issues: parsed.error.flatten().fieldErrors,
      },
      { status: 422 }
    );
  }

  const input = parsed.data;

  // Garde-fou serveur : trop loin d'avance, on n'envoie pas le lead à Michel,
  // peu importe comment la requête a été construite (même si le formulaire
  // bloque déjà ce cas côté client).
  const jours = Math.round(
    (echeanceDate(input.maturityMonth, input.maturityYear).getTime() - Date.now()) / (1000 * 60 * 60 * 24)
  );
  if (jours > FENETRE_BLOCAGE_JOURS) {
    return NextResponse.json(
      {
        success: false,
        error:
          "À plus de 120 jours de ton échéance, briser ton terme actuel coûterait cher en pénalité — ça ne vaut pas la peine de continuer pour l'instant. Reviens quand il restera 120 jours ou moins.",
      },
      { status: 422 }
    );
  }

  const leadId = randomUUID();

  try {
    const { result } = await processLead(input);

    // Pas de seuil "trop petit" : un renouvellement hypothécaire vaut
    // toujours un rappel de Michel, peu importe le verdict.
    const crmPayload = buildCrmPayload(input, result.decision);
    const crm = await sendToCrm(crmPayload);
    if (!crm.ok) {
      console.error(crm.error);
    }

    return NextResponse.json({
      success: true,
      leadId,
      resultUrl: `/results/${leadId}`,
      result,
    });
  } catch (e) {
    console.error("LEAD_PROCESSING_FAILED", e);
    return NextResponse.json(
      { success: false, error: "Une erreur est survenue. Réessaie dans un instant." },
      { status: 500 }
    );
  }
}
