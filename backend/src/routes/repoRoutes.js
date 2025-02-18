const express = require("express");
const {
  createRepo,
  getUserRepositories,
  getRepoDetails,
  requestAccess,
  manageAccess,
  uploadFile,
  getRepoHistory,
  addCommitToRepo,
  getAllRepositories,
  getRepoOwner

} = require("../controllers/repoController");

const authenticateUser = require("../middleware/authMiddleware");
const multer = require("multer");
const path = require("path");
const Repo = require("../models/repo"); // ✅ Import the Repo model

const router = express.Router();

router.get("/:repoId/history", async (req, res) => {
  try {
    const repo = await Repo.findById(req.params.repoId)
      .populate("srsHistory.user", "username email")
      .populate("sourceCodeHistory.user", "username email");

    if (!repo) {
      return res.status(404).json({ message: "Repository not found" });
    }

    res.json({
      srsHistory: repo.srsHistory,
      sourceCodeHistory: repo.sourceCodeHistory,
    });
  } catch (error) {
    console.error("Error fetching history:", error);
    res.status(500).json({ message: "Server error", error });
  }
});
router.get("/all", async (req, res) => {
  try {
      const repos = await Repo.find().populate("owner", "username email");
      res.status(200).json(repos);
  } catch (error) {
      console.error("Error fetching all repositories:", error);
      res.status(500).json({ message: "Failed to fetch repositories." });
  }
});
router.get("/owner/:repoId", async (req, res) => {
  const repoId = req.params.repoId;
  console.log("Fetching owner for repoId:", repoId);
  const repo = await Repo.findById(repoId).populate("owner");

  if (!repo) {
    return res.status(404).json({ message: "Repository not found" });
  }

  res.json(repo.owner);
});


// ✅ Ensure uploads are stored in the correct directory
const upload = multer({
  dest: path.join(__dirname, "../uploads/"), // ✅ Fixed path
  limits: { fileSize: 10 * 1024 * 1024 }, // 10MB max file size
});

// ✅ Create a Repository
router.post("/create", authenticateUser, createRepo);

// ✅ Request Access to a Repository
router.post("/:repoId/request-access", authenticateUser, requestAccess);

// ✅ Approve/Deny Access (Owner Only)
router.post("/manage-access", authenticateUser, manageAccess);

// ✅ Upload SRS or Source Code (Only Members)
router.post("/:repoId/upload", authenticateUser, upload.single("file"), uploadFile);

// ✅ Fetch user's repositories
router.get("/my-repos", authenticateUser, getUserRepositories);

// ✅ Fetch repository details
router.get("/:repoId/details", authenticateUser, getRepoDetails);
router.get("/all", getAllRepositories);
router.get("/owner/:repoId", getRepoOwner);


module.exports = router;
