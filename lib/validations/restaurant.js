import { z } from "zod";

export const restaurantCreateSchema = z.object({
  name: z.string().min(2),
  tagline: z.string().min(8)
});

export const restaurantUpdateSchema = z.object({
  name: z.string().min(2),
  tagline: z.string().min(8)
});
