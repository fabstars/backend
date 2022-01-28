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
  deleteInfluencerProduct,
  getUserById
} = require("../controllers/user");

// User by id
router.get("/user/by/:userId/", getUserById)

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
router.get("/user/influencer/:userId/my-products", fetchInfluencerProducts);

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

// Deleting products from influencer's shop
router.post(
  "/user/influencer/:userId/delete-product",
  requireSignin,
  isAuth,
  isInfluencer,
  deleteInfluencerProduct
);

router.param("userId", userById);

module.exports = router;
