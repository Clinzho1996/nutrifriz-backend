import { Types } from "mongoose";
import { Category } from "../models/Category";
import { Product } from "../models/Product";
import { AppError } from "../utils/AppError";
import { parseCsv } from "../utils/csv";
import { toSlug } from "../utils/slugify";
import { recordAudit } from "./audit.service";

export interface ProductImportOptions {
	updateExisting?: boolean;
	defaultStatus?: "draft" | "published" | "archived";
	autoCreateCategories?: boolean;
	actorId?: string;
}

export interface ProductImportRowError {
	row: number;
	slug?: string;
	reason: string;
}

export interface ProductImportResult {
	created: number;
	updated: number;
	skipped: number;
	errors: ProductImportRowError[];
	products: {
		name: string;
		slug: string;
		id: string;
		action: "created" | "updated";
	}[];
	categoriesCreated: string[];
}

interface GroupedProduct {
	name: string;
	slug: string;
	category: string;
	categoryId?: string;
	fruit?: string;
	shortDescription: string;
	description: string;
	images: string[];
	ingredients: string[];
	tags: string[];
	storage?: string;
	shelfLife?: string;
	shippingInfo?: string;
	status: "draft" | "published" | "archived";
	isFeatured: boolean;
	isBuildYourMixEligible: boolean;
	nutrition?: {
		calories: number;
		protein: number;
		carbs: number;
		sugar: number;
		fibre: number;
		fat: number;
	};
	packSizes: {
		size: string;
		price: number;
		sku: string;
		stock: number;
	}[];
	firstRow: number; // for error reporting
}

const REQUIRED_HEADERS = [
	"name",
	"category",
	"shortDescription",
	"description",
	"size",
	"price",
	"sku",
	"stock",
];

/**
 * Parse and validate a product CSV. Groups rows into products by slug.
 */
export async function importProductsCsv(
	raw: string,
	options: ProductImportOptions,
): Promise<ProductImportResult> {
	const rows = parseCsv(raw);
	if (rows.length === 0) throw AppError.badRequest("CSV contains no data rows");

	const headers = Object.keys(rows[0] ?? {});
	const missing = REQUIRED_HEADERS.filter((h) => !headers.includes(h));
	if (missing.length > 0) {
		throw AppError.badRequest(
			`Missing required columns: ${missing.join(", ")}`,
		);
	}

	const defaultStatus = options.defaultStatus ?? "draft";
	const result: ProductImportResult = {
		created: 0,
		updated: 0,
		skipped: 0,
		errors: [],
		products: [],
		categoriesCreated: [],
	};

	// ── Pass 1: group rows by slug ────────────────────────────
	const grouped = new Map<string, GroupedProduct>();

	for (let i = 0; i < rows.length; i++) {
		const row = rows[i];
		const rowNum = i + 2; // +2 = header is row 1, array is 0-indexed

		try {
			const slugSource = row.slug?.trim() || row.name?.trim();
			if (!slugSource) {
				result.errors.push({ row: rowNum, reason: "Missing name and slug" });
				continue;
			}

			const slug = toSlug(slugSource);

			// Variant fields
			const size = row.size?.trim();
			const priceRaw = row.price?.trim();
			const sku = row.sku?.trim();
			const stockRaw = row.stock?.trim();

			if (!size) {
				result.errors.push({ row: rowNum, slug, reason: "Missing size" });
				continue;
			}
			const price = Number(priceRaw);
			if (!Number.isFinite(price) || price < 0) {
				result.errors.push({
					row: rowNum,
					slug,
					reason: `Invalid price "${priceRaw}"`,
				});
				continue;
			}
			if (!sku) {
				result.errors.push({ row: rowNum, slug, reason: "Missing sku" });
				continue;
			}
			const stock = Number(stockRaw ?? 0);
			if (!Number.isInteger(stock) || stock < 0) {
				result.errors.push({
					row: rowNum,
					slug,
					reason: `Invalid stock "${stockRaw}"`,
				});
				continue;
			}

			// Product-level fields (first row wins for shared fields)
			let group = grouped.get(slug);
			if (!group) {
				const categoryRaw = row.category?.trim()?.toLowerCase();
				if (!categoryRaw) {
					result.errors.push({ row: rowNum, slug, reason: "Missing category" });
					continue;
				}
				if (!["fruit", "mix", "collection", "gift"].includes(categoryRaw)) {
					result.errors.push({
						row: rowNum,
						slug,
						reason: `Invalid category "${categoryRaw}" — must be fruit | mix | collection | gift`,
					});
					continue;
				}
				if (!row.shortDescription?.trim() || !row.description?.trim()) {
					result.errors.push({
						row: rowNum,
						slug,
						reason: "Missing shortDescription or description",
					});
					continue;
				}

				group = {
					name: row.name.trim(),
					slug,
					category: categoryRaw,
					categoryId: row.categoryId?.trim() || undefined,
					fruit: row.fruit?.trim() || undefined,
					shortDescription: row.shortDescription.trim().slice(0, 240),
					description: row.description.trim(),
					images: splitPipe(row.images),
					ingredients: splitPipe(row.ingredients),
					tags: splitPipe(row.tags),
					storage: row.storage?.trim() || undefined,
					shelfLife: row.shelfLife?.trim() || undefined,
					shippingInfo: row.shippingInfo?.trim() || undefined,
					status: normalizeStatus(row.status, defaultStatus),
					isFeatured: parseBool(row.isFeatured),
					isBuildYourMixEligible: parseBool(row.isBuildYourMixEligible),
					nutrition: parseNutrition(row),
					packSizes: [],
					firstRow: rowNum,
				};
				grouped.set(slug, group);
			}

			// Deduplicate by sku within the group
			if (group.packSizes.some((p) => p.sku === sku)) {
				result.errors.push({
					row: rowNum,
					slug,
					reason: `Duplicate SKU "${sku}" within product`,
				});
				continue;
			}

			group.packSizes.push({ size, price, sku, stock });
		} catch (err) {
			result.errors.push({
				row: rowNum,
				reason: (err as Error).message ?? "Unknown parse error",
			});
		}
	}

	// ── Pass 2: upsert ────────────────────────────────────────
	const categoriesCreated = new Set<string>();

	for (const group of grouped.values()) {
		try {
			// Resolve categoryId
			let categoryId = group.categoryId
				? new Types.ObjectId(group.categoryId)
				: undefined;

			if (!categoryId && options.autoCreateCategories) {
				const catSlug = toSlug(group.category);
				let cat = await Category.findOne({ slug: catSlug });
				if (!cat) {
					cat = await Category.create({
						slug: catSlug,
						name: titleCase(group.category),
						description: "",
						order: 0,
						isActive: true,
					});
					categoriesCreated.add(cat.name);
				}
				categoryId = cat._id as Types.ObjectId;
			}

			const existing = await Product.findOne({ slug: group.slug });

			if (existing) {
				if (!options.updateExisting) {
					result.skipped += 1;
					continue;
				}
				// Update: replace variants + patch fields provided in CSV
				existing.name = group.name;
				existing.category = group.category as any;
				if (categoryId) existing.categoryId = categoryId;
				if (group.fruit !== undefined) existing.fruit = group.fruit;
				existing.shortDescription = group.shortDescription;
				existing.description = group.description;
				if (group.images.length > 0) existing.images = group.images;
				if (group.ingredients.length > 0)
					existing.ingredients = group.ingredients;
				if (group.tags.length > 0) existing.tags = group.tags;
				if (group.storage !== undefined) existing.storage = group.storage;
				if (group.shelfLife !== undefined) existing.shelfLife = group.shelfLife;
				if (group.shippingInfo !== undefined)
					existing.shippingInfo = group.shippingInfo;
				existing.status = group.status;
				existing.isFeatured = group.isFeatured;
				existing.isBuildYourMixEligible = group.isBuildYourMixEligible;
				if (group.nutrition) existing.nutrition = group.nutrition;
				existing.packSizes = group.packSizes;
				await existing.save();

				result.updated += 1;
				result.products.push({
					name: existing.name,
					slug: existing.slug,
					id: String(existing._id),
					action: "updated",
				});
			} else {
				const created = await Product.create({
					name: group.name,
					slug: group.slug,
					category: group.category,
					categoryId,
					fruit: group.fruit,
					shortDescription: group.shortDescription,
					description: group.description,
					images: group.images,
					ingredients: group.ingredients,
					tags: group.tags,
					storage: group.storage,
					shelfLife: group.shelfLife,
					shippingInfo: group.shippingInfo,
					status: group.status,
					isFeatured: group.isFeatured,
					isBuildYourMixEligible: group.isBuildYourMixEligible,
					nutrition: group.nutrition,
					packSizes: group.packSizes,
				});

				result.created += 1;
				result.products.push({
					name: created.name,
					slug: created.slug,
					id: String(created._id),
					action: "created",
				});
			}
		} catch (err) {
			result.errors.push({
				row: group.firstRow,
				slug: group.slug,
				reason: (err as Error).message ?? "Insert/update failed",
			});
		}
	}

	result.categoriesCreated = Array.from(categoriesCreated);

	await recordAudit({
		actorId: options.actorId,
		action: "products.import",
		entity: "Product",
		after: {
			created: result.created,
			updated: result.updated,
			skipped: result.skipped,
			errors: result.errors.length,
			autoCreateCategories: options.autoCreateCategories ?? false,
		},
	});

	return result;
}

// ── helpers ─────────────────────────────────────────────

function splitPipe(input?: string): string[] {
	if (!input) return [];
	return input
		.split("|")
		.map((s) => s.trim())
		.filter(Boolean);
}

function parseBool(input?: string): boolean {
	if (!input) return false;
	return /^(1|true|yes|y)$/i.test(input.trim());
}

function normalizeStatus(
	input: string | undefined,
	fallback: "draft" | "published" | "archived",
): "draft" | "published" | "archived" {
	if (!input) return fallback;
	const s = input.trim().toLowerCase();
	if (s === "draft" || s === "published" || s === "archived") return s;
	return fallback;
}

function titleCase(s: string): string {
	return s
		.split(/[\s_-]+/)
		.map((w) => w.charAt(0).toUpperCase() + w.slice(1).toLowerCase())
		.join(" ");
}

function parseNutrition(row: Record<string, string>) {
	const fields = [
		"calories",
		"protein",
		"carbs",
		"sugar",
		"fibre",
		"fat",
	] as const;
	const hasAny = fields.some((f) => row[f] !== undefined && row[f] !== "");
	if (!hasAny) return undefined;

	const n: Record<string, number> = {};
	for (const f of fields) {
		const raw = row[f];
		if (raw === undefined || raw === "") continue;
		const val = Number(raw);
		if (Number.isFinite(val) && val >= 0) n[f] = val;
	}
	return {
		calories: n.calories ?? 0,
		protein: n.protein ?? 0,
		carbs: n.carbs ?? 0,
		sugar: n.sugar ?? 0,
		fibre: n.fibre ?? 0,
		fat: n.fat ?? 0,
	};
}
