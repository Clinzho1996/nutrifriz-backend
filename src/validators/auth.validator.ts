import { z } from "zod";

export const registerSchema = z.object({
	email: z.string().email().toLowerCase(),
	password: z.string().min(8, "Password must be at least 8 characters"),
	firstName: z.string().min(1).max(60),
	lastName: z.string().min(1).max(60),
	phone: z.string().min(7).max(20).optional(),
});

export const loginSchema = z.object({
	email: z.string().email().toLowerCase(),
	password: z.string().min(1),
});

export const refreshSchema = z.object({
	refreshToken: z.string().min(10),
});

export const forgotPasswordSchema = z.object({
	email: z.string().email().toLowerCase(),
});

export const resetPasswordSchema = z.object({
	token: z.string().min(10),
	password: z.string().min(8),
});

export const updateProfileSchema = z.object({
	firstName: z.string().min(1).max(60).optional(),
	lastName: z.string().min(1).max(60).optional(),
	phone: z.string().min(7).max(20).optional(),
});

export const changePasswordSchema = z.object({
	currentPassword: z.string().min(1),
	newPassword: z.string().min(8),
});

export const addressSchema = z.object({
	label: z.string().max(40).optional(),
	fullName: z.string().min(1).max(80),
	phone: z.string().min(7).max(20),
	street: z.string().min(1).max(200),
	city: z.string().min(1).max(80),
	state: z.string().min(1).max(80),
	country: z.string().min(1).max(80).default("Nigeria"),
	postalCode: z.string().max(20).optional(),
	isDefault: z.boolean().optional(),
});

export type RegisterInput = z.infer<typeof registerSchema>;
export type LoginInput = z.infer<typeof loginSchema>;
export type AddressInput = z.infer<typeof addressSchema>;
