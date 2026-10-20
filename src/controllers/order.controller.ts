import { Request, Response } from "express";
import * as orderService from "../services/order.service";
import { created, ok, paginated } from "../utils/apiResponse";
import { asyncHandler } from "../utils/asyncHandler";

export const list = asyncHandler(async (req: Request, res: Response) => {
	const query = req.query as any;
	const result = await orderService.listOrders(query);
	return paginated(res, result);
});

export const getById = asyncHandler(async (req: Request, res: Response) => {
	const order = await orderService.getOrderById(req.params.id);
	return ok(res, order);
});

export const getByNumber = asyncHandler(async (req: Request, res: Response) => {
	const order = await orderService.getOrderByNumber(req.params.orderNumber);
	return ok(res, order);
});

export const getMyOrder = asyncHandler(async (req: Request, res: Response) => {
	const order = await orderService.getMyOrderById(
		String(req.user!._id),
		req.params.id,
	);
	return ok(res, order);
});

export const createManual = asyncHandler(
	async (req: Request, res: Response) => {
		const order = await orderService.createManualOrder(
			String(req.user!._id),
			req.body,
		);
		return created(res, order, "Manual order created");
	},
);

export const updateStatus = asyncHandler(
	async (req: Request, res: Response) => {
		const order = await orderService.updateOrderStatus(
			req.params.id,
			req.body.status,
			String(req.user!._id),
			req.body.note,
		);
		return ok(res, order, "Order status updated");
	},
);

export const updateFulfilment = asyncHandler(
	async (req: Request, res: Response) => {
		const order = await orderService.updateFulfilment(req.params.id, req.body);
		return ok(res, order, "Fulfilment updated");
	},
);

export const myOrders = asyncHandler(async (req: Request, res: Response) => {
	const result = await orderService.listOrders({
		page: 1,
		limit: 50,
		q: undefined,
	} as any);
	// filter to my orders
	const mine = result.items.filter(
		(o: any) => String(o.userId) === String(req.user!._id),
	);
	return ok(res, mine);
});

export const confirmPayment = asyncHandler(
	async (req: Request, res: Response) => {
		const { receiptNote, receiptProofUrl } = req.body;

		const order = await orderService.confirmBankTransfer(
			req.params.id,
			String(req.user!._id),
			{ receiptNote, receiptProofUrl },
		);

		return ok(res, order, "Payment confirmed — order is now paid");
	},
);
