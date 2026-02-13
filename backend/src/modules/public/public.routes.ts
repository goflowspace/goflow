import {Router} from "express";
import {configController, healthController, mongoHealthController} from "./public.controller";

const router = Router();

router.get("/config", configController);
router.get("/health", healthController);
router.get("/mongo-health", mongoHealthController);

export default router;
