import { Router, type IRouter } from "express";
import healthRouter from "./health.js";
import authRouter from "./auth.js";
import ticketsRouter from "./tickets.js";
import companyRouter from "./company.js";

const router: IRouter = Router();

router.use(healthRouter);
router.use("/auth", authRouter);
router.use("/tickets", ticketsRouter);
router.use("/company", companyRouter);

export default router;
