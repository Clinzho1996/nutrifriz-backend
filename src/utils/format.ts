export function formatNaira(
	amount: number,
	opts: { compact?: boolean; decimals?: boolean } = {},
) {
	if (opts.compact && amount >= 1_000_000) {
		return `₦${(amount / 1_000_000).toFixed(1)}M`;
	}
	if (opts.compact && amount >= 1_000) {
		return `₦${(amount / 1_000).toFixed(1)}k`;
	}
	return new Intl.NumberFormat("en-NG", {
		style: "currency",
		currency: "NGN",
		minimumFractionDigits: opts.decimals ? 2 : 0,
		maximumFractionDigits: opts.decimals ? 2 : 0,
	}).format(amount);
}
