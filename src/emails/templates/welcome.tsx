import { Button, Heading, Section, Text } from "react-email";
import { BaseLayout } from "../base-layout";

interface WelcomeProps {
	firstName: string;
}

export function WelcomeEmail({ firstName }: WelcomeProps) {
	return (
		<BaseLayout preview="Welcome to Nutrifriz">
			<Section style={styles.content}>
				<Heading style={styles.heading}>Welcome to Nutrifriz</Heading>
				<Text style={styles.paragraph}>Hi {firstName},</Text>
				<Text style={styles.paragraph}>
					You&apos;re in. Thanks for joining the circle of people who care about
					real food, real flavour, and less waste.
				</Text>
				<Text style={styles.paragraph}>Here&apos;s what you can do next:</Text>
				<Text style={styles.listItem}>
					• Browse our freeze-dried fruit range
				</Text>
				<Text style={styles.listItem}>• Build your own custom mix</Text>
				<Text style={styles.listItem}>• Explore curated collections</Text>

				<Section style={styles.cta}>
					<Button href="https://nutrifriz.com/shop" style={styles.button}>
						Start shopping
					</Button>
				</Section>

				<Text style={styles.small}>
					Here&apos;s to the crunch,
					<br />— The Nutrifriz team
				</Text>
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
	listItem: {
		color: "#4A514A",
		fontSize: "15px",
		lineHeight: "1.8",
		margin: "0 0 4px",
	},
	cta: { textAlign: "center" as const, margin: "32px 0" },
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
	small: { color: "#6B726B", fontSize: "14px", marginTop: "24px" },
};
