import { Button, Heading, Section, Text } from "react-email";
import { BaseLayout } from "../base-layout";

interface PasswordResetProps {
	firstName: string;
	resetUrl: string;
	expiresInMinutes: number;
}

export function PasswordResetEmail({
	firstName,
	resetUrl,
	expiresInMinutes,
}: PasswordResetProps) {
	return (
		<BaseLayout preview="Reset your Nutrifriz password">
			<Section style={styles.content}>
				<Heading style={styles.heading}>Reset your password</Heading>
				<Text style={styles.paragraph}>Hi {firstName},</Text>
				<Text style={styles.paragraph}>
					We received a request to reset the password for your Nutrifriz
					account. If you didn&apos;t make this request, you can safely ignore
					this email.
				</Text>

				<Section style={styles.cta}>
					<Button href={resetUrl} style={styles.button}>
						Reset password
					</Button>
				</Section>

				<Text style={styles.small}>
					This link expires in {expiresInMinutes} minutes. If the button
					doesn&apos;t work, copy and paste this URL into your browser:
				</Text>
				<Text style={styles.url}>{resetUrl}</Text>
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
	small: { color: "#6B726B", fontSize: "13px", marginTop: "24px" },
	url: {
		color: "#3B7734",
		fontSize: "12px",
		wordBreak: "break-all" as const,
		marginTop: "8px",
	},
};
