const User = require("../models/user");
const jwt = require("jsonwebtoken"); // to generate signed token
const expressJwt = require("express-jwt"); // for authorization check
const { errorHandler } = require("../helpers/dbErrorHandler");

// using promise
exports.signup = (req, res) => {
  const user = new User(req.body);
  user.save((err, user) => {
    if (err) {
      return res.status(400).json({
        // error: errorHandler(err)
        error: "Email is taken",
      });
    }
    // generate a signed token with user id and secret
    const token = jwt.sign({ _id: user._id }, process.env.JWT_SECRET);
    // persist the token as 't' in cookie with expiry date
    res.cookie("t", token, { expire: new Date() + 9999 });
    // return response with user and token to frontend client
    const { _id, name, email, role } = user;
    return res.json({ token, user: { _id, email, name, role } });
  });
};

exports.signin = (req, res) => {
  // find the user based on email
  const { email, password } = req.body;
  User.findOne({ email }, (err, user) => {
    if (err || !user) {
      return res.status(400).json({
        error: "User with that email does not exist. Please signup",
      });
    }
    // if user is found make sure the email and password match
    // create authenticate method in user model
    if (!user.authenticate(password)) {
      return res.status(401).json({
        error: "Email and password dont match",
      });
    }
    // generate a signed token with user id and secret
    const token = jwt.sign({ _id: user._id }, process.env.JWT_SECRET);
    // persist the token as 't' in cookie with expiry date
    res.cookie("t", token, { expire: new Date() + 9999 });
    // return response with user and token to frontend client
    const { _id, name, email, role } = user;
    return res.json({ token, user: { _id, email, name, role } });
  });
};

exports.signinGoogle = async (req, res) => {
  const { result } = req.body;
  const email = result.email;
  const users = await User.find({ email });
  if (users.length) {
    const { _id, name, email, role } = users[0];
    const token = jwt.sign({ _id: _id }, process.env.JWT_SECRET);
    res.cookie("t", token, { expire: new Date() + 9999 });
    return res.json({ token, user: { _id, email, name, role } });
  } else
    return res.json({
      error:
        "There is no active account associated with that email account. Would you like to Sign Up?",
    });
};

exports.signout = (req, res) => {
  res.clearCookie("t");
  res.json({ message: "Signout success" });
};

exports.requireSignin = expressJwt({
  secret: process.env.JWT_SECRET,
  userProperty: "auth",
});

exports.isAuth = (req, res, next) => {
  let user = req.profile && req.auth && req.profile._id == req.auth._id;
  if (!user) {
    return res.status(403).json({
      error: "Access denied",
    });
  }
  next();
};

exports.isAdmin = (req, res, next) => {
  if (req.profile.role === "1" || req.profile.role === "2") {
    return res.status(403).json({
      error: "Admin resourse! Access denied",
    });
  }
  next();
};

exports.isInfluencer = (req, res, next) => {
  if (req.profile.role === "0" || req.profile.role === "2") {
    return res.status(403).json({
      error: "Influencer resource, Access denied",
    });
  }
  next();
};

exports.isCustomer = (req, res, next) => {
  if (req.profile.role === "0" || req.profile.role === "1") {
    return res.status(403).json({
      error: "Customer resource. Access denied",
    });
  }
  next();
};

/**
 * google login full
 * https://www.udemy.com/instructor/communication/qa/7520556/detail/
 */
