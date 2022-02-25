const mongoose = require("mongoose");
const Schema = mongoose.Schema;
const { ObjectId } = mongoose.Schema;

const CartItemSchema = new mongoose.Schema(
  {
    product: { type: ObjectId, ref: "Product" },
    name: String,
    price: Number,
    url: String,
    count: {
      type: Number,
      default: 1,
    },
  },
  { timestamps: true }
);

const CartItem = mongoose.model("CartItem", CartItemSchema);

const OrderSchema = new mongoose.Schema(
  {
    products: [CartItemSchema],
    transaction_id: {
      type: String,
      default: "",
    },
    amount: { type: Number },
    user: { type: ObjectId, ref: "Customer" },
  },
  { timestamps: true }
);

const Order = mongoose.model("Order", OrderSchema);

module.exports = { Order, CartItem };
