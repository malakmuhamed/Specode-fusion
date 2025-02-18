// const express = require("express");
// const bcrypt = require("bcryptjs");
// const jwt = require("jsonwebtoken");
// const User = require("../models/user"); // Ensure correct model import

// const router = express.Router();

// // ✅ SIGNUP ROUTE (Register New User)
// router.post("/signup", async (req, res) => {
//   try {
//     const { username, email, password } = req.body;

//     // Check if the user already exists
//     const existingUser = await User.findOne({ email });
//     if (existingUser) {
//       return res.status(400).json({ message: "❌ Email already in use" });
//     }

//     // ✅ Validate password (at least 8 chars, 1 number, 1 uppercase)
//     if (!password.match(/^(?=.*[A-Z])(?=.*\d)[A-Za-z\d@#$%^&*!?.]{8,}$/)) {
//       return res.status(400).json({
//         message: "❌ Password must be at least 8 characters long, contain a number, and an uppercase letter.",
//       });
//     }

//     // ✅ Hash the password
//     const hashedPassword = await bcrypt.hash(password, 10);

//     // ✅ Create a new user
//     const newUser = new User({ username, email, password: hashedPassword });
//     await newUser.save();

//     res.status(201).json({
//       message: "✅ User registered successfully!",
//       user: { username, email },
//     });
//   } catch (error) {
//     console.error("🚨 Signup Error:", error);
//     res.status(500).json({ message: "❌ Server error", error: error.message });
//   }
// });

// // ✅ LOGIN ROUTE
// router.post("/login", async (req, res) => {
//   try {
//     const { email, password } = req.body;

//     console.log(`🔍 Checking login for: ${email}`);

//     // ✅ Find the user by email
//     const user = await User.findOne({ email });
//     if (!user) {
//       console.log(`❌ Login failed: No account found for ${email}`);
//       return res.status(401).json({ message: "❌ Invalid email or password" });
//     }

//     console.log("📌 User found:", user.email);

//     // ✅ Compare passwords
//     const isMatch = await bcrypt.compare(password, user.password);
//     console.log("🔑 Password match:", isMatch ? "✅ Match" : "❌ No match");

//     if (!isMatch) {
//       console.log(`❌ Incorrect password for ${email}`);
//       return res.status(401).json({ message: "❌ Invalid email or password" });
//     }

//     // ✅ Generate JWT Token (Include email in payload)
//     const token = jwt.sign(
//       { id: user.id, email: user.email },  // ✅ Ensure email is included
//       "secretkey",
      
//     );

//     console.log(`✅ SUCCESS: ${email} logged in`);
//     console.log(`🛠️ Token Payload:`, jwt.decode(token)); // ✅ Log token payload to verify

//     res.status(200).json({
//       message: "✅ Login successful",
//       token,
//       user: { username: user.username, email: user.email },
//     });
//   } catch (error) {
//     console.error("🚨 Login Error:", error);
//     res.status(500).json({ message: "❌ Server error", error: error.message });
//   }
// });

// module.exports = router;
const express = require("express");
const { getProfile, updateProfile, deleteProfile } = require("../controllers/usercontroller");
const authenticateUser = require("../middleware/authMiddleware");

const router = express.Router();

// ✅ Get User Profile
router.get("/profile", authenticateUser, getProfile);

// ✅ Update User Profile
router.put("/profile", authenticateUser, updateProfile);

// ✅ Delete User Account
router.delete("/profile", authenticateUser, deleteProfile);

module.exports = router;
