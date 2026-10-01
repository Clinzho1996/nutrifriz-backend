import rateLimit from "express-rate-limit";
import { env } from "../config/env";

export const globalLimiter = rateLimit({
	windowMs: env.rateLimit.windowMs,
	max: env.rateLimit.max,
	standardHeaders: true,
	legacyHeaders: false,
	message: {
		success: false,
		message: "Too many requests, please try again later.",
	},
});

export const authLimiter = rateLimit({
	windowMs: env.rateLimit.windowMs,
	max: env.rateLimit.authMax,
	standardHeaders: true,
	legacyHeaders: false,
	message: {
		success: false,
		message: "Too many auth attempts, please try again later.",
	},
});
