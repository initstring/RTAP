import { z } from "zod";
import { UserRole } from "@prisma/client";

const userRoleSchema = z.nativeEnum(UserRole);

const lastLoginSchema = z
  .union([z.date(), z.string(), z.number()])
  .nullable()
  .optional();

export const userProfileSchema = z.object({
  id: z.string(),
  name: z.string().nullable().optional(),
  email: z.string().email(),
  role: userRoleSchema,
  lastLogin: lastLoginSchema,
});

export type UserProfile = z.infer<typeof userProfileSchema>;

const userListSchema = z.array(userProfileSchema);

export function parseUserProfile(value: unknown): UserProfile | null {
  const result = userProfileSchema.safeParse(value);
  return result.success ? result.data : null;
}

export function parseUserProfileList(value: unknown): UserProfile[] {
  const result = userListSchema.safeParse(value);
  return result.success ? result.data : [];
}

export function isUserRole(value: unknown): value is UserRole {
  return userRoleSchema.safeParse(value).success;
}
