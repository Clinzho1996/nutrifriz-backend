import { connectDatabase, disconnectDatabase } from "../config/db";
import { logger } from "../config/logger";
import { User } from "../models/User";

async function run() {
	await connectDatabase();

	const oldEmail = "admin@nutrifriz.com";
	const newEmail = "nutrifriz@gmail.com";

	const existing = await User.findOne({ email: newEmail });
	if (existing) {
		logger.info(
			{ email: newEmail },
			"Admin with new email already exists — nothing to do",
		);
		await disconnectDatabase();
		process.exit(0);
	}

	const result = await User.updateOne(
		{ email: oldEmail },
		{ $set: { email: newEmail } },
	);

	logger.info(
		{ matched: result.matchedCount, modified: result.modifiedCount },
		"Admin email updated",
	);

	await disconnectDatabase();
	process.exit(0);
}

run().catch((err) => {
	logger.error({ err }, "Update failed");
	process.exit(1);
});
