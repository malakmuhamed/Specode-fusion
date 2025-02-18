const express = require("express");
const mongoose = require("mongoose");
const cors = require("cors");
const path = require("path");
const fs = require("fs");
const csv = require("csv-parser");

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

// ✅ Serve extracted reports as static files
console.log("🛠️ Serving extracted files from:", extractedDir);
app.use("/extracted", express.static(extractedDir));

// ✅ Import Routes
app.use("/api/users", require("./routes/userRoutes"));
app.use("/api/repos", require("./routes/repoRoutes"));
app.use("/api/files", require("./routes/fileRoutes"));

// ✅ Fetch Extracted Requirements for a Repository
app.get("/api/repos/:repoId/extracted", async (req, res) => {
  const { repoId } = req.params;

  try {
    // ✅ Fetch repository by ID to get its name
    const repo = await Repo.findById(repoId);
    if (!repo) {
      console.error(`❌ Repository not found for ID: ${repoId}`);
      return res.status(404).json({ message: "Repository not found." });
    }

    // ✅ Construct the extracted file path using the repo name
    const extractedFilePath = path.join(extractedDir, repo.name, "latest_extracted.csv");
    console.log("🔍 Checking extracted file at:", extractedFilePath);

    if (!fs.existsSync(extractedFilePath)) {
      console.warn(`⚠️ Extracted file not found for repo: ${repo.name}`);
      return res.status(404).json({ message: "Extracted file not found." });
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

// ✅ Connect to MongoDB
mongoose.connect("mongodb://127.0.0.1:27017/speccode", {
  useNewUrlParser: true,
  useUnifiedTopology: true,
})
.then(() => console.log("✅ Connected to MongoDB"))
.catch((err) => console.error("❌ MongoDB connection error:", err));

// ✅ Start Server
app.listen(PORT, () => console.log(`🚀 Server running on http://localhost:${PORT}`));
