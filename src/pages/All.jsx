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
    const storedUser = localStorage.getItem("user");
    console.log("🔍 Checking localStorage for user:", storedUser);
  
    if (storedUser) {
      try {
        const parsedUser = JSON.parse(storedUser);
        if (parsedUser && parsedUser.email) {
          console.log("✅ User Email found:", parsedUser.email);
          setUserId(parsedUser.email); // Set email instead of user ID
        } else {
          console.warn("⚠️ User object is missing email. Proceeding without email.");
        }
      } catch (error) {
        console.error("❌ Error parsing user from localStorage:", error);
      }
    } else {
      console.warn("⚠️ No user found in localStorage.");
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
    console.log("🖱️ Selected Repository:", repo);
    setSelectedRepo(repo);
    setRequestStatus(null);
    fetchOwnerDetails(repo._id);
  };

  // ✅ Handle request access logic
  const handleRequestAccess = async () => {
    console.log("📡 Checking selectedRepo and userId...");
    console.log("✅ Selected Repo:", selectedRepo);
    console.log("👤 User Email:", userId);
  
    if (!selectedRepo) {
      console.error("❌ selectedRepo is NULL!");
      setRequestStatus("❌ No repository selected.");
      return;
    }
  
    if (!userId) {
      console.error("❌ userId is NULL! Check localStorage.");
      setRequestStatus("❌ No user ID found. Please log in.");
      return;
    }
  
    const token = localStorage.getItem("token"); // 🔥 Ensure the token is stored in localStorage
    if (!token) {
      console.error("❌ No auth token found!");
      setRequestStatus("❌ Authentication token missing. Please log in again.");
      return;
    }
  
    try {
      const response = await fetch(
        `http://localhost:5000/api/repos/${selectedRepo._id}/request-access`,
        {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${token}`, // ✅ Send token in the headers
          },
          body: JSON.stringify({ userId }),
        }
      );
  
      console.log("✅ Response received:", response);
  
      const data = await response.json();
      console.log("📜 Response Data:", data);
  
      if (!response.ok) throw new Error(data.message || "Failed to request access");
  
      setRequestStatus("✅ Access request sent successfully!");
    } catch (err) {
      console.error("❌ Error requesting access:", err);
      setRequestStatus(`❌ ${err.message}`);
    }
  };
  

  // ✅ Handle approval/rejection of requests (Owner Only)
  const handleApproval = async (requestUserId, decision) => {
    try {
      const response = await fetch(
        `http://localhost:5000/api/repos/${selectedRepo._id}/handle-request`,
        {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ userId: requestUserId, decision }),
        }
      );

      const data = await response.json();
      if (!response.ok) throw new Error(data.message);

      setRequestStatus(`✅ Request ${decision}d successfully!`);

      // 🔄 Update UI to remove request and add user if approved
      setSelectedRepo((prevRepo) => ({
        ...prevRepo,
        requests: prevRepo.requests.filter(req => req.userId !== requestUserId),
        ...(decision === "approve" && { members: [...prevRepo.members, { _id: requestUserId }] }),
      }));
    } catch (err) {
      console.error("Error handling request:", err);
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

          {owner && (
            <div className="mt-4">
              <p className="text-gray-700">👤 Name: {owner.name}</p>
              <p className="text-gray-500">📧 Email: {owner.email}</p>
              <p className="text-gray-500">🏢 Organization: {owner.organization}</p>

              {!selectedRepo.members?.some(member => member._id === userId) &&
                (selectedRepo.requests?.some(req => req.userId === userId) ? (
                  <p className="text-yellow-500 font-semibold">⏳ Pending Approval</p>
                ) : (
                  <button
                    className="mt-4 bg-blue-600 text-white px-4 py-2 rounded-lg hover:bg-blue-800 transition"
                    onClick={handleRequestAccess}
                  >
                    🚀 Request Access
                  </button>
                ))}

              {owner.id === userId && selectedRepo.requests?.length > 0 && (
                <div className="mt-6 p-4 bg-white shadow-md rounded-lg">
                  <h3 className="text-lg font-semibold">🔑 Pending Requests</h3>
                  {selectedRepo.requests.map(req => (
                    <div key={req.userId} className="flex justify-between p-2 bg-gray-100 rounded-lg mt-2">
                      <span>{req.userEmail}</span>
                      <div>
                        <button onClick={() => handleApproval(req.userId, "approve")} className="bg-green-500 text-white px-3 py-1 rounded mr-2">✅ Approve</button>
                        <button onClick={() => handleApproval(req.userId, "reject")} className="bg-red-500 text-white px-3 py-1 rounded">❌ Reject</button>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}
        </div>
      )}
    </div>
  );
}
