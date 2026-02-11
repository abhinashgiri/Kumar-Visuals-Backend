import express from "express";
import {
  adminGetMe,
  adminUpdateMe,
  adminChangeMyPassword,
} from "../controllers/adminController.js";

const router = express.Router();


// api/admin/*

router.get("/me", adminGetMe);
router.put("/me", adminUpdateMe);
router.put("/me/password", adminChangeMyPassword);

export default router;
