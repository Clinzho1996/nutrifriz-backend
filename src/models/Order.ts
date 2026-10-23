import { Document, Model, Schema, Types, model } from "mongoose";
import { IAddress, OrderStatus, PaymentStatus } from "../types";

export interface IOrderItem {
	kind: "product" | "collection" | "mix";
	refId: Types.ObjectId;
	name: string;
	unitPrice: number;
	qty: number;
	meta?: Record<string, unknown>;
}

export interface IOrderPayment {
	provider: "paystack" | "flutterwave" | "manual" | "transfer_manual";
	method?:
		| "cash"
		| "transfer"
		| "pos"
		| "paystack"
		| "flutterwave"
		| "other"
		| "bank_transfer";
	reference: string;
	status: PaymentStatus;
	paidAt?: Date;
	receiptProofUrl?: string; // NEW — uploaded by admin when confirming
	receiptNote?: string; // NEW — free-form reference (e.g. transfer narration)
	raw?: Record<string, unknown>;
}

export interface IOrderHistory {
	status: OrderStatus;
	at: Date;
	by?: Types.ObjectId;
	note?: string;
}

export interface IOrderFulfilment {
	method?: "delivery" | "pickup";
	pickupNote?: string;
	courier?: string;
	trackingNo?: string;
	notes?: string;
	shippedAt?: Date;
	deliveredAt?: Date;
}

export interface IOrder extends Document {
	_id: Types.ObjectId;
	orderNumber: string;
	userId?: Types.ObjectId;
	guestEmail?: string;
	items: IOrderItem[];
	subtotal: number;
	shippingFee: number;
	source: "online" | "manual";
	total: number;
	currency: "NGN";
	shippingAddress: IAddress;
	status: OrderStatus;
	payment: IOrderPayment;
	fulfilment: IOrderFulfilment;
	history: IOrderHistory[];
	createdAt: Date;
	updatedAt: Date;
}

const OrderItemSchema = new Schema<IOrderItem>(
	{
		kind: {
			type: String,
			enum: ["product", "collection", "mix"],
			required: true,
		},
		refId: { type: Schema.Types.ObjectId, required: true },
		name: { type: String, required: true },
		unitPrice: { type: Number, required: true, min: 0 },
		qty: { type: Number, required: true, min: 1 },
		meta: { type: Schema.Types.Mixed },
	},
	{ _id: false },
);

const AddressSchema = new Schema<IAddress>(
	{
		label: String,
		fullName: { type: String, required: true },
		phone: { type: String, required: true },
		street: { type: String, required: true },
		city: { type: String, required: true },
		state: { type: String, required: true },
		country: { type: String, required: true, default: "Nigeria" },
		postalCode: String,
	},
	{ _id: false },
);

const PaymentSchema = new Schema<IOrderPayment>(
	{
		provider: {
			type: String,
			enum: ["paystack", "flutterwave", "manual", "transfer_manual"],
			required: true,
		},
		method: {
			type: String,
			enum: [
				"cash",
				"transfer",
				"pos",
				"paystack",
				"flutterwave",
				"other",
				"bank_transfer",
			],
		},
		reference: { type: String, required: true, index: true, unique: true },
		status: {
			type: String,
			enum: ["init", "success", "failed"],
			default: "init",
		},
		paidAt: Date,
		receiptProofUrl: { type: String },
		receiptNote: { type: String, maxlength: 300 },
		raw: { type: Schema.Types.Mixed },
	},
	{ _id: false },
);

const HistorySchema = new Schema<IOrderHistory>(
	{
		status: { type: String, required: true },
		at: { type: Date, default: () => new Date() },
		by: { type: Schema.Types.ObjectId, ref: "User" },
		note: String,
	},
	{ _id: false },
);

const FulfilmentSchema = new Schema<IOrderFulfilment>(
	{
		method: {
			type: String,
			enum: ["delivery", "pickup"],
			default: "delivery",
		},
		pickupNote: { type: String, maxlength: 300 },
		courier: String,
		trackingNo: String,
		notes: String,
		shippedAt: Date,
		deliveredAt: Date,
	},
	{ _id: false },
);

const OrderSchema = new Schema<IOrder>(
	{
		orderNumber: { type: String, required: true, unique: true, index: true },
		userId: { type: Schema.Types.ObjectId, ref: "User", index: true },
		guestEmail: { type: String, lowercase: true, trim: true, index: true },
		items: { type: [OrderItemSchema], required: true },
		subtotal: { type: Number, required: true, min: 0 },
		shippingFee: { type: Number, required: true, min: 0, default: 0 },
		total: { type: Number, required: true, min: 0 },
		currency: { type: String, enum: ["NGN"], default: "NGN" },
		shippingAddress: { type: AddressSchema, required: true },
		status: {
			type: String,
			enum: [
				"pending",
				"paid",
				"processing",
				"shipped",
				"delivered",
				"cancelled",
				"refunded",
			],
			default: "pending",
			index: true,
		},
		source: {
			type: String,
			enum: ["online", "manual"],
			default: "online",
			index: true,
		},
		payment: { type: PaymentSchema, required: true },
		fulfilment: { type: FulfilmentSchema, default: {} },
		history: { type: [HistorySchema], default: [] },
	},
	{ timestamps: true },
);

OrderSchema.index({ createdAt: -1 });
OrderSchema.index({ status: 1, createdAt: -1 });

export const Order: Model<IOrder> = model<IOrder>("Order", OrderSchema);
