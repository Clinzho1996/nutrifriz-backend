import express, { Application } from "express";
import helmet from "helmet";
import cors from "cors";
import compression from "compression";
import morgan from "morgan";
import { env } from "./config/env";
import { logger } from "./config/logger";
import { globalLimiter } from "./middleware/rateLimit";
import { errorHandler } from "./middleware/error";
import { notFound } from "./middleware/notFound";
import routes from "./routes";

export function createApp(): Application {
	const app = express();

	app.disable("x-powered-by");
	app.set("trust proxy", 1);

	app.use(helmet());
	app.use(
		cors({
			origin: (origin, cb) => {
				if (!origin) return cb(null, true); // mobile / server-to-server
				if (env.allowedOrigins.includes(origin)) return cb(null, true);
				return cb(new Error(`Origin not allowed: ${origin}`));
			},
			credentials: true,
		}),
	);
	app.use(compression());

	// Webhooks need raw bodies. Everything else gets JSON.
	app.use((req, res, next) => {
		if (req.originalUrl.startsWith(`${env.apiPrefix}/webhooks`)) return next();
		return express.json({ limit: "2mb" })(req, res, next);
	});
	app.use(express.urlencoded({ extended: true }));

	if (!env.isProduction) {
		app.use(morgan("dev"));
	} else {
		app.use(
			morgan("combined", {
				stream: { write: (msg) => logger.info(msg.trim()) },
			}),
		);
	}

	app.use(globalLimiter);
	app.use(env.apiPrefix, routes);

	app.get("/", (_req, res) => {
		res.json({
			name: "Nutrifriz API",
			version: "1.0.0",
			docs: `${env.apiPrefix}/health`,
		});
	});

	app.use(notFound);
	app.use(errorHandler);

	return app;
}
