import { NextResponse } from "next/server";
import { randomUUID } from "crypto";
import { renewalInputSchema } from "@/lib/validation";
import { processLead } from "@/lib/engine";
import { buildCrmPayload, sendToCrm } from "@/lib/crm";

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
