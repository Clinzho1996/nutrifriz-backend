/// <reference path="./express.d.ts" />

import { Types } from "mongoose";

export type Role = "customer" | "admin" | "staff" | "b2b";
export type AdminRole = "superadmin" | "admin" | "staff";

export type Permission =
	| "products:*"
	| "collections:*"
	| "orders:*"
	| "customers:*"
	| "mix:*"
	| "cards:*"
	| "journal:*"
	| "reviews:*"
	| "b2b:*"
	| "analytics:*"
	| "settings:*"
	| "users:*";

export interface IAddress {
	label?: string;
	fullName: string;
	phone: string;
	street: string;
	city: string;
	state: string;
	country: string;
	postalCode?: string;
	isDefault?: boolean;
}

export interface JwtPayload {
	sub: string;
	email: string;
	role: Role;
	iat?: number;
	exp?: number;
}

export interface AuthedUser {
	_id: Types.ObjectId;
	email: string;
	role: Role;
	permissions?: Permission[];
}

export interface PaginationQuery {
	page?: number;
	limit?: number;
	sort?: string;
	q?: string;
}

export interface PaginatedResult<T> {
	items: T[];
	total: number;
	page: number;
	limit: number;
	pages: number;
}

export type OrderStatus =
	| "pending"
	| "paid"
	| "processing"
	| "shipped"
	| "delivered"
	| "cancelled"
	| "refunded";

export type PaymentStatus = "init" | "success" | "failed";

export type ProductStatus = "draft" | "published" | "archived";

export type ReviewStatus = "pending" | "approved" | "rejected";
