import { Model } from "mongoose";

export async function nextOrderNumber(
	model: Model<any>,
	prefix = "NFZ",
): Promise<string> {
	const year = new Date().getFullYear();
	const pattern = new RegExp(`^${prefix}-${year}-`);
	const count = await model.countDocuments({ orderNumber: pattern });
	const seq = String(count + 1).padStart(4, "0");
	return `${prefix}-${year}-${seq}`;
}
