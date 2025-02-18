import { useState, useEffect, useCallback } from "react";

export default function RequestsPage() {
  const [repos, setRepos] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  const token = localStorage.getItem("token");

  // ✅ Fetch all repositories with pending requests
  const fetchReposWithRequests = useCallback(async () => {
    if (!token) {
      setError("⚠️ No authentication token found. Please log in.");
      setLoading(false);
      return;
    }

    console.log("📡 Fetching repositories with requests...");

    try {
      const response = await fetch("http://localhost:5000/api/repos/myrepos", {
        headers: { Authorization: `Bearer ${token}` },
      });

      console.log("✅ Response status:", response.status);

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.message || "Failed to fetch repositories");
      }

      const data = await response.json();
      console.log("📜 Received repositories:", JSON.stringify(data, null, 2));

      if (!Array.isArray(data)) {
        throw new Error("Invalid data format received from API");
      }

      setRepos(data);
    } catch (err) {
      console.error("❌ Fetch Error:", err);
      setError(err.message);
    } finally {
      setLoading(false);
    }
  }, [token]);

  // ✅ Fetch repositories on component mount
  useEffect(() => {
    fetchReposWithRequests();
  }, [fetchReposWithRequests]);

  // ✅ Handle Approve/Reject Actions
  const handleRequest = async (repoId, userId, action) => {
    try {
      const response = await fetch(`http://localhost:5000/api/repos/${repoId}/handle-request`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({ userId, action }),
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.message || `Failed to ${action} request`);
      }

      console.log(`✅ Successfully ${action}d request for user:`, userId);

      // ✅ Update the UI: Remove the user from the requests list
      setRepos((prevRepos) =>
        prevRepos.map((repo) =>
          repo._id === repoId
            ? { ...repo, requests: repo.requests.filter((req) => req._id !== userId) }
            : repo
        )
      );
    } catch (err) {
      console.error("❌ Request Handling Error:", err);
      setError(err.message);
    }
  };

  if (loading) return <p className="text-center text-blue-600">⏳ Loading repositories and requests...</p>;
  if (error) return <p className="text-center text-red-600">❌ {error}</p>;

  return (
    <div className="p-6 bg-gray-100 min-h-screen">
      <h1 className="text-3xl font-bold mb-4">🔑 Pending Access Requests</h1>

      {repos.length === 0 ? (
        <p className="text-gray-600">No repositories found.</p>
      ) : (
        <div className="space-y-6">
          {repos.map((repo) => (
            <div key={repo._id} className="bg-white p-4 rounded-lg shadow-md">
              <h2 className="text-xl font-bold text-blue-600">{repo.name}</h2>
              {repo.requests.length === 0 ? (
                <p className="text-gray-600 mt-2">No pending requests.</p>
              ) : (
                <div className="mt-4 space-y-2">
                  {repo.requests.map((user) => (
                    <div key={user._id} className="flex justify-between bg-gray-100 p-3 rounded-lg">
                      <div className="flex flex-col">
                        <span className="text-lg font-medium">{user.username || "Unknown User"}</span>
                        <span className="text-gray-600 text-sm">{user.email || "No email"}</span>
                      </div>
                      <div>
                        <button
                          onClick={() => handleRequest(repo._id, user._id, "approve")}
                          className="bg-green-500 text-white px-4 py-2 rounded mr-2 hover:bg-green-700 transition"
                        >
                          ✅ Approve
                        </button>
                        <button
                          onClick={() => handleRequest(repo._id, user._id, "reject")}
                          className="bg-red-500 text-white px-4 py-2 rounded hover:bg-red-700 transition"
                        >
                          ❌ Reject
                        </button>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
