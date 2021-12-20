const express = require("express");
const router = express.Router();

const { requireSignin, isAuth, isInfluencer } = require("../controllers/auth");

const {
  userById,
  read,
  update,
  purchaseHistory,
  addInfluencerProducts,
  fetchInfluencerProducts,
} = require("../controllers/user");

router.get("/user/:userId", requireSignin, isAuth, read);
router.get("/orders/by/user/:userId", requireSignin, isAuth, purchaseHistory);
router.get(
  "/user/influencer/:userId/my-products",
  requireSignin,
  isAuth,
  isInfluencer,
  fetchInfluencerProducts
);

router.put("/user/:userId", requireSignin, isAuth, update);

router.post(
  "/user/influencer/:userId/add-product",
  requireSignin,
  isAuth,
  isInfluencer,
  addInfluencerProducts
);

router.param("userId", userById);

module.exports = router;
