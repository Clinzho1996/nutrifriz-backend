import { Document, Model, Schema, Types, model } from "mongoose";
import { IAddress, Role } from "../types";

export interface IUser extends Document {
	_id: Types.ObjectId;
	email: string;
	passwordHash: string;
	firstName: string;
	lastName: string;
	phone?: string;
	role: Role;
	emailVerified: boolean;
	refreshTokenVersion: number;
	addresses: IAddress[];
	crunchPoints: number;
	crunchCardIds: Types.ObjectId[];
	lastLoginAt?: Date;
	createdAt: Date;
	updatedAt: Date;

	fullName(): string;
}

const AddressSchema = new Schema<IAddress>(
	{
		label: { type: String, trim: true },
		fullName: { type: String, required: true, trim: true },
		phone: { type: String, required: true, trim: true },
		street: { type: String, required: true, trim: true },
		city: { type: String, required: true, trim: true },
		state: { type: String, required: true, trim: true },
		country: { type: String, required: true, trim: true, default: "Nigeria" },
		postalCode: { type: String, trim: true },
		isDefault: { type: Boolean, default: false },
	},
	{ _id: true },
);

const UserSchema = new Schema<IUser>(
	{
		email: {
			type: String,
			required: true,
			unique: true,
			lowercase: true,
			trim: true,
			index: true,
		},
		passwordHash: { type: String, required: true, select: false },
		firstName: { type: String, required: true, trim: true },
		lastName: { type: String, required: true, trim: true },
		phone: { type: String, trim: true },
		role: {
			type: String,
			enum: ["customer", "admin", "staff", "b2b"],
			default: "customer",
			index: true,
		},
		emailVerified: { type: Boolean, default: false },
		refreshTokenVersion: { type: Number, default: 0, select: false },
		addresses: { type: [AddressSchema], default: [] },
		crunchPoints: { type: Number, default: 0, min: 0 },
		crunchCardIds: [{ type: Schema.Types.ObjectId, ref: "CrunchCard" }],
		lastLoginAt: { type: Date },
	},
	{ timestamps: true },
);

UserSchema.index({ role: 1, createdAt: -1 });

UserSchema.methods.fullName = function (): string {
	return `${this.firstName} ${this.lastName}`.trim();
};

export const User: Model<IUser> = model<IUser>("User", UserSchema);
