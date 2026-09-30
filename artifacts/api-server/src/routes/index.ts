import { Router, type IRouter } from "express";
import healthRouter from "./health";
import inquiriesRouter from "./inquiries";
import heroPhotosRouter from "./hero-photos";

const router: IRouter = Router();

router.use(healthRouter);
router.use(inquiriesRouter);
router.use(heroPhotosRouter);

export default router;
