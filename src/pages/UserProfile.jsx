import React, { useState, useEffect } from "react";
import axios from "axios";
import { Link, useNavigate } from "react-router-dom"; // Import useNavigate
import avatar from "../assets/images/profileavatar.png";
import Navbar from "../components/Navbar/Navbar";

const UserProfile = () => {
  const [editing, setEditing] = useState(false);
  const [user, setUser] = useState({
    name: "",
    email: "",
    profilePicture: avatar,
  });

  const [reports, setReports] = useState([]);
  const navigate = useNavigate(); // Initialize navigate

  useEffect(() => {
    // Check if user is logged in
    const token = localStorage.getItem("token");
    if (!token) {
      navigate("/login"); // Redirect to login if not logged in
    } else {
      // Fetch user profile from backend
      axios
        .get("http://localhost:5000/api/users/profile", {
          headers: { Authorization: `Bearer ${token}` },
        })
        .then((res) => setUser(res.data))
        .catch((err) => console.error("Error fetching profile:", err));

      // Fetch user reports from backend
      axios
        .get("http://localhost:5000/api/users/reports", {
          headers: { Authorization: `Bearer ${token}` },
        })
        .then((res) => setReports(res.data))
        .catch((err) => console.error("Error fetching reports:", err));
    }
  }, [navigate]);

  const toggleEdit = () => {
    setEditing(!editing);
  };

  const updateProfile = (e) => {
    e.preventDefault();
    const token = localStorage.getItem("token");
    if (!token) {
      navigate("/login");
    } else {
      axios
        .put(
          "http://localhost:5000/api/users/profile",
          { username: user.name, email: user.email }, // Change `name` to `username`
          { headers: { Authorization: `Bearer ${token}` } }
        )
        .then((res) => {
          setUser(res.data.user);
          alert("Profile updated successfully!");
          setEditing(false);
        })
        .catch((err) => alert("Error updating profile:", err.response.data.message));
    }
  };

  // Function to delete the profile and log the user out
  const deleteProfile = () => {
    const token = localStorage.getItem("token");
    if (!token) {
      navigate("/login");
    } else {
      axios
        .delete("http://localhost:5000/api/users/profile", {
          headers: { Authorization: `Bearer ${token}` },
        })
        .then(() => {
          alert("Account deleted successfully!");
          localStorage.removeItem("token"); // Remove the token from local storage
          navigate("/"); // Redirect to the home page (user is logged out)
        })
        .catch((err) => alert("Error deleting profile:", err.response.data.message));
    }
  };

  return (
    <>
      <Navbar />
      <div className="min-h-screen bg-gray-100 p-6">
        <header className="bg-blue-500 text-white text-left text-xl font-semibold py-4 px-6 rounded-lg shadow-md mb-6">
          User Profile
        </header>

        <div className="bg-white p-6 shadow-md rounded-lg mb-8">
          <div className="flex items-center gap-4">
            <img src={user.profilePicture} alt="Profile" className="w-20 h-20 rounded-full object-cover" />
            <div>
              <h2 className="text-xl font-semibold">{user.name}</h2>
              <p className="text-gray-600">{user.email}</p>
            </div>
          </div>

          <div className="flex gap-4 justify-end mt-4">
            <button onClick={toggleEdit} className="bg-blue-500 text-white py-2 px-4 rounded-lg">
              {editing ? "Cancel" : "Edit Profile"}
            </button>
            <Link to="/change-password" className="bg-blue-500 text-white py-2 px-4 rounded-lg">
              Change Password
            </Link>
          </div>
        </div>

        {editing && (
          <div className="fixed inset-0 bg-gray-800 bg-opacity-50 flex justify-center items-center">
            <div className="bg-white p-6 rounded-lg shadow-md w-96">
              <h3 className="text-lg font-semibold mb-4">Edit Profile</h3>
              <form onSubmit={updateProfile}>
                <input
                  type="text"
                  value={user.name}
                  onChange={(e) => setUser({ ...user, name: e.target.value })}
                  className="w-full px-4 py-2 border rounded-lg"
                  placeholder="Name"
                />
                <input
                  type="email"
                  value={user.email}
                  onChange={(e) => setUser({ ...user, email: e.target.value })}
                  className="w-full px-4 py-2 border rounded-lg"
                  placeholder="Email"
                />
                <button type="submit" className="bg-blue-500 text-white py-2 px-4 rounded-lg">
                  Save Changes
                </button>
              </form>
            </div>
          </div>
        )}

        <div className="bg-white p-6 shadow-md rounded-lg mb-8">
          <h3 className="text-lg font-semibold mb-4">Reports History</h3>
          <table className="w-full table-auto border-collapse border border-gray-300">
            <tbody>
              {reports.map((report) => (
                <tr key={report.id}>
                  <td>{report.date}</td>
                  <td>{report.title}</td>
                  <td>{report.status}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        {/* Add the delete button */}
        <div className="flex justify-center">
          <button
            onClick={deleteProfile}
            className="bg-red-500 text-white py-2 px-4 rounded-lg mt-4"
          >
            Delete Account
          </button>
        </div>
      </div>
    </>
  );
};

export default UserProfile;
