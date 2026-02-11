import express from "express";
import { getAboutPage, saveAboutPage } from "../controllers/aboutPageController.js";

const router = express.Router();

router.get("/", getAboutPage);
router.put("/", saveAboutPage);

export default router;
