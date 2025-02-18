const express = require("express");
const {
  createRepo,
  getUserRepositories,
  getRepoDetails,
  requestAccess,
  handleRequest,
  uploadFile,
  getReposWithRequests,
  getAllRepositories,
  getRepoOwner,
  getRepoRequests,
  getRepoHistory
} = require("../controllers/repoController");

const { getUserById } = require("../controllers/usercontroller"); // ✅ Fixed case sensitivity

const authenticateUser = require("../middleware/authMiddleware");
const multer = require("multer");
const path = require("path");

const router = express.Router();

// ✅ Fetch All Requests (Only for Repo Owners)
router.get("/:repoId/requests", authenticateUser, getRepoRequests);

// ✅ Handle Access Requests (Approve/Reject)
router.post("/:repoId/handle-request", authenticateUser, handleRequest);

// ✅ Create a Repository
router.post("/create", authenticateUser, createRepo);

// ✅ Request Access to a Repository
router.post("/:repoId/request-access", authenticateUser, requestAccess);

// ✅ Upload SRS or Source Code (Only Members)
const upload = multer({ dest: path.join(__dirname, "../uploads/"), limits: { fileSize: 10 * 1024 * 1024 } });
router.post("/:repoId/upload", authenticateUser, upload.single("file"), uploadFile);

// ✅ Fetch User's Repositories
router.get("/my-repos", authenticateUser, getUserRepositories);
router.get("/myrepos", authenticateUser, getReposWithRequests);
// ✅ Fetch Repository Details
router.get("/:repoId/details", authenticateUser, getRepoDetails);

// ✅ Fetch All Repositories
router.get("/all", getAllRepositories);

// ✅ Fetch Repository Owner
router.get("/owner/:repoId", getRepoOwner);

// ✅ Fetch User Details (NEW ROUTE)
router.get("/users/:id", getUserById);
// ✅ Fetch Repository History
router.get("/:repoId/history", authenticateUser, getRepoHistory);

module.exports = router;
