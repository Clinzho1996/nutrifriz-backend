import { Button, Column, Heading, Hr, Row, Section, Text } from "react-email";
import { formatNaira } from "../../utils/format";
import { BaseLayout } from "../base-layout";

interface OrderItem {
	name: string;
	qty: number;
	unitPrice: number;
}

interface OrderConfirmationProps {
	orderNumber: string;
	customerName: string;
	items: OrderItem[];
	subtotal: number;
	shippingFee: number;
	total: number;
	shippingAddress: {
		street: string;
		city: string;
		state: string;
	};
}

export function OrderConfirmationEmail({
	orderNumber,
	customerName,
	items,
	subtotal,
	shippingFee,
	total,
	shippingAddress,
}: OrderConfirmationProps) {
	return (
		<BaseLayout preview={`Order ${orderNumber} confirmed`}>
			<Section style={styles.content}>
				<Heading style={styles.heading}>Order confirmed</Heading>
				<Text style={styles.paragraph}>Hi {customerName},</Text>
				<Text style={styles.paragraph}>
					Thanks for your order. We&apos;ve received it and will send you a
					shipping update soon.
				</Text>

				<Text style={styles.orderNumber}>
					Order <strong>{orderNumber}</strong>
				</Text>

				{/* Items table */}
				<Hr style={styles.hr} />
				{items.map((item, i) => (
					<Row key={i} style={styles.row}>
						<Column style={styles.colName}>
							<Text style={styles.itemName}>
								{item.name} × {item.qty}
							</Text>
						</Column>
						<Column style={styles.colPrice}>
							<Text style={styles.itemPrice}>
								{formatNaira(item.unitPrice * item.qty)}
							</Text>
						</Column>
					</Row>
				))}
				<Hr style={styles.hr} />

				{/* Totals */}
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

				<Hr style={styles.hr} />

				{/* Shipping address */}
				<Text style={styles.sectionTitle}>Shipping to</Text>
				<Text style={styles.paragraph}>
					{shippingAddress.street}
					<br />
					{shippingAddress.city}, {shippingAddress.state}
				</Text>

				<Section style={styles.cta}>
					<Button
						href="https://nutrifriz.com/account/orders"
						style={styles.button}>
						View my orders
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
		fontSize: "24px",
		fontWeight: "600",
		margin: "0 0 20px",
	},
	paragraph: {
		color: "#4A514A",
		fontSize: "15px",
		lineHeight: "1.6",
		margin: "0 0 12px",
	},
	orderNumber: { color: "#1A1F1A", fontSize: "15px", margin: "24px 0 12px" },
	hr: { borderColor: "#F1EADB", margin: "20px 0" },
	row: { marginBottom: "8px" },
	colName: { width: "70%" },
	colPrice: { width: "30%", textAlign: "right" as const },
	itemName: { color: "#1A1F1A", fontSize: "14px", margin: 0 },
	itemPrice: {
		color: "#1A1F1A",
		fontSize: "14px",
		margin: 0,
		textAlign: "right" as const,
	},
	label: { color: "#6B726B", fontSize: "14px", margin: 0 },
	value: {
		color: "#1A1F1A",
		fontSize: "14px",
		margin: 0,
		textAlign: "right" as const,
	},
	totalLabel: {
		color: "#1A1F1A",
		fontSize: "16px",
		fontWeight: "600",
		margin: 0,
	},
	totalValue: {
		color: "#1A1F1A",
		fontSize: "16px",
		fontWeight: "600",
		margin: 0,
		textAlign: "right" as const,
	},
	sectionTitle: {
		color: "#6B726B",
		fontSize: "12px",
		textTransform: "uppercase" as const,
		letterSpacing: "0.5px",
		margin: "0 0 8px",
	},
	cta: { textAlign: "center" as const, marginTop: "32px" },
	button: {
		backgroundColor: "#3B7734",
		borderRadius: "999px",
		color: "#ffffff",
		display: "inline-block",
		fontSize: "15px",
		fontWeight: "500",
		padding: "14px 32px",
		textDecoration: "none",
	},
};
