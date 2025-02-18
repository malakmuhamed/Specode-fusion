import React, { useState, useEffect } from "react";
import { IoMdMenu } from "react-icons/io";
import { Link, useNavigate } from "react-router-dom";

// Navbar menu items
const NavbarMenu = [
  { id: 1, title: "Home", path: "/" },
  { id: 2, title: "All Repo", path: "/Allrepos" },
  { id: 3, title: "Create repo", path: "/Dashboarddmalak" },
  { id: 4, title: "My Profile", path: "/UserProfile" },
];

const Navbar = () => {
  const [isOpen, setIsOpen] = useState(false);
  const [user, setUser] = useState(null);
  const navigate = useNavigate();

  // Check if user is logged in
  useEffect(() => {
    const storedUser = localStorage.getItem("user");
    if (storedUser) {
      setUser(JSON.parse(storedUser));
    }
  }, []);

  // Logout function
  const handleLogout = () => {
    localStorage.removeItem("user");
    localStorage.removeItem("token");
    setUser(null);
    navigate("/login"); // Redirect to login page
  };

  // ✅ Handle "Requirement Extraction" Click
  const handleRequirementExtraction = () => {
    if (user) {
      navigate("/upload-srs"); // ✅ If logged in, go to upload page
    } else {
      navigate("/login"); // ❌ If not logged in, go to login page
    }
  };

  return (
    <nav className="bg-white shadow-md">
      <div className="container mx-auto flex justify-between items-center py-4 px-6">
        {/* Logo (Clickable to Home) */}
        <Link to="/" className="font-bold text-2xl text-blue-600">
          SpeCode Fusion
        </Link>

        {/* Desktop Menu */}
        <div className="hidden lg:flex space-x-6">
          {NavbarMenu.map((menu) => (
            <Link
              key={menu.id}
              to={menu.path}
              className="text-gray-700 hover:text-blue-500 transition"
            >
              {menu.title}
            </Link>
          ))}

          {/* Requirement Extraction with Login Check */}
          <button
            onClick={handleRequirementExtraction}
            className="text-gray-700 hover:text-blue-500 transition"
          >
            Requirement Extraction
          </button>

          {user ? (
            // If user is logged in, show username & logout button
            <div className="flex items-center space-x-4">
              <span className="text-gray-700">Welcome, {user.username}!</span>
              <button
                onClick={handleLogout}
                className="bg-red-500 text-white px-4 py-2 rounded-lg hover:bg-red-600 transition"
              >
                Logout
              </button>
            </div>
          ) : (
            // If user is NOT logged in, show Sign In button
            <Link to="/login" className="primary-btn">
              Sign In
            </Link>
          )}
        </div>

        {/* Mobile Menu Button */}
        <button
          className="lg:hidden text-3xl text-gray-700"
          onClick={() => setIsOpen(!isOpen)}
        >
          <IoMdMenu />
        </button>
      </div>

      {/* Mobile Menu Dropdown */}
      {isOpen && (
        <div className="lg:hidden bg-white shadow-md py-4 px-6">
          {NavbarMenu.map((menu) => (
            <Link
              key={menu.id}
              to={menu.path}
              className="block text-gray-700 py-2 hover:text-blue-500 transition"
            >
              {menu.title}
            </Link>
          ))}
          
          {/* Requirement Extraction in Mobile Menu */}
          <button
            onClick={handleRequirementExtraction}
            className="block text-gray-700 py-2 hover:text-blue-500 transition"
          >
            Requirement Extraction
          </button>

          {user ? (
            <div className="mt-4">
              <p className="text-gray-700">Welcome, {user.username}!</p>
              <button
                onClick={handleLogout}
                className="bg-red-500 text-white w-full px-4 py-2 mt-2 rounded-lg hover:bg-red-600 transition"
              >
                Logout
              </button>
            </div>
          ) : (
            <Link to="/login" className="block bg-blue-500 text-white text-center py-2 rounded-lg hover:bg-blue-600 transition mt-4">
              Sign In
            </Link>
          )}
        </div>
      )}
    </nav>
  );
};

export default Navbar;
