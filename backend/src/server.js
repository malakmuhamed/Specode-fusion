const express = require("express");
const mongoose = require("mongoose");
const cors = require("cors");
const multer = require("multer");
const path = require("path");
const { spawn } = require("child_process");
const fs = require("fs");
const jwt = require("jsonwebtoken");
const csv = require("csv-parser");
const bcrypt = require("bcryptjs");
const User = require("./models/user");
const Repo = require("./models/repo"); // ✅ Import Repo model

const app = express();
const PORT = process.env.PORT || 5000;

// ✅ Middleware
app.use(cors({ origin: "http://localhost:5173", credentials: true }));
app.use(express.json());
app.use(express.static("public"));

// ✅ Ensure directories exist
const extractedDir = path.join(__dirname, "extracted");
const uploadDir = path.join(__dirname, "uploads");

if (!fs.existsSync(uploadDir)) fs.mkdirSync(uploadDir, { recursive: true });
if (!fs.existsSync(extractedDir)) fs.mkdirSync(extractedDir, { recursive: true });

// ✅ Serve Extracted Reports as Static Files
app.use("/extracted", express.static(extractedDir));
console.log("✅ Serving extracted reports from:", extractedDir);

// ✅ Import Routes
const repoRoutes = require("./routes/repoRoutes");
app.use("/api/repos", repoRoutes);

// ✅ Connect to MongoDB
mongoose
  .connect("mongodb://127.0.0.1:27017/speccode", {
    useNewUrlParser: true,
    useUnifiedTopology: true,
  })
  .then(() => console.log("✅ Connected to MongoDB"))
  .catch((err) => console.error("❌ MongoDB connection error:", err));

// ✅ AUTH Middleware
const authenticateUser = (req, res, next) => {
  let token = req.header("Authorization");
  if (!token) return res.status(401).json({ error: "Unauthorized access!" });

  try {
    if (token.startsWith("Bearer ")) token = token.slice(7);
    const decoded = jwt.verify(token, "secretkey");

    if (!decoded.email) return res.status(401).json({ error: "Invalid or expired token." });

    req.user = decoded;
    next();
  } catch (error) {
    return res.status(401).json({ error: "Invalid or expired token." });
  }
};

// ✅ File Upload Configuration
const storage = multer.diskStorage({
  destination: uploadDir,
  filename: (req, file, cb) => {
    if (!req.user || !req.user.email) return cb(new Error("Unauthorized: Missing user email."), false);
    const userEmail = req.user.email.replace(/[@.]/g, "_");
    cb(null, `${userEmail}_${Date.now()}_${file.originalname}`);
  },
});
const upload = multer({ storage });

// ✅ Upload & Process File
app.post("/upload", authenticateUser, upload.single("file"), (req, res) => {
  if (!req.file) return res.status(400).json({ error: "No file uploaded!" });

  const userEmail = req.user.email.replace(/[@.]/g, "_");
  const userFolder = path.join(extractedDir, userEmail);
  if (!fs.existsSync(userFolder)) fs.mkdirSync(userFolder, { recursive: true });

  const extractedFilePath = path.join(userFolder, `latest_extracted.csv`);
  console.log(`📂 Saving extracted file to: ${extractedFilePath}`);

  const pythonProcess = spawn("python", [
    path.resolve(__dirname, "./scripts/test_model.py"),
    "--file",
    req.file.path,
    "--output",
    extractedFilePath,
  ]);

  pythonProcess.stderr.on("data", (data) => console.error(`❌ Python Error: ${data.toString()}`));

  pythonProcess.on("close", (code) => {
    if (code === 0) {
      res.json({ success: "File processed successfully!", extractedPath: `/extracted/${userEmail}/latest_extracted.csv` });
    } else {
      res.status(500).json({ error: "Failed to process the file. Check logs." });
    }
  });
});

// ✅ Fetch Extracted Requirements Based on Repo Name
app.get("/api/repos/:repoId/extracted", async (req, res) => {
  const { repoId } = req.params;

  try {
    // ✅ Fetch repository by ID to get its name
    const repo = await Repo.findById(repoId);
    if (!repo) {
      console.error(`❌ Repository not found for ID: ${repoId}`);
      return res.status(404).json({ message: "Repository not found." });
    }

    // ✅ Use repo name instead of repoId
    const extractedFilePath = path.join(extractedDir, repo.name, "latest_extracted.csv");

    console.log("🔍 Checking extracted file at:", extractedFilePath);

    if (!fs.existsSync(extractedFilePath)) {
      console.warn(`⚠️ Extracted file not found for repo: ${repo.name}`);
      return res.status(200).json([]); // Return empty list instead of 404
    }

    console.log("✅ Extracted file found, reading data...");

    const extractedRequirements = [];
    fs.createReadStream(extractedFilePath)
      .pipe(csv())
      .on("data", (row) => extractedRequirements.push(row))
      .on("end", () => {
        console.log("✅ Extracted Requirements:", extractedRequirements);
        res.json(extractedRequirements);
      })
      .on("error", (error) => {
        console.error("❌ Error reading extracted file:", error);
        res.status(500).json({ message: "Error reading extracted file.", error });
      });

  } catch (error) {
    console.error("❌ Server error fetching extracted requirements:", error);
    res.status(500).json({ message: "Server error", error: error.message });
  }
});

// ✅ User Signup
app.post("/api/users/signup", async (req, res) => {
  try {
    const { username, email, password } = req.body;
    const existingUser = await User.findOne({ email });

    if (existingUser) return res.status(400).json({ message: "Email already in use" });

    const hashedPassword = await bcrypt.hash(password, 10);
    const newUser = new User({ username, email, password: hashedPassword });
    await newUser.save();

    res.status(201).json({ message: "User registered successfully!", user: { username, email } });
  } catch (error) {
    res.status(500).json({ message: "Server error", error: error.message });
  }
});

// ✅ User Login
app.post("/api/users/login", async (req, res) => {
  try {
    const { email, password } = req.body;
    console.log("🔍 Login attempt for:", email);

    const user = await User.findOne({ email });
    if (!user) {
      console.warn("⚠️ User not found:", email);
      return res.status(401).json({ message: "Invalid email or password" });
    }

    const isMatch = await bcrypt.compare(password, user.password);
    if (!isMatch) {
      console.warn("⚠️ Incorrect password for:", email);
      return res.status(401).json({ message: "Invalid email or password" });
    }

    const token = jwt.sign({ id: user.id, email: user.email }, "secretkey", { expiresIn: "3h" });

    console.log("✅ Login successful for:", email);
    res.status(200).json({ message: "Login successful", token, user: { username: user.username, email: user.email } });
  } catch (error) {
    console.error("❌ Server error during login:", error);
    res.status(500).json({ message: "Server error", error: error.message });
  }
});


// ✅ Get User Profile
app.get("/api/users/profile", authenticateUser, async (req, res) => {
  try {
    const user = await User.findById(req.user.id).select("-password");
    if (!user) return res.status(404).json({ message: "User not found" });

    res.json(user);
  } catch (error) {
    res.status(500).json({ message: "Server error", error: error.message });
  }
});

// ✅ Start Server
app.listen(PORT, () => console.log(`🚀 Server running on http://localhost:${PORT}`));
