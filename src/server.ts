import http from "http";
import { createApp } from "./app";
import { env } from "./config/env";
import { logger } from "./config/logger";
import { connectDatabase, disconnectDatabase } from "./config/db";

async function bootstrap(): Promise<void> {
	await connectDatabase();

	const app = createApp();
	const server = http.createServer(app);

	server.listen(env.port, () => {
		logger.info(
			{ port: env.port, env: env.nodeEnv },
			`Nutrifriz API listening on http://localhost:${env.port}${env.apiPrefix}`,
		);
	});

	const shutdown = async (signal: string) => {
		logger.info({ signal }, "Shutting down gracefully");
		server.close(async () => {
			await disconnectDatabase();
			logger.info("Shutdown complete");
			process.exit(0);
		});
		setTimeout(() => {
			logger.error("Forced shutdown after timeout");
			process.exit(1);
		}, 15_000).unref();
	};

	process.on("SIGINT", () => void shutdown("SIGINT"));
	process.on("SIGTERM", () => void shutdown("SIGTERM"));
	process.on("unhandledRejection", (reason) => {
		logger.error({ reason }, "Unhandled promise rejection");
	});
	process.on("uncaughtException", (err) => {
		logger.error({ err }, "Uncaught exception");
		process.exit(1);
	});
}

bootstrap().catch((err) => {
	// eslint-disable-next-line no-console
	console.error("Fatal bootstrap error", err);
	process.exit(1);
});
