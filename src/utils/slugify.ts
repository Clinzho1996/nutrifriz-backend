import slugifyLib from "slugify";
import { Model } from "mongoose";

export function toSlug(input: string): string {
	return slugifyLib(input, { lower: true, strict: true, trim: true });
}

export async function uniqueSlug(
	model: Model<any>,
	base: string,
	excludeId?: string,
): Promise<string> {
	let slug = toSlug(base);
	let suffix = 1;

	// eslint-disable-next-line no-constant-condition
	while (true) {
		const query: Record<string, unknown> = { slug };
		if (excludeId) query._id = { $ne: excludeId };
		const existing = await model.findOne(query).select("_id").lean();
		if (!existing) return slug;
		slug = `${toSlug(base)}-${++suffix}`;
	}
}
