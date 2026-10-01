import jwt, { SignOptions } from "jsonwebtoken";
import { env } from "../config/env";
import { JwtPayload, Role } from "../types";

export function signAccessToken(payload: {
	sub: string;
	email: string;
	role: Role;
}): string {
	return jwt.sign(payload, env.jwt.secret, {
		expiresIn: env.jwt.accessExpiresIn,
	} as SignOptions);
}

export function signRefreshToken(payload: {
	sub: string;
	email: string;
	role: Role;
}): string {
	return jwt.sign(payload, env.jwt.refreshSecret, {
		expiresIn: env.jwt.refreshExpiresIn,
	} as SignOptions);
}

export function verifyAccessToken(token: string): JwtPayload {
	return jwt.verify(token, env.jwt.secret) as JwtPayload;
}

export function verifyRefreshToken(token: string): JwtPayload {
	return jwt.verify(token, env.jwt.refreshSecret) as JwtPayload;
}
