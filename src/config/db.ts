import mongoose from "mongoose";
import { env } from "./env";
import { logger } from "./logger";

mongoose.set("strictQuery", true);

export async function connectDatabase(): Promise<void> {
	if (mongoose.connection.readyState === 1) {
		logger.warn("MongoDB already connected");
		return;
	}

	try {
		await mongoose.connect(env.mongoUri, {
			autoIndex: !env.isProduction,
			serverSelectionTimeoutMS: 10_000,
			socketTimeoutMS: 45_000,
		});

		logger.info({ uri: maskUri(env.mongoUri) }, "MongoDB connected");

		mongoose.connection.on("error", (err) => {
			logger.error({ err }, "MongoDB connection error");
		});

		mongoose.connection.on("disconnected", () => {
			logger.warn("MongoDB disconnected");
		});

		mongoose.connection.on("reconnected", () => {
			logger.info("MongoDB reconnected");
		});
	} catch (err) {
		logger.error({ err }, "MongoDB initial connection failed");
		throw err;
	}
}

export async function disconnectDatabase(): Promise<void> {
	if (mongoose.connection.readyState === 0) return;
	await mongoose.disconnect();
	logger.info("MongoDB disconnected gracefully");
}

function maskUri(uri: string): string {
	return uri.replace(/\/\/([^:]+):([^@]+)@/, "//$1:****@");
}
