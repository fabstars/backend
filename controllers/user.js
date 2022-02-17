const User = require("../models/user");
const { Order } = require("../models/order");
const { errorHandler } = require("../helpers/dbErrorHandler");
const Product = require("../models/product");
const { cloudinary } = require("./cloudinary");
const formidable = require("formidable");
const fs = require("fs");

exports.userById = (req, res, next, id) => {
  User.findById(id).exec((err, user) => {
    if (err || !user) {
      return res.status(400).json({
        error: "User not found",
      });
    }
    req.profile = user;
    next();
  });
};

exports.getUserById = (req, res) => {
  const id = req.params.userId;
  User.findById(id).exec((err, user) => {
    if (err || !user) {
      return res.status(400).json({
        error: "User not found",
      });
    }
    user.hashed_password = undefined;
    user.salt = undefined;
    return res.status(200).json(user);
  });
};

exports.getUserBySlug = (req, res) => {
  const slug = req.params.slug;
  User.find({ slug }).exec((err, user) => {
    if (err) {
      return res.status(400).json({
        error: "User not found",
      });
    }
    if (user.length === 0) {
      return res.status(400).json({
        error: "User not found",
      });
    }
    user[0].hashed_password = undefined;
    user[0].salt = undefined;
    return res.status(200).json(user[0]);
  });
};

exports.read = (req, res) => {
  req.profile.hashed_password = undefined;
  req.profile.salt = undefined;
  return res.json(req.profile);
};

// exports.update = (req, res) => {
//     console.log('user update', req.body);
//     req.body.role = 0; // role will always be 0
//     User.findOneAndUpdate({ _id: req.profile._id }, { $set: req.body }, { new: true }, (err, user) => {
//         if (err) {
//             return res.status(400).json({
//                 error: 'You are not authorized to perform this action'
//             });
//         }
//         user.hashed_password = undefined;
//         user.salt = undefined;
//         res.json(user);
//     });
// };

exports.update = async (req, res) => {
  let form = new formidable.IncomingForm();
  form.keepExtensions = true;
  form.parse(req, async (err, fields, files) => {
    if (err) {
      console.log(err);
      return res.status(400).json({
        error: "Something went wrong. Please try again",
      });
    }
    const {
      name,
      password,
      twitter,
      facebook,
      linkedin,
      youtube,
      instagram,
      store_name,
      highlightLinks,
      slug,
    } = fields;
    User.findOne({ _id: req.profile._id }, async (err, user) => {
      if (err || !user) {
        return res.status(400).json({
          error: "User not found",
        });
      }
      if (!name) {
        return res.status(400).json({
          error: "Name is required",
        });
      } else {
        user.name = name;
      }

      if (password) {
        if (password.length < 6) {
          return res.status(400).json({
            error: "Password should be min 6 characters long",
          });
        } else {
          user.password = password;
        }
      }

      if (slug !== "") {
        const users = await User.find({ slug });

        for (var i = 0; i < users.length; i++) {
          const current_user = users[i];
          if (JSON.stringify(current_user._id) !== JSON.stringify(user._id)) {
            return res.status(400).json({
              error: "Username already exists",
            });
          }
        }

        user.slug = slug;
      } else {
        return res.status(400).json({
          error: "Username cannot be empty",
        });
      }

      user.social = {};
      if (youtube) user.social.youtube = youtube;
      if (twitter) user.social.twitter = twitter;
      if (facebook) user.social.facebook = facebook;
      if (instagram) user.social.instagram = instagram;
      if (linkedin) user.social.linkedin = linkedin;

      user.store_name = store_name;

      user.highlightLinks = JSON.parse(highlightLinks);

      if (files.url) {
        // console.log(files);
        try {
          var myImg = fs.readFileSync(files.url.path, "base64");
          myImg = "data:" + files.url.type + ";base64," + myImg;
          const uploadedResponse = await cloudinary.uploader.upload(myImg, {
            upload_preset: "q9pohyai",
          });
          console.log(uploadedResponse);
          user.url = uploadedResponse.url;
        } catch (error) {
          console.log(error);
          console.log("Unable to upload");
        }
      }

      user.save((err, updatedUser) => {
        if (err) {
          console.log("USER UPDATE ERROR", err);
          return res.status(400).json({
            error: "User update failed",
          });
        }
        updatedUser.hashed_password = undefined;
        updatedUser.salt = undefined;
        res.json(updatedUser);
      });
    });
  });
};

exports.addOrderToUserHistory = (req, res, next) => {
  let history = [];

  req.body.order.products.forEach((item) => {
    history.push({
      _id: item._id,
      name: item.name,
      description: item.description,
      category: item.category,
      quantity: item.count,
      transaction_id: req.body.order.transaction_id,
      amount: req.body.order.amount,
    });
  });

  User.findOneAndUpdate(
    { slug: req.body.order.creator },
    { $push: { history: history } },
    { new: true },
    (error, data) => {
      if (error) {
        return res.status(400).json({
          error: "Could not update user purchase history",
        });
      }
      next();
    }
  );
};

exports.purchaseHistory = (req, res) => {
  Order.find({ user: req.profile._id })
    .populate("user", "_id name")
    .sort("-created")
    .exec((err, orders) => {
      if (err) {
        return res.status(400).json({
          error: errorHandler(err),
        });
      }
      res.json(orders);
    });
};

exports.addInfluencerProducts = async (req, res) => {
  const products = req.body.products;
  const productId = products[0];
  let current_product = await Product.findById(productId);
  const userIndex = current_product.influencer_list
    .map((user) => user.user_id)
    .indexOf(req.profile._id);
  if (userIndex === -1) {
    const op1 = current_product.price / 10;
    const op2 = 40;

    const obj = {
      user_id: req.profile._id,
      margin: op1 > op2 ? op1 : op2,
    };
    current_product.influencer_list.push(obj);
    await current_product.save();
    return res.json({
      message: "Product added successfully",
    });
  } else {
    return res.json({
      message: "Product exists on your site",
    });
  }
};

exports.deleteInfluencerProduct = async (req, res) => {
  const products = req.body.products;
  for (const productId of products) {
    let current_product = await Product.findById(productId);
    const userIndex = current_product.influencer_list
      .map((user) => user.user_id)
      .indexOf(req.profile._id);
    if (userIndex !== -1) {
      current_product.influencer_list.splice(userIndex, 1);
      await current_product.save();
    }
  }
  res.json({
    message: "Product removed successfully",
  });
};

exports.fetchInfluencerProducts = async (req, res) => {
  let products = [];
  const allProducts = await Product.find().populate("category");
  allProducts.map((product, idx) => {
    const userIdx = product.influencer_list
      .map((user) => user.user_id)
      .indexOf(req.profile._id);
    if (userIdx !== -1) {
      // update the price based on the margin specified by the current user
      // do this in the front end price += margin
      // different for every influencer

      products.push(product);
    }
    if (idx == allProducts.length - 1) {
      console.log(products.length);
      return res.json(products);
    }
  });
};

exports.fetchInfluencerProductsBySlug = async (req, res) => {
  // let products = [];
  // const allProducts = await Product.find().populate("category");
  // allProducts.map((product, idx) => {
  //   const userIdx = product.influencer_list
  //     .map((user) => user.user_id)
  //     .indexOf(req.profile._id);
  //   if (userIdx !== -1) {
  //     // update the price based on the margin specified by the current user
  //     // do this in the front end price += margin
  //     // different for every influencer
  //     products.push(product);
  //   }
  //   if (idx == allProducts.length - 1) {
  //     console.log(products.length);
  //     return res.json(products);
  //   }
  // });
};

// highlightedlink
// social urls
