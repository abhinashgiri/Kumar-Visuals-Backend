// src/routes/adminUser.routes.js
import express from "express";
import {
  adminGetUsers,
  adminGetUserById,
  adminToggleUserRole,
  adminDeleteUser,
  adminExtendMembership,
  adminLockControl,
  adminCreateUser,
  adminToggleBan,
  adminUpdateUser
} from "../controllers/userController.js";

const router = express.Router();

// /api/admin/users
router.get("/", adminGetUsers);
router.post("/", adminCreateUser);
router.patch("/:id", adminUpdateUser);
router.get("/:id", adminGetUserById);
router.put("/:id/roles", adminToggleUserRole);
router.delete("/:id", adminDeleteUser);
router.patch("/:id/extend-membership", adminExtendMembership);
router.patch("/:id/lock-toggle", adminLockControl);
router.put("/:id/ban-toggle/", adminToggleBan);




export default router;
