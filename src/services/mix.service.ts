import { Types } from "mongoose";
import { MixRule, IMixRule } from "../models/MixRule";
import { MixConfig, IMixConfig } from "../models/MixConfig";
import { Product } from "../models/Product";
import { AppError } from "../utils/AppError";
import {
	PriceMixInput,
	SaveMixInput,
	MixRuleInput,
} from "../validators/mix.validator";

export async function listRules(): Promise<IMixRule[]> {
	return MixRule.find({ isActive: true }).sort({ packSize: 1 }).lean();
}

export async function upsertRule(input: MixRuleInput): Promise<IMixRule> {
	validateRuleShape(input);
	const rule = await MixRule.findOneAndUpdate(
		{ packSize: input.packSize },
		{ $set: input },
		{ new: true, upsert: true, setDefaultsOnInsert: true },
	);
	return rule as IMixRule;
}

export async function getRuleForPack(packSize: string): Promise<IMixRule> {
	const rule = await MixRule.findOne({ packSize, isActive: true }).lean();
	if (!rule)
		throw AppError.badRequest(
			`Pack size "${packSize}" is not available for Build Your Mix`,
		);
	return rule;
}

export async function priceMix(input: PriceMixInput) {
	const rule = await getRuleForPack(input.packSize);

	if (
		input.fruits.length < rule.minFruits ||
		input.fruits.length > rule.maxFruits
	) {
		throw AppError.badRequest(
			`Choose between ${rule.minFruits} and ${rule.maxFruits} fruits`,
		);
	}

	const totalGrams = input.fruits.reduce((sum, f) => sum + f.grams, 0);
	if (totalGrams !== rule.totalGrams) {
		throw AppError.badRequest(`Total mix must equal ${rule.totalGrams}g`);
	}

	const productIds = input.fruits.map((f) => f.productId);

	for (const f of input.fruits) {
		if (!rule.allowedFruitIds.some((id) => String(id) === f.productId)) {
			throw AppError.badRequest(
				`Fruit ${f.productId} is not available for Build Your Mix`,
			);
		}
		if (f.grams < rule.minGramsPerFruit) {
			throw AppError.badRequest(
				`Each fruit requires a minimum of ${rule.minGramsPerFruit}g`,
			);
		}
	}

	const products = await Product.find({ _id: { $in: productIds } }).lean();
	const productMap = new Map(products.map((p) => [String(p._id), p]));

	const composition = input.fruits.map((f) => {
		const product = productMap.get(f.productId);
		if (!product) throw AppError.badRequest(`Product ${f.productId} not found`);
		return {
			productId: product._id,
			name: product.name,
			grams: f.grams,
		};
	});

	const price = totalGrams * rule.pricePerGram;

	return {
		packSize: input.packSize,
		totalGrams,
		price,
		composition,
	};
}

export async function saveMix(
	userId: string | undefined,
	guestEmail: string | undefined,
	input: SaveMixInput,
): Promise<IMixConfig> {
	const priced = await priceMix(input);
	const mix = await MixConfig.create({
		userId: userId ? new Types.ObjectId(userId) : undefined,
		guestEmail,
		name: input.name,
		packSize: input.packSize,
		fruits: priced.composition,
		computedPrice: priced.price,
		status: "cart",
	});
	return mix;
}

export async function getMixById(id: string): Promise<IMixConfig> {
	const mix = await MixConfig.findById(id).lean();
	if (!mix) throw AppError.notFound("Mix not found");
	return mix;
}

export async function listMixesForUser(userId: string) {
	return MixConfig.find({ userId }).sort({ createdAt: -1 }).lean();
}

export async function deleteMix(id: string, userId?: string) {
	const mix = await MixConfig.findById(id);
	if (!mix) throw AppError.notFound("Mix not found");
	if (userId && String(mix.userId) !== userId) throw AppError.forbidden();
	await mix.deleteOne();
}

function validateRuleShape(input: MixRuleInput) {
	if (input.minFruits > input.maxFruits) {
		throw AppError.badRequest("minFruits cannot be greater than maxFruits");
	}
	if (input.minGramsPerFruit * input.minFruits > input.totalGrams) {
		throw AppError.badRequest(
			"minGramsPerFruit × minFruits cannot exceed totalGrams",
		);
	}
}
