import React, { useEffect, useState } from "react";
import { useAuth } from "../components/AuthProvider";
import { useNavigate } from "react-router-dom";
import { getFunctions, httpsCallable } from "firebase/functions";
import { FiMoreVertical } from "react-icons/fi";

// Define the structure of a user object
interface User {
  uid: string;
  email: string;
  displayName?: string;
  disabled?: boolean;
}

// Enum-style type for available admin actions
type AdminAction = "resetPassword" | "disableAccount" | "deleteAccount" | "enableAccount";

const Adminpage: React.FC = () => {
  // Pull auth context variables
  const { currentUser, isAdmin, logout, loading } = useAuth();
  const navigate = useNavigate();
  const [users, setUsers] = useState<User[]>([]);
  const [loadingUsers, setLoadingUsers] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [actionOpen, setActionOpen] = useState<string | null>(null); // Track open dropdown per user
  const functions = getFunctions(); // Firebase Functions instance

  // Redirect if not an admin after auth loads
  useEffect(() => {
    if (!loading && (!currentUser || !isAdmin)) {
      navigate("/main");
    }
  }, [loading, currentUser, isAdmin, navigate]);

  // Logs the user out and redirects to login
  const handleLogout = async () => {
    try {
      await logout();
      navigate("/login");
    } catch (err) {
      console.error("Logout failed:", err);
      alert("An error occurred while logging out. Please try again.");
    }
  };

  // Calls Firebase Cloud Function to fetch all users
  const fetchUsers = async () => {
    setLoadingUsers(true);
    setError(null);
    try {
      const fetchUsersFunction = httpsCallable(functions, "fetchUsers");
      const result = await fetchUsersFunction();
      const data = result.data as { success: boolean; users: User[] };

      if (data.success) {
        setUsers(data.users);
      } else {
        setError("Failed to load user list: Invalid response from server.");
      }
    } catch (error: any) {
      console.error("Error fetching users:", error);
      setError("Failed to load user list. Please check Firebase Function logs for more details.");
    } finally {
      setLoadingUsers(false);
    }
  };

  // Calls Firebase Function for selected admin action on a specific user
  const handleAdminAction = async (action: AdminAction, uid: string) => {
    const actionFunctions = {
      resetPassword: httpsCallable(functions, "resetUserPassword"),
      disableAccount: httpsCallable(functions, "disableUserAccount"),
      enableAccount: httpsCallable(functions, "enableUserAccount"),
      deleteAccount: httpsCallable(functions, "deleteUserAccount"),
    };

    try {
      const result = await actionFunctions[action]({ uid });
      const data = result.data as { success: boolean; message: string };
      alert(data.message);

      // Update local user state depending on the action result
      if (action === "deleteAccount") {
        setUsers(users.filter(user => user.uid !== uid));
      } else if (action === "disableAccount") {
        setUsers(users.map(user => (user.uid === uid ? { ...user, disabled: true } : user)));
      } else if (action === "enableAccount") {
        setUsers(users.map(user => (user.uid === uid ? { ...user, disabled: false } : user)));
      }
    } catch (error: any) {
      console.error("Error performing admin action:", error);
      alert(`Failed to perform action: ${error.message || "Unknown error"}`);
    } finally {
      setActionOpen(null);
    }
  };

  // Closes dropdown menu when clicking outside of it
  const handleOutsideClick = (e: MouseEvent) => {
    if (actionOpen && !(e.target as HTMLElement).closest(`#settings-menu-${actionOpen}`)) {
      setActionOpen(null);
    }
  };

  // Adds/removes listener for outside clicks to close dropdowns
  useEffect(() => {
    document.addEventListener("mousedown", handleOutsideClick);
    return () => {
      document.removeEventListener("mousedown", handleOutsideClick);
    };
  }, [actionOpen]);

  // Fetch user list on component mount
  useEffect(() => {
    fetchUsers();
  }, []);

  // Show a loading screen if auth is still verifying
  if (loading) return <div>Loading...</div>;

  // If not authorized, show fallback
  if (!isAdmin) return <div>Unauthorized access. Redirecting...</div>;

  // Render Admin Dashboard UI
  return (
    <div className="flex flex-col items-center justify-center min-h-screen bg-gradient-to-br from-slate-300 to-blue-800 p-4">
      <h1 className="text-4xl font-bold text-gray-800 mb-4">Admin Dashboard</h1>
      <p className="text-lg text-gray-700 mb-6">
        Welcome, {currentUser?.email}! You have full access to admin controls.
      </p>

      {/* Button to fetch the latest user list */}
      <button
        onClick={fetchUsers}
        className="mb-4 px-4 py-2 bg-green-500 text-white rounded-lg hover:bg-green-600 transition-all"
        disabled={loadingUsers}
        aria-label="Load Users"
      >
        {loadingUsers ? "Loading Users..." : "Load Users"}
      </button>

      {/* Error message if fetch fails */}
      {error && <p className="text-red-500 mb-4">{error}</p>}

      {/* User Management Panel */}
      <div className="bg-blue-800/10 shadow-black/60 rounded-2xl shadow-lg p-6 max-w-3xl w-full mb-4">
        <h2 className="text-2xl font-semibold mb-4">User Management</h2>

        <div className="max-h-64 border mb-4 p-4 bg-blue-800/10 shadow-black/60 rounded-2xl shadow-lg">
          {users.length > 0 ? (
            users.map((user) => (
              <div key={user.uid} className="flex items-center justify-between mb-2 relative">
                <span>{user.email}</span>
                {user.disabled && <span className="text-red-500 ml-2">Disabled</span>}

                {/* Button to open dropdown menu for this user */}
                <button
                  onClick={() => setActionOpen(actionOpen === user.uid ? null : user.uid)}
                  className="ml-4 p-2 rounded-full bg-gray-200 hover:bg-gray-300 transition-all"
                  aria-label="Open settings menu for user"
                  title="Settings"
                >
                  <FiMoreVertical className="text-gray-600" />
                </button>

                {/* Dropdown menu with admin actions */}
                {actionOpen === user.uid && (
                  <div
                    id={`settings-menu-${user.uid}`}
                    className="absolute right-0 top-10 w-48 bg-white shadow-lg rounded-lg p-4 z-20 border border-gray-200"
                  >
                    <button
                      onClick={() => handleAdminAction("resetPassword", user.uid)}
                      className="block w-full text-left px-4 py-2 mb-2 text-sm text-gray-700 hover:bg-yellow-100 rounded-lg"
                      aria-label="Reset password"
                      title="Reset Password"
                    >
                      Reset Password
                    </button>
                    <button
                      onClick={() =>
                        handleAdminAction(user.disabled ? "enableAccount" : "disableAccount", user.uid)
                      }
                      className="block w-full text-left px-4 py-2 mb-2 text-sm text-gray-700 hover:bg-orange-100 rounded-lg"
                      aria-label={user.disabled ? "Re-enable Account" : "Disable Account"}
                      title={user.disabled ? "Re-enable Account" : "Disable Account"}
                    >
                      {user.disabled ? "Re-enable Account" : "Disable Account"}
                    </button>
                    <button
                      onClick={() => handleAdminAction("deleteAccount", user.uid)}
                      className="block w-full text-left px-4 py-2 text-sm text-gray-700 hover:bg-red-100 rounded-lg"
                      aria-label="Delete Account"
                      title="Delete Account"
                    >
                      Delete Account
                    </button>
                  </div>
                )}
              </div>
            ))
          ) : (
            <p className="text-gray-500">No users available. Click "Load Users" to fetch the list.</p>
          )}
        </div>
      </div>

      {/* Logout button */}
      <button
        onClick={handleLogout}
        className="mt-8 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-all"
        aria-label="Logout"
        title="Logout"
      >
        Logout
      </button>
    </div>
  );
};

export default Adminpage;
