const express = require("express");
const router = express.Router();

const {
  signup,
  signin,
  signout,
  requireSignin,
  signinGoogle,
} = require("../controllers/auth");
const { userSignupValidator } = require("../validator");

router.post("/signup", userSignupValidator, signup);
router.post("/signin", signin);
router.post("/signin/google", signinGoogle);
router.get("/signout", signout);

module.exports = router;
