const express = require("express");
const router = express.Router();

const {
  requireSignin,
  isAuth,
  isAdmin,
  isCustomer,
} = require("../controllers/auth");
const { userById, addOrderToUserHistory } = require("../controllers/user");
const {
  create,
  listOrders,
  getStatusValues,
  orderById,
  updateOrderStatus,
  createOrderCashfree,
} = require("../controllers/order");
const { decreaseQuantity } = require("../controllers/product");

// Buying a product by the customer
router.post(
  "/order/create/:slug",
  addOrderToUserHistory,
  decreaseQuantity,
  create
);

router.post(
  "/order/cashfree/create/:userId",
  requireSignin,
  isAuth,
  addOrderToUserHistory,
  decreaseQuantity,
  isCustomer,
  createOrderCashfree
);

// Fetching all orders by a user
router.get("/order/list/:userId", requireSignin, isAuth, isAdmin, listOrders);

// Getting order status for a user by the admin
router.get(
  "/order/status-values/:userId",
  requireSignin,
  isAuth,
  isAdmin,
  getStatusValues
);

// Updating order status by the admin for a user
router.put(
  "/order/:orderId/status/:userId",
  requireSignin,
  isAuth,
  isAdmin,
  updateOrderStatus
);

router.param("userId", userById);
router.param("orderId", orderById);

module.exports = router;
