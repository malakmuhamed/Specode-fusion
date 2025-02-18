const mongoose = require("mongoose");

const repoSchema = new mongoose.Schema(
  {
    name: { type: String, required: true, unique: true, trim: true },
    owner: { type: mongoose.Schema.Types.ObjectId, ref: "User", required: true },
    members: [{ type: mongoose.Schema.Types.ObjectId, ref: "User", default: [] }],
    requests: [{ type: mongoose.Schema.Types.ObjectId, ref: "User", default: [] }],

    srsFile: { type: String, default: null },
    sourceCodeFile: { type: String, default: null },

    // ✅ SRS File History
    srsHistory: [
      {
        user: { type: mongoose.Schema.Types.ObjectId, ref: "User", required: true }, // Who committed
        action: {
          type: String,
          enum: ["Uploaded SRS", "Modified SRS", "Deleted SRS"], // Only valid actions
          required: true,
        },
        file: { type: String, required: true }, // Committed file path
        timestamp: { type: Date, default: Date.now },
      },
    ],

    // ✅ Source Code History
    sourceCodeHistory: [
      {
        user: { type: mongoose.Schema.Types.ObjectId, ref: "User", required: true },
        action: {
          type: String,
          enum: ["Uploaded Source Code", "Modified Source Code", "Deleted Source Code"],
          required: true,
        },
        file: { type: String, required: true },
        timestamp: { type: Date, default: Date.now },
      },
    ],
  },
  { timestamps: true }
);

module.exports = mongoose.model("Repo", repoSchema);
