import { Button, Column, Heading, Hr, Row, Section, Text } from "react-email";
import { formatNaira } from "../../utils/format";
import { BaseLayout } from "../base-layout";

interface Props {
	orderNumber: string;
	customerName: string;
	customerEmail: string;
	customerPhone: string;
	items: { name: string; qty: number; unitPrice: number }[];
	subtotal: number;
	shippingFee: number;
	total: number;
	paymentMethod: "paystack" | "bank_transfer" | "manual";
	paymentStatus: "paid" | "pending";
	fulfilmentMethod: "delivery" | "pickup";
	shippingAddress?: string;
	pickupNote?: string;
	orderAdminUrl: string;
}

export function AdminNewOrderEmail({
	orderNumber,
	customerName,
	customerEmail,
	customerPhone,
	items,
	subtotal,
	shippingFee,
	total,
	paymentMethod,
	paymentStatus,
	fulfilmentMethod,
	shippingAddress,
	pickupNote,
	orderAdminUrl,
}: Props) {
	const methodLabel =
		paymentMethod === "paystack"
			? "Paystack (card / USSD / bank)"
			: paymentMethod === "bank_transfer"
				? "Bank transfer (Opay)"
				: "Manual";

	return (
		<BaseLayout preview={`New order ${orderNumber} — ${formatNaira(total)}`}>
			<Section style={styles.content}>
				<Heading style={styles.heading}>
					{paymentStatus === "paid"
						? "Paid order received"
						: "New order received"}
				</Heading>

				<Text style={styles.paragraph}>
					A new order was placed on Nutrifriz.
				</Text>

				<Section style={styles.summary}>
					<Text style={styles.label}>Order</Text>
					<Text style={styles.value}>{orderNumber}</Text>

					<Hr style={styles.hr} />

					<Text style={styles.label}>Customer</Text>
					<Text style={styles.value}>{customerName}</Text>
					<Text style={styles.small}>{customerEmail}</Text>
					<Text style={styles.small}>{customerPhone}</Text>

					<Hr style={styles.hr} />

					<Text style={styles.label}>Payment</Text>
					<Text style={styles.value}>{methodLabel}</Text>
					<Text style={styles.small}>
						Status: {paymentStatus === "paid" ? "Paid" : "Awaiting payment"}
					</Text>

					<Hr style={styles.hr} />

					<Text style={styles.label}>Fulfilment</Text>
					<Text style={styles.value}>
						{fulfilmentMethod === "pickup"
							? "Pickup — Ojodu Berger"
							: "Delivery"}
					</Text>
					{shippingAddress && (
						<Text style={styles.small}>{shippingAddress}</Text>
					)}
					{pickupNote && <Text style={styles.small}>Note: {pickupNote}</Text>}
				</Section>

				{/* Items */}
				<Hr style={styles.hr} />
				<Text style={styles.label}>Items</Text>
				{items.map((item, i) => (
					<Row key={i} style={styles.row}>
						<Column style={{ width: "70%" }}>
							<Text style={styles.itemName}>
								{item.name} × {item.qty}
							</Text>
						</Column>
						<Column style={{ width: "30%", textAlign: "right" }}>
							<Text style={styles.itemPrice}>
								{formatNaira(item.unitPrice * item.qty)}
							</Text>
						</Column>
					</Row>
				))}
				<Hr style={styles.hr} />

				<Row style={styles.row}>
					<Column>
						<Text style={styles.label}>Subtotal</Text>
					</Column>
					<Column>
						<Text style={styles.value}>{formatNaira(subtotal)}</Text>
					</Column>
				</Row>
				<Row style={styles.row}>
					<Column>
						<Text style={styles.label}>Shipping</Text>
					</Column>
					<Column>
						<Text style={styles.value}>{formatNaira(shippingFee)}</Text>
					</Column>
				</Row>
				<Row style={styles.row}>
					<Column>
						<Text style={styles.totalLabel}>Total</Text>
					</Column>
					<Column>
						<Text style={styles.totalValue}>{formatNaira(total)}</Text>
					</Column>
				</Row>

				<Section style={styles.cta}>
					<Button href={orderAdminUrl} style={styles.button}>
						Open in admin
					</Button>
				</Section>
			</Section>
		</BaseLayout>
	);
}

const styles = {
	content: { padding: "40px" },
	heading: {
		color: "#1A1F1A",
		fontSize: "22px",
		fontWeight: "600",
		margin: "0 0 16px",
	},
	paragraph: {
		color: "#4A514A",
		fontSize: "15px",
		lineHeight: "1.6",
		margin: "0 0 16px",
	},
	summary: {
		background: "#FBF8F1",
		borderRadius: "8px",
		padding: "16px",
		margin: "16px 0",
	},
	label: {
		color: "#6B726B",
		fontSize: "12px",
		textTransform: "uppercase" as const,
		letterSpacing: "0.5px",
		margin: "8px 0 2px",
	},
	value: {
		color: "#1A1F1A",
		fontSize: "14px",
		fontWeight: "500" as const,
		margin: "0 0 2px",
	},
	small: { color: "#6B726B", fontSize: "12px", margin: "0 0 2px" },
	hr: { borderColor: "#E5DDCB", margin: "12px 0" },
	row: { marginBottom: "6px" },
	itemName: { color: "#1A1F1A", fontSize: "13px", margin: 0 },
	itemPrice: { color: "#1A1F1A", fontSize: "13px", margin: 0 },
	totalLabel: {
		color: "#1A1F1A",
		fontSize: "15px",
		fontWeight: "600" as const,
		margin: 0,
	},
	totalValue: {
		color: "#1A1F1A",
		fontSize: "15px",
		fontWeight: "600" as const,
		textAlign: "right" as const,
		margin: 0,
	},
	cta: { textAlign: "center" as const, marginTop: "24px" },
	button: {
		backgroundColor: "#3B7734",
		borderRadius: "999px",
		color: "#ffffff",
		display: "inline-block",
		fontSize: "14px",
		fontWeight: "500" as const,
		padding: "12px 28px",
		textDecoration: "none",
	},
};
