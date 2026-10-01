import { Types } from "mongoose";
import { nanoid } from "nanoid";
import { CardSeries, ICardSeries } from "../models/CardSeries";
import { CrunchCard, ICrunchCard } from "../models/CrunchCard";
import { CrunchPassport } from "../models/CrunchPassport";
import { User } from "../models/User";
import { AppError } from "../utils/AppError";
import { recordAudit } from "./audit.service";
import {
	CreateSeriesInput,
	IssueCardsInput,
} from "../validators/card.validator";

export async function createSeries(
	input: CreateSeriesInput,
): Promise<ICardSeries> {
	const exists = await CardSeries.findOne({ code: input.code });
	if (exists) throw AppError.conflict("Series code already exists");
	return CardSeries.create(input);
}

export async function updateSeries(
	id: string,
	input: Partial<CreateSeriesInput>,
): Promise<ICardSeries> {
	const series = await CardSeries.findById(id);
	if (!series) throw AppError.notFound("Series not found");
	Object.assign(series, input);
	await series.save();
	return series;
}

export async function listSeries() {
	return CardSeries.find().sort({ createdAt: -1 }).lean();
}

export async function issueCards(
	seriesId: string,
	input: IssueCardsInput,
): Promise<ICrunchCard[]> {
	const series = await CardSeries.findById(seriesId);
	if (!series) throw AppError.notFound("Series not found");

	const existing = await CrunchCard.countDocuments({ seriesId });
	if (existing + input.count > series.totalCards * 10) {
		// soft guard
	}

	const cards: ICrunchCard[] = [];

	for (let i = 0; i < input.count; i++) {
		const numberInSeries = existing + i + 1;
		const fruit = input.fruits[i % input.fruits.length];
		const cardCode = `NFZ-${series.code}-${String(numberInSeries).padStart(4, "0")}-${nanoid(6).toUpperCase()}`;
		const fact = input.factTemplate.replace("{fruit}", fruit);

		const card = await CrunchCard.create({
			cardCode,
			seriesId: series._id,
			numberInSeries,
			fruit,
			fact,
			challenge: input.challenge,
			status: "issued",
		});
		cards.push(card);
	}

	await recordAudit({
		action: "cards.issue",
		entity: "CardSeries",
		entityId: String(series._id),
		after: { count: input.count },
	});

	return cards;
}

export async function listCards(query: {
	page: number;
	limit: number;
	seriesId?: string;
	status?: "issued" | "registered" | "retired";
	q?: string;
}) {
	const filter: Record<string, unknown> = {};
	if (query.seriesId) filter.seriesId = new Types.ObjectId(query.seriesId);
	if (query.status) filter.status = query.status;
	if (query.q) filter.cardCode = new RegExp(query.q, "i");

	const [items, total] = await Promise.all([
		CrunchCard.find(filter)
			.sort({ createdAt: -1 })
			.skip((query.page - 1) * query.limit)
			.limit(query.limit)
			.lean(),
		CrunchCard.countDocuments(filter),
	]);

	return {
		items,
		total,
		page: query.page,
		limit: query.limit,
		pages: Math.ceil(total / query.limit),
	};
}

export async function registerCard(userId: string, cardCode: string) {
	const card = await CrunchCard.findOne({ cardCode });
	if (!card) throw AppError.notFound("Card not found");

	if (card.status === "registered" && String(card.registeredBy) !== userId) {
		throw AppError.conflict("This card has already been registered");
	}

	if (card.status === "retired")
		throw AppError.badRequest("This card has been retired");

	card.status = "registered";
	card.registeredBy = new Types.ObjectId(userId);
	card.registeredAt = new Date();
	await card.save();

	// Upsert passport
	let passport = await CrunchPassport.findOne({
		userId,
		seriesId: card.seriesId,
	});
	if (!passport) {
		passport = await CrunchPassport.create({
			userId,
			seriesId: card.seriesId,
			cardIds: [card._id],
			points: 10,
		});
	} else if (!passport.cardIds.some((id) => String(id) === String(card._id))) {
		passport.cardIds.push(card._id);
		passport.points += 10;
		await passport.save();
	}

	await User.findByIdAndUpdate(userId, {
		$inc: { crunchPoints: 10 },
		$addToSet: { crunchCardIds: card._id },
	});

	await recordAudit({
		actorId: userId,
		action: "cards.register",
		entity: "CrunchCard",
		entityId: String(card._id),
	});

	return { card, passport };
}

export async function getPassport(userId: string, seriesId?: string) {
	const filter: Record<string, unknown> = {
		userId: new Types.ObjectId(userId),
	};
	if (seriesId) filter.seriesId = new Types.ObjectId(seriesId);

	return CrunchPassport.find(filter)
		.populate("seriesId", "code name totalCards")
		.populate("cardIds", "cardCode fruit numberInSeries fact")
		.lean();
}
