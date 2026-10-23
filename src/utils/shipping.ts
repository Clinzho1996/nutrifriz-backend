export const SHIPPING_RATES = {
	LAGOS: 5000,
	OUTSIDE_LAGOS: 8000,
	PICKUP: 0,
} as const;

export type FulfilmentMethod = "delivery" | "pickup";

export const PICKUP_LOCATION = {
	name: "Ojodu Berger",
	address: "Ojodu Berger, Lagos, Nigeria",
	note: "Pickup is free. Customers arrange their own dispatch from our Ojodu Berger location.",
};

/**
 * Compute the shipping fee based on the chosen fulfilment method and
 * (if delivery) the delivery state.
 */
export function computeShippingFee(params: {
	method: FulfilmentMethod;
	state?: string;
}): number {
	if (params.method === "pickup") return SHIPPING_RATES.PICKUP;

	const normalized = (params.state ?? "").trim().toLowerCase();
	if (normalized === "lagos" || normalized === "lagos state") {
		return SHIPPING_RATES.LAGOS;
	}
	return SHIPPING_RATES.OUTSIDE_LAGOS;
}
