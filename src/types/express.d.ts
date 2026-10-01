import { AuthedUser } from "./index";

declare global {
	namespace Express {
		interface Request {
			user?: AuthedUser;
			requestId?: string;
		}
	}
}

export {};
