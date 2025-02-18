import { useState, useEffect } from "react";
import axios from "axios";

const Upload = ({ repoId }) => {
  const [file, setFile] = useState(null);
  const [fileType, setFileType] = useState("srs");

  // ✅ Debug repoId when component loads
  useEffect(() => {
    console.log("🏷️ Upload Component Mounted - Repo ID:", repoId);
  }, [repoId]);

  const handleUpload = async () => {
    try {
      console.log("📂 Selected File:", file);
      console.log("📄 File Type:", fileType);
      console.log("🏷️ Repo ID:", repoId); // ✅ Check repoId before upload

      if (!repoId) {
        alert("Error: Repository ID is missing!");
        return;
      }

      const token = localStorage.getItem("token");
      if (!token) {
        alert("You must be logged in to upload!");
        return;
      }

      const formData = new FormData();
      formData.append("file", file);
      formData.append("fileType", fileType);

      const response = await axios.post(
        `http://localhost:5000/api/repos/${repoId}/upload`,
        formData,
        { headers: { Authorization: `Bearer ${token}`, "Content-Type": "multipart/form-data" } }
      );

      console.log("✅ Upload Success:", response.data);
      alert("File uploaded successfully!");
    } catch (err) {
      console.error("❌ Upload Error:", err.response?.data || err.message);
      alert("Upload failed: " + (err.response?.data?.message || "Unknown error"));
    }
  };

  return (
    <div>
      <h2>Upload File</h2>
      <p>Repo ID: {repoId ? repoId : "❌ No Repo Selected"}</p> {/* ✅ Display repoId */}
      <input type="file" onChange={(e) => setFile(e.target.files[0])} />
      <select onChange={(e) => setFileType(e.target.value)}>
        <option value="srs">SRS File</option>
        <option value="sourceCode">Source Code</option>
      </select>
      <button onClick={handleUpload}>Upload</button>
    </div>
  );
};

export default Upload;
