import pino from "pino";
import { env } from "./env";

export const logger = pino({
	level: env.isProduction ? "info" : "debug",
	base: { service: "nutrifriz-api" },
	timestamp: pino.stdTimeFunctions.isoTime,
	transport: env.isProduction
		? undefined
		: {
				target: "pino-pretty",
				options: {
					colorize: true,
					translateTime: "SYS:standard",
					ignore: "pid,hostname,service",
				},
			},
});

export type Logger = typeof logger;
