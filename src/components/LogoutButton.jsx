import { getAuth, signOut } from "firebase/auth";
import { useNavigate } from "react-router-dom";
import { app } from "../firebase";

function LogoutButton() {
  const navigate = useNavigate();
  const auth = getAuth(app);

  const handleLogout = async () => {
    try {
      await signOut(auth);
      navigate("/", { replace: true }); 
      alert("Logged out successfully!");
    } catch (error) {
      console.error("Logout error:", error);
      alert("Failed to logout.");
    }
  };

  return (
    <button onClick={handleLogout} className="logout-button">
      Sign out
    </button>
  );
}

export default LogoutButton;
