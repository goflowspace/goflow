import { Request, Response } from "express";
import { asyncHandler } from "@middlewares/errorHandler";
import * as salesService from "./sales.service";
import { User } from "@prisma/client";

export const contactSales = asyncHandler(async (req: Request, res: Response) => {
    const user = req.user as User & { id: string };
    const { source, teamId } = req.body;
    
    await salesService.sendSalesRequest(user.id, source || 'unknown', teamId);

    res.json({
        success: true,
        message: "Sales request sent successfully"
    });
});
