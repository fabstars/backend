const express = require("express");
const router = express.Router();

const {
  requireSignin,
  isAuth,
  isInfluencer,
  isCustomer,
} = require("../controllers/auth");

const {
  userById,
  read,
  update,
  purchaseHistory,
  addInfluencerProducts,
  fetchInfluencerProducts,
} = require("../controllers/user");

// User information
router.get("/user/:userId", requireSignin, isAuth, read);

// Purchase history of customer
router.get(
  "/orders/by/user/:userId",
  requireSignin,
  isAuth,
  isCustomer,
  purchaseHistory
);

// Influencer products added to his shop
router.get(
  "/user/influencer/:userId/my-products",
  requireSignin,
  isAuth,
  isInfluencer,
  fetchInfluencerProducts
);

// Updating user information
router.put("/user/:userId", requireSignin, isAuth, update);

// Adding products to influencer's shop
router.post(
  "/user/influencer/:userId/add-product",
  requireSignin,
  isAuth,
  isInfluencer,
  addInfluencerProducts
);

router.param("userId", userById);

module.exports = router;
