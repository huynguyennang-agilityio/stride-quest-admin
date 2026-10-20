import { z } from "zod";

// The field rules of contract/auth.md. The backend checks them again.
const emailSchema = z.email();

export const signInSchema = z.object({
  email: z
    .string()
    .trim()
    .min(1, "Enter your email.")
    .max(254, "Email must be 254 characters or fewer.")
    .refine((value) => emailSchema.safeParse(value).success, "Enter a valid email address."),
  password: z
    .string()
    .min(1, "Enter your password.")
    .min(8, "Password must be at least 8 characters.")
    .max(128, "Password must be 128 characters or fewer.")
    .regex(/[A-Za-z]/, "Password must contain at least one letter.")
    .regex(/[0-9]/, "Password must contain at least one digit."),
});

export type SignInValues = z.infer<typeof signInSchema>;
