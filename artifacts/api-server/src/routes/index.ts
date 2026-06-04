import { Router, type IRouter } from "express";
import healthRouter from "./health";
import chatRouter from "./chat";
import cartographerRouter from "./cartographer";
import subscriptionRouter from "./subscription";

const router: IRouter = Router();

router.use(healthRouter);
router.use(subscriptionRouter);
router.use(chatRouter);
router.use(cartographerRouter);

export default router;
