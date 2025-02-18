import { useState, useEffect } from "react";

export default function AllRepos() {
  const [repos, setRepos] = useState([]);
  const [searchTerm, setSearchTerm] = useState("");
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [selectedRepo, setSelectedRepo] = useState(null);
  const [owner, setOwner] = useState(null);
  const [ownerError, setOwnerError] = useState(null);
  const [requestStatus, setRequestStatus] = useState(null);
  const [userId, setUserId] = useState(null);

  // ✅ Fetch user ID from localStorage
  useEffect(() => {
    const storedUser = JSON.parse(localStorage.getItem("user"));
    if (storedUser && storedUser._id) {
      setUserId(storedUser._id);
    } else {
      console.warn("⚠️ User ID not found in localStorage!");
    }
  }, []);

  // ✅ Fetch all repositories
  useEffect(() => {
    const fetchRepos = async () => {
      try {
        const response = await fetch("http://localhost:5000/api/repos/all");
        if (!response.ok) throw new Error(`HTTP error! Status: ${response.status}`);

        const data = await response.json();
        setRepos(data);
      } catch (err) {
        console.error("Error fetching repositories:", err);
        setError(err.message);
      } finally {
        setLoading(false);
      }
    };

    fetchRepos();
  }, []);

  // ✅ Fetch repository owner details
  const fetchOwnerDetails = async (repoId) => {
    try {
      setOwnerError(null);
      setOwner(null);
  
      const response = await fetch(`http://localhost:5000/api/repos/owner/${repoId}`);
      if (!response.ok) throw new Error(`HTTP error! Status: ${response.status}`);
  
      const data = await response.json();
  
      setOwner({
        id: data._id || "N/A",
        name: data.name || "N/A",
        email: data.email || "N/A",
        organization: data.organization || "N/A",
      });
    } catch (err) {
      console.error("Error fetching owner details:", err);
      setOwnerError(err.message);
    }
  };
  

  // ✅ Handle repository selection
  const handleRepoClick = (repo) => {
    console.log("Selected Repository:", repo);
    setSelectedRepo(repo);
    setRequestStatus(null);
    fetchOwnerDetails(repo._id);
  };

  // ✅ Handle request access logic
  const handleRequestAccess = async () => {
    if (!selectedRepo || !userId) {
      setRequestStatus("⚠️ Invalid repository or user ID.");
      return;
    }

    console.log("Requesting Access for Repo:", selectedRepo);
    console.log("User ID:", userId);

    if (selectedRepo.owner?._id === userId) {
      setRequestStatus("⚠️ You are the owner of this repository.");
      return;
    }

    if (selectedRepo.requests?.includes(userId)) {
      setRequestStatus("⚠️ You have already requested access.");
      return;
    }

    try {
      const response = await fetch(
        `http://localhost:5000/api/repos/${selectedRepo._id}/request-access`,
        {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ userId }),
        }
      );

      const data = await response.json();
      console.log("Response Data:", data);

      if (!response.ok) throw new Error(data.message || "Failed to request access");

      setRequestStatus("✅ Access request sent successfully!");

      // 🔄 Update UI to reflect the access request
      setSelectedRepo((prevRepo) => ({
        ...prevRepo,
        requests: [...(prevRepo.requests || []), userId],
      }));
    } catch (err) {
      console.error("Error requesting access:", err);
      setRequestStatus(`❌ ${err.message}`);
    }
  };

  return (
    <div className="p-6 bg-gray-100 min-h-screen">
      <h1 className="text-3xl font-bold mb-4">🔍 Search Repositories</h1>

      <input
        type="text"
        placeholder="Search by repo name..."
        className="border rounded-lg p-2 w-full mb-4"
        value={searchTerm}
        onChange={(e) => setSearchTerm(e.target.value)}
      />

      <div className="grid md:grid-cols-2 gap-4">
        {repos.length > 0 ? (
          repos
            .filter((repo) => repo.name.toLowerCase().includes(searchTerm.toLowerCase()))
            .map((repo) => (
              <div
                key={repo._id}
                className="bg-white shadow-md p-4 rounded-lg cursor-pointer hover:bg-blue-100"
                onClick={() => handleRepoClick(repo)}
              >
                <h2 className="text-xl font-semibold text-blue-600">{repo.name}</h2>
                <p className="text-gray-700">👤 Owner: {repo.owner?.username || "Unknown"}</p>
              </div>
            ))
        ) : (
          <p className="text-gray-600">No repositories found.</p>
        )}
      </div>

      {selectedRepo && (
  <div className="mt-6 p-4 bg-white shadow-md rounded-lg">
    <h2 className="text-2xl font-bold text-blue-600">📜 Repository: {selectedRepo.name}</h2>
    <p className="text-gray-700">👤 Owner ID: {owner?.id || "N/A"}</p>

    {owner ? (
      <div className="mt-4">
        <h3 className="text-lg font-semibold mt-2">Owner Details:</h3>
        <p className="text-gray-700">👤 Name: {owner.name}</p>
        <p className="text-gray-500">📧 Email: {owner.email}</p>
        <p className="text-gray-500">🏢 Organization: {owner.organization}</p>

        {!selectedRepo.members?.some((member) => member._id === userId) && (
          <button
            className="mt-4 bg-blue-600 text-white px-4 py-2 rounded-lg hover:bg-blue-800 transition"
            onClick={handleRequestAccess}
          >
            🚀 Request Access
          </button>
        )}
      </div>
    ) : ownerError ? (
      <p className="text-red-500">Error fetching owner: {ownerError}</p>
    ) : (
      <p className="text-gray-500">Loading owner details...</p>
    )}
  </div>
)}

    </div>
  );
}
