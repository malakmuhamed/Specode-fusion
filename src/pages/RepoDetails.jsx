import { useEffect, useState } from "react";
import { useParams, useNavigate } from "react-router-dom"; // ✅ Import useNavigate
import axios from "axios";
import "./ExtractedReq.css"; // ✅ Import the CSS file
import "./All.css";

const RepoDetails = () => {
    const { repoId } = useParams(); // ✅ Get repo ID from URL
    const [repoDetails, setRepoDetails] = useState(null);
    const [requirements, setRequirements] = useState([]);
    const [error, setError] = useState(null);
    const [loading, setLoading] = useState(true);
    const navigate = useNavigate(); // ✅ Initialize navigation
    const token = localStorage.getItem("token");

    console.log("🆔 Received repoId:", repoId); // ✅ Debugging

    useEffect(() => {
        if (!repoId) {
            console.error("❌ Repo ID is missing in URL!");
            setError("Repository ID is missing.");
            setLoading(false);
            return;
        }

        const fetchRepoDetails = async () => {
            try {
                console.log(`📡 Fetching repo details for ID: ${repoId}`);
                const response = await axios.get(`http://localhost:5000/api/repos/${repoId}/details`, {
                    headers: { Authorization: `Bearer ${token}` },
                });

                console.log("✅ Repo Details Fetched:", response.data);
                setRepoDetails(response.data);
            } catch (error) {
                console.error("❌ Error fetching repository details:", error);
                setError(error.message);
            }
        };

        const fetchRequirements = async () => {
            try {
                if (!token) {
                    console.error("❌ No auth token found!");
                    return;
                }

                console.log(`📡 Fetching extracted requirements for repo: ${repoId}`);
                const response = await fetch(`http://localhost:5000/api/repos/${repoId}/extracted`, {
                    method: "GET",
                    headers: {
                        "Content-Type": "application/json",
                        "Authorization": `Bearer ${token}`,
                    },
                });

                if (!response.ok) {
                    throw new Error(`HTTP Error! Status: ${response.status}`);
                }

                const data = await response.json();
                console.log("📡 Extracted Requirements:", data);

                setRequirements(data);
                setLoading(false);
            } catch (error) {
                console.error("❌ Fetch error:", error);
                setError(error.message);
                setLoading(false);
            }
        };

        fetchRepoDetails();
        fetchRequirements();
    }, [repoId, token]);

    // ✅ Function to navigate to Upload Source Code page
    const handleUploadCodeClick = () => {
        navigate("/upload-code"); // ✅ Ensure this route exists in App.js
    };

    // ✅ Function to navigate to Repository History page
    const handleViewHistoryClick = () => {
        navigate(`/repo-history/${repoId}`); // ✅ Pass repoId in URL
    };

    if (!repoDetails) return <p>Loading repository details...</p>;

    return (
        <div className="container">
            <h3>Repository: {repoDetails.repo.name}</h3>
            <p>📝 Commits: {repoDetails.commits}</p>
            <button>Edit Repository</button>
            <p>
                📄 
                <a href={repoDetails.extractedReport + "?nocache=" + new Date().getTime()} target="_blank" rel="noopener noreferrer">
                    Download Extracted Requirements
                </a>
            </p>

            {/* ✅ Display Extracted Requirements */}
            <h2 className="title">Extracted Requirements</h2>
            {loading ? (
                <p className="loading">Loading...</p>
            ) : error ? (
                <p className="error">{error}</p>
            ) : (
                <div>
                    <table className="requirements-table">
                        <thead>
                            <tr>
                                <th>Filename</th>
                                <th>Requirement</th>
                                <th>Type</th>
                            </tr>
                        </thead>
                        <tbody>
                            {requirements
                                .filter(req => req.requirement && req.requirement.length > 5) // Filters out broken entries
                                .map((req, index) => (
                                    <tr key={index}>
                                        <td>{req.filename}</td>
                                        <td>{req.requirement}</td>
                                        <td>{req.label}</td>
                                    </tr>
                                ))
                            }
                        </tbody>
                    </table>

                    {/* ✅ Button to navigate to Upload Source Code page */}
                    <button className="upload-code-btn" onClick={handleUploadCodeClick}>
                        Upload Source Code
                    </button>

                    {/* ✅ New Button to navigate to Repo History */}
                    <button className="history-btn" onClick={handleViewHistoryClick}>
                        View History
                    </button>
                </div>
            )}
        </div>
    );
};

export default RepoDetails;
