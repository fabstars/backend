const { Order, CartItem } = require("../models/order");
const { errorHandler } = require("../helpers/dbErrorHandler");
var crypto = require("crypto");
const { PaymentGateway } = require("@cashfreepayments/cashfree-sdk");
const formidable = require("formidable");
const axios = require("axios");
const User = require("../models/user");
const Customer = require("../models/customer");

exports.createOrderCashfree = async (req, res) => {
  const { creator, products, amount, cust_details } = req.body.order;

  const orderAmount = amount,
    orderCurrency = "INR",
    orderNote = cust_details.order_note,
    customerEmail = cust_details.email,
    customerName = cust_details.fullName,
    customerPhone = cust_details.mobileNumber;

  const cust_address = {
    address: cust_details.address,
    city: cust_details.city,
    state: cust_details.state,
    pincode: cust_details.pincode,
  };

  const cust = {
    name: customerName,
    email: customerEmail,
    cust_address: cust_address,
    mobile: customerPhone,
  };

  const c = await Customer.find({ email: customerEmail });

  var current_customer;

  if (c.length === 0) {
    current_customer = new Customer(cust);
  } else {
    current_customer = c[0];
    current_customer.name = cust.name;
    current_customer.cust_address = cust.cust_address;
    current_customer.mobile = cust.mobile;
  }

  await current_customer.save();

  const influencer = await User.findOne({ slug: creator });

  const customerId = current_customer._id;

  const myOrder = new Order({
    products: products,
    amount: orderAmount,
    user: customerId,
  });

  Date.prototype.addHours = function (h) {
    this.setHours(this.getHours() + h);
    return this;
  };

  const expiry = new Date().addHours(4).toISOString();

  const cashfree_options = {
    url:
      process.env.ENVIRONMENT === "DEV"
        ? process.env.DEV_CASHFREE_URL
        : process.env.PROD_CASHFREE_URL,
    appid:
      process.env.ENVIRONMENT === "DEV"
        ? process.env.DEV_CASHFREE_APPID
        : process.env.PROD_CASHFREE_APPID,
    clientsecret:
      process.env.ENVIRONMENT === "DEV"
        ? process.env.DEV_CASHFREE_SECRET_KEY
        : process.env.CASHFREE_SECRET_KEY,
    return_url:
      process.env.ENVIRONMENT === "DEV"
        ? process.env.DEV_RETURN_URL
        : process.env.PROD_RETURN_URL,
    notify_url:
      process.env.ENVIRONMENT === "DEV"
        ? process.env.DEV_NOTIFY_URL
        : process.env.PROD_NOTIFY_URL,
  };

  const { url, appid, clientsecret, return_url, notify_url } = cashfree_options;

  const current_order = await myOrder.save();
  const orderId = current_order._id;

  current_customer.history.push(orderId);

  await current_customer.save();

  console.log(influencer);

  console.log(
    orderAmount,
    orderCurrency,
    orderNote,
    customerEmail,
    customerName,
    customerPhone
  );

  console.log(current_customer);

  console.log(current_order);

  const options = {
    method: "POST",
    url: url,
    headers: {
      Accept: "application/json",
      "x-api-version": "2022-01-01",
      "Content-Type": "application/json",
      "x-client-id": appid,
      "x-client-secret": clientsecret,
    },
    data: {
      order_id: orderId,
      order_amount: orderAmount,
      order_currency: orderCurrency,
      customer_details: {
        customer_id: customerId,
        customer_email: customerEmail,
        customer_phone: customerPhone,
        // customer_bank_account_number: "1518121112",
        // customer_bank_ifsc: "CITI0000001",
        // customer_bank_code: 3333,
        customer_name: customerName,
      },
      order_meta: {
        return_url: return_url,
        notify_url: notify_url,
      },
      order_expiry_time: expiry,
      order_note: orderNote,
      order_tags: { influencerSlug: creator },
      // order_splits: [{ vendor_id: "1", amount: "2" }],
    },
  };

  axios
    .request(options)
    .then(function (response) {
      // Store the order_id, cf_order_id and address in the database
      current_order.transaction_id = response.data.cf_order_id;
      current_order.save((err, order) => {
        if (err) {
          console.log(err);
        } else {
          console.log(order);
        }
        res.json(response.data);
      });
    })
    .catch(function (error) {
      console.error(error);
      return res.status(400).json({
        error: "Something went wrong. Please try again",
        message: error.response.data.message,
      });
    });
};

exports.viewOrder = async (req, res) => {
  const order_id = req.params.order_id;

  const cashfree_options = {
    url:
      process.env.ENVIRONMENT === "DEV"
        ? process.env.DEV_CASHFREE_URL
        : process.env.PROD_CASHFREE_URL,
    appid:
      process.env.ENVIRONMENT === "DEV"
        ? process.env.DEV_CASHFREE_APPID
        : process.env.PROD_CASHFREE_APPID,
    clientsecret:
      process.env.ENVIRONMENT === "DEV"
        ? process.env.DEV_CASHFREE_SECRET_KEY
        : process.env.CASHFREE_SECRET_KEY,
  };
  const { url, appid, clientsecret } = cashfree_options;

  const myUrl = url + "/" + order_id;
  console.log(myUrl);

  const options = {
    method: "GET",
    url: myUrl,
    headers: {
      Accept: "application/json",
      "x-api-version": "2022-01-01",
      "x-client-id": appid,
      "x-client-secret": clientsecret,
    },
  };

  const current_order = await Order.findById(order_id);

  axios
    .request(options)
    .then(function (response) {
      // console.log(typeof response.data.customer_details.customer_id);
      Customer.findById(response.data.customer_details.customer_id).then(
        (current_cust) => {
          res.json({
            cf_order_details: response.data,
            current_order,
            current_cust,
          });
        }
      );
    })
    .catch(function (error) {
      return res.status(400).json({
        error: "Something went wrong. Please try again",
        message: error.response.data.message,
      });
    });
};

// sendgrid for email npm i @sendgrid/mail
const sgMail = require("@sendgrid/mail");
sgMail.setApiKey(
  "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"
);

exports.orderById = (req, res, next, id) => {
  Order.findById(id)
    .populate("products.product", "name price")
    .exec((err, order) => {
      if (err || !order) {
        return res.status(400).json({
          error: errorHandler(err),
        });
      }
      req.order = order;
      next();
    });
};

exports.create = (req, res) => {
  console.log("CREATE ORDER: ", req.body);
  res.status(200).send({ message: "Order Placed", order: req.body.order });
  // AppID: 172070f734837243d756e3e829070271
  // Secret Key: b10d7bcff1a767d79ae50b7b5bcf9f8e49ec5375
  // req.body.order.user = req.profile;
  // const order = new Order(req.body.order);
  // order.save((error, data) => {
  //     if (error) {
  //         return res.status(400).json({
  //             error: errorHandler(error)
  //         });
  //     }
  //     // send email alert to admin
  //     // order.address
  //     // order.products.length
  //     // order.amount
  //     const emailData = {
  //         to: 'kaloraat@gmail.com',
  //         from: 'noreply@ecommerce.com',
  //         subject: `A new order is received`,
  //         html: `
  //         <p>Customer name:</p>
  //         <p>Total products: ${order.products.length}</p>
  //         <p>Total cost: ${order.amount}</p>
  //         <p>Login to dashboard to the order in detail.</p>
  //     `
  //     };
  //     sgMail.send(emailData);
  //     res.json(data);
  // });
};

exports.listOrders = (req, res) => {
  Order.find()
    .populate("user", "_id name address")
    .sort("-created")
    .exec((err, orders) => {
      if (err) {
        return res.status(400).json({
          error: errorHandler(error),
        });
      }
      res.json(orders);
    });
};

exports.getStatusValues = (req, res) => {
  res.json(Order.schema.path("status").enumValues);
};

exports.updateOrderStatus = (req, res) => {
  Order.update(
    { _id: req.body.orderId },
    { $set: { status: req.body.status } },
    (err, order) => {
      if (err) {
        return res.status(400).json({
          error: errorHandler(err),
        });
      }
      res.json(order);
    }
  );
};
