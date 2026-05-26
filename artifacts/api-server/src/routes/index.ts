import { Router, type IRouter } from "express";
import healthRouter from "./health.js";
import chatRouter from "./chat.js";
import cartographerRouter from "./cartographer.js";
import authRouter from "./auth.js";
import billingRouter from "./billing.js";
import syncRouter from "./sync.js";

const router: IRouter = Router();

router.use(healthRouter);
router.use(authRouter);
router.use(billingRouter);
router.use(syncRouter);
router.use(chatRouter);
router.use(cartographerRouter);

export default router;
