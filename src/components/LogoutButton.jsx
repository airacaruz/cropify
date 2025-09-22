import { getAuth, signOut } from "firebase/auth";
import { useNavigate } from "react-router-dom";
import { app } from "../firebase";
import { adminAuditActions } from "../utils/adminAuditLogger";

function LogoutButton({ adminId, adminName }) {
  const navigate = useNavigate();
  const auth = getAuth(app);

  const handleLogout = async () => {
    try {
      // Log the logout action before signing out
      if (adminId && adminName) {
        await adminAuditActions.logout(adminId, adminName);
      }
      
      await signOut(auth);
      navigate("/", { replace: true }); 
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
