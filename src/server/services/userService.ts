import { TRPCError } from "@trpc/server";
import type { PrismaClient, UserRole } from "@prisma/client";
export type CreateUserDTO = {
  email: string;
  name: string;
  role: UserRole;
};

export type UpdateUserDTO = {
  id: string;
  email?: string;
  name?: string;
  role?: UserRole;
};

function normalizeEmail(email: string) {
  return email.trim().toLowerCase();
}

export async function createUser(db: PrismaClient, dto: CreateUserDTO) {
  const email = normalizeEmail(dto.email);
  const existing = await db.user.findUnique({ where: { email } });
  if (existing) throw new TRPCError({ code: "BAD_REQUEST", message: "User with this email already exists" });
  return db.user.create({
    data: {
      email,
      name: dto.name,
      role: dto.role,
    },
    select: defaultUserSelect(),
  });
}

export async function updateUser(db: PrismaClient, dto: UpdateUserDTO) {
  const { id, email: emailInput, ...updateData } = dto;
  const email = emailInput ? normalizeEmail(emailInput) : undefined;
  if (email) {
    const existing = await db.user.findFirst({ where: { email, id: { not: id } } });
    if (existing) throw new TRPCError({ code: "BAD_REQUEST", message: "Email is already taken by another user" });
  }

  return db.user.update({
    where: { id },
    data: {
      ...updateData,
      ...(email ? { email } : {}),
    },
    select: defaultUserSelect(),
  });
}

export function defaultUserSelect() {
  return {
    id: true,
    name: true,
    email: true,
    role: true,
    lastLogin: true,
  } as const;
}
