const Repo = require("../models/repo");
const User = require("../models/user");
const path = require("path");
const fs = require("fs");
const { spawn } = require("child_process");
const mongoose = require("mongoose");

// ✅ Create a Repository
exports.createRepo = async (req, res) => {
  try {
    console.log("Received request to create repo:", req.body);

    const { name } = req.body;
    const owner = req.user.id;

    if (!name) return res.status(400).json({ message: "Repo name is required" });

    const existingRepo = await Repo.findOne({ name });
    if (existingRepo) return res.status(400).json({ message: "Repo name already exists" });

    const repo = new Repo({ name, owner, members: [owner], srsHistory: [], sourceCodeHistory: [] });
    await repo.save();

    res.status(201).json({ message: "Repository created successfully!", repo });
  } catch (error) {
    console.error("❌ Server Error:", error);
    res.status(500).json({ message: "Server error", error: error.message });
  }
};

// ✅ Get User's Repositories
exports.getUserRepositories = async (req, res) => {
  try {
    console.log("🔍 Request from User ID:", req.user?.id);

    if (!req.user?.id) {
      return res.status(400).json({ message: "Invalid User ID in Token" });
    }

    const userId = req.user.id;
    const repos = await Repo.find({ $or: [{ owner: userId }, { members: userId }] });

    res.status(200).json(repos);
  } catch (error) {
    console.error("❌ Error fetching user repositories:", error);
    res.status(500).json({ message: "Failed to fetch repositories." });
  }
};



// ✅ Get Repository Details
exports.getRepoDetails = async (req, res) => {
  try {
    const { repoId } = req.params;
    console.log("🔍 Fetching details for repoId:", repoId);

    const repo = await Repo.findById(repoId);
    if (!repo) {
      console.error("❌ Repository not found:", repoId);
      return res.status(404).json({ message: "Repository not found." });
    }

    const extractedFilePath = `/extracted/${repo.name}/latest_extracted.csv`;
    console.log("📂 Extracted File Path Sent to Frontend:", extractedFilePath);

    res.status(200).json({
      repo,
      commits: (repo.srsHistory?.length || 0) + (repo.sourceCodeHistory?.length || 0),
      extractedReport: extractedFilePath,
    });
  } catch (error) {
    console.error("❌ Server Error Fetching Repo Details:", error);
    res.status(500).json({ message: "Failed to fetch repository details." });
  }
};



// ✅ Request Access to a Repository
exports.requestAccess = async (req, res) => {
  try {
    const { repoId } = req.params;
    const userId = req.user.id;

    const repo = await Repo.findById(repoId);
    if (!repo) return res.status(404).json({ message: "Repository not found" });

    if (repo.requests.includes(userId) || repo.members.includes(userId)) {
      return res.status(400).json({ message: "Access already requested or granted" });
    }

    repo.requests.push(userId);
    await repo.save();

    res.status(200).json({ message: "Access request sent" });
  } catch (error) {
    res.status(500).json({ message: "Server error", error: error.message });
  }
};

// ✅ Approve/Deny Access
exports.manageAccess = async (req, res) => {
  try {
    const { repoId, userId, action } = req.body;
    const repo = await Repo.findById(repoId);
    if (!repo) return res.status(404).json({ message: "Repository not found" });

    if (repo.owner.toString() !== req.user.id) {
      return res.status(403).json({ message: "Only the repo owner can manage access" });
    }

    if (action === "approve") {
      repo.members.push(userId);
    }
    repo.requests = repo.requests.filter((reqUserId) => reqUserId.toString() !== userId);

    await repo.save();
    res.status(200).json({ message: `User ${action}d successfully` });
  } catch (error) {
    res.status(500).json({ message: "Server error", error: error.message });
  }
};


// ✅ Upload SRS or Source Code
exports.uploadFile = async (req, res) => {
  try {
    console.log("📩 Received file upload request:", req.body);
    console.log("📂 Uploaded file details:", req.file);

    const { fileType } = req.body;
    const repoId = req.params.repoId;
    const userId = req.user.id; // Get the user who is uploading

    if (!req.file) return res.status(400).json({ message: "No file uploaded!" });

    const repo = await Repo.findById(repoId);
    if (!repo) return res.status(404).json({ message: "Repository not found" });

    if (!repo.members.includes(userId)) {
      return res.status(403).json({ message: "Access denied" });
    }

    // ✅ Create repository upload folder
    const repoUploadDir = path.join(__dirname, "../uploads", repo.name);
    if (!fs.existsSync(repoUploadDir)) fs.mkdirSync(repoUploadDir, { recursive: true });

    const fileExt = path.extname(req.file.originalname);
    const srsFilePath = path.join(repoUploadDir, `SRS${fileExt}`);

    // ✅ Move uploaded file
    fs.renameSync(req.file.path, srsFilePath);

    // ✅ Ensure required fields are added when updating history
    if (fileType === "srs") {
      repo.srsHistory.push({
        user: userId, // Who committed
        action: "Uploaded SRS",
        file: srsFilePath,
        timestamp: new Date(),
      });
      repo.srsFile = srsFilePath;
    } else if (fileType === "sourceCode") {
      repo.sourceCodeHistory.push({
        user: userId,
        action: "Uploaded Source Code",
        file: srsFilePath,
        timestamp: new Date(),
      });
      repo.sourceCodeFile = srsFilePath;
    } else {
      return res.status(400).json({ message: "Invalid file type" });
    }

    await repo.save();

    // ✅ Create extraction folder
    const repoExtractedDir = path.join(__dirname, "../extracted", repo.name);
    if (!fs.existsSync(repoExtractedDir)) fs.mkdirSync(repoExtractedDir, { recursive: true });

    const extractedFilePath = path.join(repoExtractedDir, "latest_extracted.csv");
    console.log(`📂 Extracted file will be saved at: ${extractedFilePath}`);

    // ✅ Run `test_model.py` for extraction
    const pythonProcess = spawn("python", [
      path.resolve(__dirname, "../scripts/test_model.py"),
      "--file",
      srsFilePath,
      "--output",
      extractedFilePath,
    ]);

    pythonProcess.stdout.on("data", (data) => console.log(`🐍 Python Output: ${data}`));
    pythonProcess.stderr.on("data", (data) => console.error(`❌ Python Error: ${data}`));

    pythonProcess.on("close", async (code) => {
      if (code === 0) {
        console.log("✅ Extraction completed successfully!");
        res.status(200).json({
          message: "File uploaded and processed successfully!",
          repo,
          extractedFilePath,
        });
      } else {
        console.error("❌ Extraction failed!");
        res.status(500).json({ message: "Extraction failed. Check logs." });
      }
    });
  } catch (error) { 
    console.error("❌ Server Error:", error);
    res.status(500).json({ message: "Server error", error: error.message });
  }
};

exports.getAllRepositories = async (req, res) => {
  try {
      const repos = await Repo.find().populate("owner", "username email");
      res.status(200).json(repos);
  } catch (error) {
      console.error("Error fetching all repositories:", error);
      res.status(500).json({ message: "Failed to fetch repositories." });
  }
};
exports.getRepoOwner = async (req, res) => {
  try {
    const { repoId } = req.params;
    console.log("🔍 Fetching owner for repoId:", repoId);

    // Ensure repoId is a valid MongoDB ObjectId
    if (!mongoose.Types.ObjectId.isValid(repoId)) {
      return res.status(400).json({ message: "Invalid repository ID format." });
    }

    // Find repo and populate owner details
    const repo = await Repo.findById(repoId).populate("owner", "username email organization");

    if (!repo) {
      return res.status(404).json({ message: "Repository not found" });
    }

    if (!repo.owner) {
      return res.status(404).json({ message: "Owner details not found" });
    }

    res.status(200).json({
      _id: repo.owner._id,
      name: repo.owner.username || "N/A",
      email: repo.owner.email || "N/A",
      organization: repo.owner.organization || "N/A",
    });
  } catch (error) {
    console.error("❌ Error fetching repository owner:", error);
    res.status(500).json({ message: "Server error", error: error.message });
  }
};
exports.getRepoRequests = async (req, res) => {
  try {
    const { repoId } = req.params;
    const ownerId = req.user.id;

    console.log("🔍 Fetching requests for repo:", repoId);
    console.log("👤 Authenticated Owner ID:", ownerId);

    // ✅ Populate the "requests" field with username & email
    const repo = await Repo.findById(repoId).populate("requests", "username email");

    if (!repo) {
      console.error("❌ Repository not found:", repoId);
      return res.status(404).json({ message: "Repository not found" });
    }

    if (repo.owner.toString() !== ownerId) {
      console.error("❌ Access denied. Owner ID mismatch:", { expected: repo.owner.toString(), found: ownerId });
      return res.status(403).json({ message: "Access denied. Only the owner can view requests." });
    }

    console.log("✅ Requests found:", repo.requests);
    res.status(200).json(repo.requests);
  } catch (error) {
    console.error("❌ Error fetching requests:", error);
    res.status(500).json({ message: "Server error", error: error.message });
  }
};
exports.getReposWithRequests = async (req, res) => {
  try {
    console.log("🔍 Request from User ID:", req.user?.id);

    if (!req.user?.id) {
      return res.status(400).json({ message: "Invalid User ID in Token" });
    }

    const userId = req.user.id;

    // ✅ Fetch repositories and populate "requests" with user data
    const repos = await Repo.find({ $or: [{ owner: userId }, { members: userId }] })
      .populate("requests", "username email"); // Populate username & email of requesters

    console.log("✅ Repositories with populated requests:", repos);

    res.status(200).json(repos);
  } catch (error) {
    console.error("❌ Error fetching repositories with requests:", error);
    res.status(500).json({ message: "Failed to fetch repositories." });
  }
};



exports.handleRequest = async (req, res) => {
  try {
    const { repoId } = req.params;
    const { userId, action } = req.body; // action = "approve" or "reject"
    const ownerId = req.user.id;

    const repo = await Repo.findById(repoId);
    if (!repo) {
      return res.status(404).json({ message: "Repository not found" });
    }

    if (repo.owner.toString() !== ownerId) {
      return res.status(403).json({ message: "Only the owner can approve or reject requests" });
    }

    if (!repo.requests.includes(userId)) {
      return res.status(400).json({ message: "Request not found" });
    }

    if (action === "approve") {
      repo.members.push(userId);
    }
    repo.requests = repo.requests.filter((reqUserId) => reqUserId.toString() !== userId);

    await repo.save();
    res.status(200).json({ message: `User ${action}d successfully` });
  } catch (error) {
    console.error("Error handling request:", error);
    res.status(500).json({ message: "Server error", error: error.message });
  }
};
exports.getRepoHistory = async (req, res) => {
  try {
    const { repoId } = req.params;
    console.log("🔍 Fetching history for repo:", repoId);

    const repo = await Repo.findById(repoId)
      .populate("srsHistory.user", "username email") // ✅ Populate user details
      .populate("sourceCodeHistory.user", "username email");

    if (!repo) {
      console.error("❌ Repository not found:", repoId);
      return res.status(404).json({ message: "Repository not found" });
    }

    res.status(200).json({
      srsHistory: repo.srsHistory || [],
      sourceCodeHistory: repo.sourceCodeHistory || [],
    });
  } catch (error) {
    console.error("❌ Error fetching history:", error);
    res.status(500).json({ message: "Server error", error: error.message });
  }
};


