import { Router, type IRouter } from "express";
import healthRouter from "./health";
import classiqueRouter from "./classique";

const router: IRouter = Router();

router.use(healthRouter);
router.use(classiqueRouter);

export default router;
