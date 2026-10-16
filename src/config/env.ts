import dotenv from "dotenv";
import path from "path";

dotenv.config({ path: path.resolve(process.cwd(), ".env") });

const storefrontUrl = process.env.STOREFRONT_URL ?? "http://localhost:3000";

function required(key: string): string {
	const value = process.env[key];
	if (!value || value.trim() === "") {
		throw new Error(`Missing required environment variable: ${key}`);
	}
	return value;
}

function optional(key: string, fallback = ""): string {
	return process.env[key] ?? fallback;
}

function optionalNumber(key: string, fallback: number): number {
	const raw = process.env[key];
	if (!raw) return fallback;
	const parsed = Number(raw);
	return Number.isFinite(parsed) ? parsed : fallback;
}

export const env = {
	nodeEnv: optional("NODE_ENV", "development"),
	isProduction: optional("NODE_ENV", "development") === "production",
	isDevelopment: optional("NODE_ENV", "development") === "development",
	port: optionalNumber("PORT", 4000),
	apiPrefix: optional("API_PREFIX", "/api/v1"),

	mongoUri: required("MONGODB_URI"),

	jwt: {
		secret: required("JWT_SECRET"),
		refreshSecret: required("JWT_REFRESH_SECRET"),
		accessExpiresIn: optional("JWT_ACCESS_EXPIRES_IN", "15m"),
		refreshExpiresIn: optional("JWT_REFRESH_EXPIRES_IN", "7d"),
	},

	bcryptRounds: optionalNumber("BCRYPT_ROUNDS", 12),

	allowedOrigins: optional("ALLOWED_ORIGINS", "http://localhost:3000")
		.split(",")
		.map((o) => o.trim())
		.filter(Boolean),

	resend: {
		apiKey: optional("RESEND_API_KEY"),
		fromEmail: optional("RESEND_FROM_EMAIL", "hello@nutrifriz.com"),
		fromName: optional("RESEND_FROM_NAME", "Nutrifriz"),
	},

	// Remove paystack block, add:

	flutterwave: {
		publicKey: optional("FLUTTERWAVE_PUBLIC_KEY"),
		secretKey: optional("FLUTTERWAVE_SECRET_KEY"),
		encryptionKey: optional("FLUTTERWAVE_ENCRYPTION_KEY"),
		webhookSecretHash: optional("FLUTTERWAVE_WEBHOOK_HASH"),
		baseUrl: optional("FLUTTERWAVE_BASE_URL", "https://api.flutterwave.com/v3"),
		redirectUrl: optional(
			"FLUTTERWAVE_REDIRECT_URL",
			`${storefrontUrl}/checkout/verify`,
		),
	},

	storefrontUrl,

	cloudinary: {
		cloudName: optional("CLOUDINARY_CLOUD_NAME"),
		apiKey: optional("CLOUDINARY_API_KEY"),
		apiSecret: optional("CLOUDINARY_API_SECRET"),
	},

	email: {
		from: optional("EMAIL_FROM", "hello@nutrifriz.com"),
		apiKey: optional("EMAIL_API_KEY"),
	},

	rateLimit: {
		windowMs: optionalNumber("RATE_LIMIT_WINDOW_MS", 60_000),
		max: optionalNumber("RATE_LIMIT_MAX", 120),
		authMax: optionalNumber("AUTH_RATE_LIMIT_MAX", 10),
	},
} as const;

export type Env = typeof env;
