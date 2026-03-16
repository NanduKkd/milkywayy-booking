import { z } from "zod";

const optionalEmailSchema = z
  .string()
  .trim()
  .email("Invalid email address")
  .optional()
  .or(z.literal(""));

const signInSchema = z.object({
  email: z.string().min(1, "Email is required").email("Invalid email address"),
  password: z
    .string()
    .min(1, "Password is required")
    .min(6, "Password must be at least 6 characters"),
});

const phoneSchema = z.object({
  phone: z
    .string()
    .min(1, "Phone number is required")
    .min(7, "Phone number is too short"),
});

const otpSchema = z.object({
  otp: z.string().min(6, "OTP must be 6 digits").max(6, "OTP must be 6 digits"),
});

const newUserSchema = z
  .object({
    accountType: z.enum(["INDIVIDUAL", "COMPANY"]),
    fullName: z.string().optional(),
    companyName: z.string().optional(),
    phone: z
      .string()
      .min(1, "Phone number is required")
      .min(7, "Phone number is too short"),
    billingAddress: z.string().optional(),
    email: optionalEmailSchema,
    trn: z.string().optional(),
  })
  .superRefine((data, ctx) => {
    if (data.accountType === "INDIVIDUAL") {
      if (!data.fullName?.trim()) {
        ctx.addIssue({
          code: z.ZodIssueCode.custom,
          path: ["fullName"],
          message: "Full name is required",
        });
      } else if (data.fullName.trim().length < 2) {
        ctx.addIssue({
          code: z.ZodIssueCode.custom,
          path: ["fullName"],
          message: "Full name must be at least 2 characters",
        });
      }
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

export { signInSchema, phoneSchema, otpSchema, newUserSchema };
