import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import axios from "axios";
import "./All.css";
const Allrepos = () => {
  const [repos, setRepos] = useState([]);
  const token = localStorage.getItem("token");

  useEffect(() => {
    const fetchRepos = async () => {
      if (!token) {
        console.error("❌ No token found! User not logged in.");
        return;
      }

      try {
        console.log("📡 Fetching all repositories...");
        const response = await axios.get("http://localhost:5000/api/repos/my-repos", {
          headers: { Authorization: `Bearer ${token}` },
        });

        console.log("✅ Fetched Repositories:", response.data);
        setRepos(response.data);
      } catch (error) {
        console.error("❌ Error fetching repositories:", error.response?.data || error.message);
      }
    };

    fetchRepos();
  }, [token]);

  return (
    <div>
      <h2>All Repositories</h2>
      <ul>
        {repos.length > 0 ? (
          repos.map((repo) => (
            <li key={repo._id}>
              <Link to={`/repo/${repo._id}`}>{repo.name}</Link> {/* ✅ Click to navigate to details */}
            </li>
          ))
        ) : (
          <p>No repositories available.</p>
        )}
      </ul>
    </div>
  );
};

export default Allrepos;
