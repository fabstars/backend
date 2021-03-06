const formidable = require("formidable");
const _ = require("lodash");
const fs = require("fs");
const Product = require("../models/product");
const { errorHandler } = require("../helpers/dbErrorHandler");
const Category = require("../models/category");
const { cloudinary } = require("./cloudinary");

exports.productById = (req, res, next, id) => {
  Product.findById(id)
    .populate("category")
    .exec((err, product) => {
      if (err || !product) {
        return res.status(400).json({
          error: "Product not found",
        });
      }
      req.product = product;
      next();
    });
};

exports.read = (req, res) => {
  req.product.photo = undefined;
  return res.json(req.product);
};

exports.create = async (req, res) => {
  let form = new formidable.IncomingForm();
  form.keepExtensions = true;
  form.parse(req, async (err, fields, files) => {
    if (err) {
      return res.status(400).json({
        error: "Something went wrong. Please try again",
      });
    }
    // check for all fields
    const { name, description, price, category, mrp } = fields;

    if (!name || !description || !price || !category || !mrp) {
      return res.status(400).json({
        error: "All fields are required",
      });
    }

    let product = new Product(fields);

    // 1kb = 1000
    // 1mb = 1000000

    // if (files.photo) {
    //   // console.log("FILES PHOTO: ", files.photo);
    //   if (files.photo.size > 1000000) {
    //     return res.status(400).json({
    //       error: "Image should be less than 1mb in size",
    //     });
    //   }

    //   product.photo.data = fs.readFileSync(files.photo.path);
    //   product.photo.contentType = files.photo.type;
    // }
    if (files.photo) {
      try {
        var myImg = fs.readFileSync(files.photo.path, "base64");
        myImg = "data:" + files.photo.type + ";base64," + myImg;
        const uploadedResponse = await cloudinary.uploader.upload(myImg, {
          upload_preset: "q9pohyai",
        });
        const splitted = uploadedResponse.url.split("upload");
        const myUrl = splitted[0] + "upload/q_60" + splitted[1];
        product.url = myUrl;
      } catch (error) {
        console.log("Unable to upload");
      }
    }

    product.sub_types = [];

    const curCategory = await Category.findById(category);

    for (const type of curCategory.sub_types) {
      product.sub_types.push({ sub_type: type._id });
    }

    product.save((err, result) => {
      if (err) {
        console.log("PRODUCT CREATE ERROR ", err);
        return res.status(400).json({
          error: errorHandler(err),
        });
      }
      res.json(result);
    });
  });
};

exports.remove = (req, res) => {
  let product = req.product;
  product.remove((err, deletedProduct) => {
    if (err) {
      return res.status(400).json({
        error: errorHandler(err),
      });
    }
    res.json({
      message: "Product deleted successfully",
    });
  });
};

exports.update = (req, res) => {
  let form = new formidable.IncomingForm();
  form.keepExtensions = true;
  form.parse(req, (err, fields, files) => {
    if (err) {
      return res.status(400).json({
        error: "Image could not be uploaded",
      });
    }

    let product = req.product;
    product = _.extend(product, fields);

    // 1kb = 1000
    // 1mb = 1000000

    // if (files.photo) {
    //   // console.log("FILES PHOTO: ", files.photo);
    //   if (files.photo.size > 1000000) {
    //     return res.status(400).json({
    //       error: "Image should be less than 1mb in size",
    //     });
    //   }
    //   product.photo.data = fs.readFileSync(files.photo.path);
    //   product.photo.contentType = files.photo.type;
    // }

    product.save((err, result) => {
      if (err) {
        return res.status(400).json({
          error: errorHandler(err),
        });
      }
      res.json(result);
    });
  });
};

exports.updateInfluencerProduct = async (req, res) => {
  const productId = req.product._id;
  const product = await Product.findById(productId);
  const idx = product.influencer_list
    .map((user) => user.user_id)
    .indexOf(req.profile._id);
  product.influencer_list[idx].margin = req.body.margin;
  await product.save();
  return res.status(200).json({
    message: "Margin updated successfully",
  });
};

/**
 * sell / arrival
 * by sell = /products?sortBy=sold&order=desc&limit=4
 * by arrival = /products?sortBy=createdAt&order=desc&limit=4
 * if no params are sent, then all products are returned
 */

exports.list = (req, res) => {
  let order = req.query.order ? req.query.order : "asc";
  let sortBy = req.query.sortBy ? req.query.sortBy : "_id";
  let limit = req.query.limit ? parseInt(req.query.limit) : 6;

  Product.find()
    .select("-photo")
    .populate("category")
    .sort([[sortBy, order]])
    .limit(limit)
    .exec((err, products) => {
      if (err) {
        return res.status(400).json({
          error: "Products not found",
        });
      }
      res.json(products);
    });
};

/**
 * it will find the products based on the req product category
 * other products that has the same category, will be returned
 */

exports.listRelated = (req, res) => {
  let limit = req.query.limit ? parseInt(req.query.limit) : 6;

  Product.find({ _id: { $ne: req.product }, category: req.product.category })
    .limit(limit)
    .populate("category", "_id name")
    .exec((err, products) => {
      if (err) {
        return res.status(400).json({
          error: "Products not found",
        });
      }
      res.json(products);
    });
};

exports.listCategories = (req, res) => {
  Product.distinct("category", {}, (err, categories) => {
    if (err) {
      return res.status(400).json({
        error: "Categories not found",
      });
    }
    res.json(categories);
  });
};

/**
 * list products by search
 * we will implement product search in react frontend
 * we will show categories in checkbox and price range in radio buttons
 * as the user clicks on those checkbox and radio buttons
 * we will make api request and show the products to users based on what he wants
 */

exports.listBySearch = (req, res) => {
  let order = req.body.order ? req.body.order : "desc";
  let sortBy = req.body.sortBy ? req.body.sortBy : "_id";
  let limit = req.body.limit ? parseInt(req.body.limit) : 100;
  let skip = parseInt(req.body.skip);
  let findArgs = {};

  // console.log(order, sortBy, limit, skip, req.body.filters);
  // console.log("findArgs", findArgs);

  for (let key in req.body.filters) {
    if (req.body.filters[key].length > 0) {
      if (key === "price") {
        // gte -  greater than price [0-10]
        // lte - less than
        findArgs[key] = {
          $gte: req.body.filters[key][0],
          $lte: req.body.filters[key][1],
        };
      } else if (key === "search") {
        findArgs["name"] = { $regex: req.body.filters[key], $options: "i" };
      } else {
        findArgs[key] = req.body.filters[key];
      }
    }
  }

  Product.find(findArgs)
    .select("-photo")
    .populate("category")
    .sort([[sortBy, order]])
    .skip(skip)
    .limit(limit)
    .exec((err, data) => {
      if (err) {
        return res.status(400).json({
          error: "Products not found",
        });
      }
      res.json({
        size: data.length,
        data,
      });
    });
};

exports.photo = (req, res, next) => {
  if (req.product.photo.data) {
    res.set("Content-Type", req.product.photo.contentType);
    return res.send(req.product.photo.data);
  }
  next();
};

exports.listSearch = (req, res) => {
  // create query object to hold search value and category value
  const query = {};
  let search = req.query.search;
  // assign search value to query.name
  if (!search) {
    search = "";
  }
  query.name = { $regex: search, $options: "i" };
  // assigne category value to query.category
  if (req.query.category && req.query.category != "All") {
    query.category = req.query.category;
  }
  // find the product based on query object with 2 properties
  // search and category
  Product.find(query, (err, products) => {
    if (err) {
      return res.status(400).json({
        error: errorHandler(err),
      });
    }
    res.json(products);
  })
    .select("-photo")
    .populate("category");
};

exports.decreaseQuantity = (req, res, next) => {
  let bulkOps = req.body.order.products.map((item) => {
    return {
      updateOne: {
        filter: { _id: item._id },
        update: { $inc: { quantity: -item.count, sold: +item.count } },
      },
    };
  });

  Product.bulkWrite(bulkOps, {}, (error, products) => {
    if (error) {
      return res.status(400).json({
        error: "Could not update product",
      });
    }
    next();
  });
};
