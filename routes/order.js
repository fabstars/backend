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
  viewOrder,
  createOrderCod,
  cancelOrder
} = require("../controllers/order");
const { decreaseQuantity } = require("../controllers/product");

// // Buying a product by the customer
// router.post(
//   "/order/create/:slug",
//   addOrderToUserHistory,
//   isCustomer,
//   create
// );

router.post("/order/cashfree/create/:slug", createOrderCashfree);

router.post("/order/cod/create/:slug", createOrderCod);

router.get("/order/cashfree/:order_id", viewOrder);

router.post("/order/cancel", cancelOrder);

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
