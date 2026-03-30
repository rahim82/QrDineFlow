import { z } from "zod";

export const restaurantCreateSchema = z.object({
  name: z.string().min(2),
  tagline: z.string().min(8),
  gstRate: z.coerce.number().min(0).max(1).default(0.05)
});

export const restaurantUpdateSchema = z.object({
  name: z.string().min(2),
  tagline: z.string().min(8),
  gstRate: z.coerce.number().min(0).max(1)
});
