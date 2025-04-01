// Main.tsx
import React, { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import FileUpload from "../components/FileUpload";
import FileList from "../components/FileList";
import GCPBucketList from "../components/GCPBucketList";
import { getAuth } from "firebase/auth";
import { doc, setDoc } from "firebase/firestore";
import { db, functions } from "../firebaseConfig";
import { httpsCallable } from "firebase/functions";
import { useAuth } from "../components/AuthProvider";

const Main: React.FC = () => {
  const { currentUser, logout } = useAuth();
  const navigate = useNavigate();
  const [refreshFiles, setRefreshFiles] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [accessGranted, setAccessGranted] = useState(false);
  const [error, setError] = useState("");
  const auth = getAuth();

  // Redirect unauthenticated users to the login page
  useEffect(() => {
    if (!currentUser) {
      navigate("/login");
    }
  }, [currentUser, navigate]);

  // Logout handler
  const handleLogout = async () => {
    await logout();
    navigate("/login");
  };

  // Grant GCP Access handler
  const handleGrantAccess = async () => {
    setError("");
    setIsLoading(true);
    const grantAccess = httpsCallable(functions, "grantGCPAccess");
    try {
      const response: any = await grantAccess();
      console.log(response.data.message);
      const user = auth.currentUser;
      if (user) {
        await user.getIdToken(true); // Refresh token to include updated claims
      }
      setAccessGranted(true);
      alert("GCP access granted successfully.");
    } catch (error: any) {
      console.error("Error granting GCP access:", error);
      setError("Failed to grant access. Please try again.");
    } finally {
      setIsLoading(false);
    }
  };

  // Check GCP Access
  useEffect(() => {
    const checkGCPAccess = async () => {
      try {
        const user = auth.currentUser;
        if (user) {
          const idTokenResult = await user.getIdTokenResult();
          setAccessGranted(Boolean(idTokenResult.claims.gcpAccess));
        }
      } catch (error) {
        console.error("Error checking GCP access:", error);
      }
    };
    checkGCPAccess();
  }, []);

  // Temporary function to set admin access
  const handleSetAdmin = async () => {
    if (currentUser?.email === "joshabrams40@gmail.com") {
      const userRef = doc(db, "users", currentUser.uid);
      await setDoc(userRef, { isAdmin: true }, { merge: true });
      alert("Admin access granted.");
    } else {
      alert("Admin access can only be granted to 'joshabrams40@gmail.com'.");
    }
  };

  return (
    <div className="flex items-center justify-center min-h-screen bg-gradient-to-br from-slate-300 to-blue-800">
      {/* This container mimics your login page card with plenty of blank space around it */}
      <div className="w-full max-w-md p-4 space-y-2 bg-blue-800/10 shadow-black/60 rounded-2xl">
        {/* Header and Logout */}
        <div className="flex justify-between items-center">
          <h1 className="text-3xl font-extrabold text-gray-800">
            Welcome to Your Dashboard
          </h1>
          <button
            onClick={handleLogout}
            className={`bg-red-500 text-white px-4 py-2 rounded-lg shadow-md ${
              isLoading ? "opacity-50 cursor-not-allowed" : "hover:bg-red-600"
            }`}
            disabled={isLoading}
          >
            Logout
          </button>
        </div>

        {/* Error Message */}
        {error && (
          <p className="bg-red-100 text-red-700 px-4 py-2 rounded-lg">
            {error}
          </p>
        )}

        {/* Admin Access Button */}
        {currentUser?.email === "joshabrams40@gmail.com" && (
          <button
            onClick={handleSetAdmin}
            className="px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700"
          >
            Grant Admin Access
          </button>
        )}

        {/* GCP Access Button */}
        <button
          onClick={handleGrantAccess}
          className={`bg-blue-500 text-white px-4 py-2 rounded-lg shadow-md ${
            isLoading || accessGranted
              ? "opacity-50 cursor-not-allowed"
              : "hover:bg-blue-600"
          }`}
          disabled={isLoading || accessGranted}
        >
          {accessGranted ? "Access Granted" : "Grant GCP Access"}
        </button>

        {/* File and Photo Upload Section */}
        <div className="bg-blue-800/10 shadow-black/60 rounded-2xl p-4">
          <h2 className="text-xl font-bold text-gray-800 mb-2">
            File and Photo Upload
          </h2>
          <FileUpload onUploadComplete={() => setRefreshFiles((prev) => !prev)} />
        </div>

        {/* Your Files Section */}
        <div className="bg-blue-800/10 shadow-black/60 rounded-2xl p-4">
          <h2 className="text-xl font-bold text-gray-800 mb-2">Your Files</h2>
          <FileList
            refresh={refreshFiles}
            onFilesMoved={() => setRefreshFiles((prev) => !prev)}
          />
        </div>

        {/* GCP Bucket Files Section */}
        <div className="bg-blue-800/10 shadow-black/60 rounded-2xl p-4">
          <h2 className="text-xl font-bold text-gray-800 mb-2">
            Files in GCP Bucket
          </h2>
          <GCPBucketList
            refresh={refreshFiles}
            onFilesReceived={() => setRefreshFiles((prev) => !prev)}
          />
        </div>
      </div>
    </div>
  );
};

export default Main;
