import { z } from "zod";

const nullableOptionalStringSchema = z.string().nullable().optional();
const optionalEmailSchema = z
  .string()
  .trim()
  .email("Invalid email address")
  .optional()
  .or(z.literal(""))
  .nullable();

export const adminBookingNewCustomerSchema = z
  .object({
    accountType: z.enum(["INDIVIDUAL", "COMPANY"]),
    fullName: nullableOptionalStringSchema,
    companyName: nullableOptionalStringSchema,
    phone: z
      .string()
      .trim()
      .min(1, "Phone number is required")
      .min(7, "Phone number is too short"),
    billingAddress: nullableOptionalStringSchema,
    email: optionalEmailSchema,
    trn: nullableOptionalStringSchema,
  })
  .superRefine((data, ctx) => {
    if (data.accountType === "INDIVIDUAL" && !data.fullName?.trim()) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        path: ["fullName"],
        message: "Full name is required",
      });
    }

    if (data.accountType === "COMPANY") {
      if (!data.companyName?.trim()) {
        ctx.addIssue({
          code: z.ZodIssueCode.custom,
          path: ["companyName"],
          message: "Company name is required",
        });
      }

      if (!data.billingAddress?.trim()) {
        ctx.addIssue({
          code: z.ZodIssueCode.custom,
          path: ["billingAddress"],
          message: "Billing address is required",
        });
      }

      if (!data.email?.trim()) {
        ctx.addIssue({
          code: z.ZodIssueCode.custom,
          path: ["email"],
          message: "Email is required",
        });
      }
    }
  });

export function getAdminBookingValidationMessage(
  error,
  fallback = "Invalid customer or booking details",
) {
  if (!(error instanceof z.ZodError)) {
    return fallback;
  }

  const message = error.issues.find(
    (issue) => typeof issue?.message === "string" && issue.message.trim(),
  )?.message;

  return message || fallback;
}
