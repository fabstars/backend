const express = require("express");
const router = express.Router();

const {
  create,
  productById,
  read,
  remove,
  update,
  list,
  listRelated,
  listCategories,
  listBySearch,
  photo,
  listSearch,
  updateInfluencerProduct,
} = require("../controllers/product");
const {
  requireSignin,
  isAuth,
  isAdmin,
  isInfluencer,
} = require("../controllers/auth");
const { userById } = require("../controllers/user");

// Product's information
router.get("/product/:productId", read);

// Creating product by the admin
router.post("/product/create/:userId", requireSignin, isAuth, isAdmin, create);

// Deleting product by admin
router.delete(
  "/product/:productId/:userId",
  requireSignin,
  isAuth,
  isAdmin,
  remove
);

// Updating product by admin
router.put(
  "/product/:productId/:userId",
  requireSignin,
  isAuth,
  isAdmin,
  update
);

// Updaing product by influencer
router.put(
  "/product/:productId/influencer/:userId",
  requireSignin,
  isAuth,
  isInfluencer,
  updateInfluencerProduct
);

// Fetch all products
router.get("/products", list);

// Search products
router.get("/products/search", listSearch);

// Fetch related products
router.get("/products/related/:productId", listRelated);

// Product by category
router.get("/products/categories", listCategories);

// Products by search
router.post("/products/by/search", listBySearch);

// Fetching product photo
router.get("/product/photo/:productId", photo);

router.param("userId", userById);
router.param("productId", productById);

module.exports = router;
