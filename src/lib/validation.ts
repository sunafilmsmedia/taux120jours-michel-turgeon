import { z } from "zod";

const phoneRegex = /^[+]?[\d\s().-]{10,20}$/;

export const renewalInputSchema = z.object({
  firstName: z.string().trim().min(1, "Le prénom est requis"),
  lastName: z.string().trim().optional(),
  email: z.string().trim().email("Courriel invalide"),
  phone: z.string().trim().regex(phoneRegex, "Numéro de téléphone invalide"),

  maturityMonth: z.number().int().min(1).max(12),
  maturityYear: z.number().int().min(2020).max(2040),

  currentRate: z.number().min(0).max(25).nullable(),
  rateType: z.enum(["fixe", "variable"]),
  balance: z.number().min(0).max(10_000_000),
  lender: z.enum(["grande_banque", "autre", "ne_sais_pas"]),
  debtsToConsolidate: z.number().min(0).max(10_000_000),

  consentContact: z.literal(true, {
    errorMap: () => ({ message: "Le consentement est requis" }),
  }),
});

export type ValidatedRenewalInput = z.infer<typeof renewalInputSchema>;
