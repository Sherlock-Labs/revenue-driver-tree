import { Router } from "express";
import treeRoutes from "./trees.js";

const router = Router();

router.use("/trees", treeRoutes);

export default router;
