import { z } from 'zod';

export const loginSchema = z.object({
  mobileOrEmail: z.string().min(1, { message: 'Email or mobile number is required' }),
  password: z.string().min(1, { message: 'Password is required' }),
  rememberMe: z.boolean().optional(),
});

export type LoginFormValues = z.infer<typeof loginSchema>;
