import * as React from "react";
import {
	Body,
	Container,
	Head,
	Html,
	Preview,
	Section,
	Text,
} from "react-email";

interface BaseLayoutProps {
	preview: string;
	children: React.ReactNode;
}

export function BaseLayout({ preview, children }: BaseLayoutProps) {
	return (
		<Html>
			<Head />
			<Preview>{preview}</Preview>
			<Body style={styles.body}>
				<Container style={styles.container}>
					{/* Brand header */}
					<Section style={styles.header}>
						<Text style={styles.logo}>Nutrifriz</Text>
						<Text style={styles.tagline}>Freshness. Perfectly Preserved.</Text>
					</Section>

					{/* Content */}
					{children}

					{/* Footer */}
					<Section style={styles.footer}>
						<Text style={styles.footerText}>
							© {new Date().getFullYear()} Nutrifriz Limited. All rights
							reserved.
						</Text>
						<Text style={styles.footerText}>
							Lagos, Nigeria · hello@nutrifriz.com
						</Text>
					</Section>
				</Container>
			</Body>
		</Html>
	);
}

const styles = {
	body: {
		backgroundColor: "#FBF8F1",
		fontFamily: "Inter, -apple-system, sans-serif",
		margin: 0,
		padding: 0,
	},
	container: {
		backgroundColor: "#ffffff",
		borderRadius: "12px",
		margin: "40px auto",
		maxWidth: "560px",
		overflow: "hidden",
	},
	header: {
		backgroundColor: "#3B7734",
		padding: "32px 40px",
	},
	logo: {
		color: "#ffffff",
		fontSize: "24px",
		fontWeight: "600",
		margin: 0,
	},
	tagline: {
		color: "rgba(255,255,255,0.75)",
		fontSize: "13px",
		margin: "4px 0 0",
	},
	footer: {
		borderTop: "1px solid #F1EADB",
		padding: "24px 40px",
	},
	footerText: {
		color: "#6B726B",
		fontSize: "12px",
		margin: "4px 0",
		textAlign: "center" as const,
	},
};
