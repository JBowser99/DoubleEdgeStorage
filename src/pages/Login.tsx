// Login.tsx — Handles user login and conditional redirect based on user role

import React, { useState, useEffect } from "react";
import { useAuth } from "../components/AuthProvider"; // Custom auth context hook
import { Link, useNavigate } from "react-router-dom";

const Login: React.FC = () => {
  // Form input states
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");

  // Error state for displaying login failures
  const [error, setError] = useState("");

  // Access auth context functions and properties
  const { login, isAdmin, loading } = useAuth();

  // React Router hook to navigate after login
  const navigate = useNavigate();

  // Tracks whether the user has attempted login (used to trigger redirect)
  const [loginAttempted, setLoginAttempted] = useState(false);

  // Handle login form submission
  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(""); // Clear previous errors
    try {
      await login(email, password); // Try to log in via AuthProvider
      setLoginAttempted(true); // Trigger useEffect for post-login redirect
    } catch (err: any) {
      const errorCode = err?.code || "unknown";

      // Map Firebase error codes to user-friendly messages
      const errorMessages: Record<string, string> = {
        "auth/user-not-found": "No account found with this email. Please check or sign up.",
        "auth/wrong-password": "Incorrect password. Please try again.",
        "auth/invalid-email": "The email address is not valid.",
      };

      // Display mapped error or fallback
      setError(errorMessages[errorCode] || "Failed to log in. Please check your credentials.");
    }
  };

  // Watch for login completion, then redirect based on user role
  useEffect(() => {
    if (!loading && loginAttempted) {
      if (isAdmin) {
        // Admin user (custom claim or database flag) → redirect to secure admin dashboard
        navigate("/admin");
      } else {
        // Regular user → redirect to main app page
        navigate("/main");
      }
    }
  }, [isAdmin, loading, navigate, loginAttempted]);

  return (
    <div className="flex items-center justify-center min-h-screen bg-gradient-to-br from-slate-300 to-blue-800">
      <div className="w-full max-w-md p-8 space-y-6 bg-blue-800/10 shadow-black/60 rounded-2xl shadow-lg">
        {/* Login title */}
        <h2 className="text-2xl font-bold text-center text-gray-700">Login</h2>

        {/* Show error message if login fails */}
        {error && <p className="text-sm text-red-500 text-center">{error}</p>}

        {/* Login form */}
        <form onSubmit={handleLogin} className="space-y-4">
          {/* Email input */}
          <input
            type="email"
            placeholder="Email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            required
            className="w-full px-4 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
            autoComplete="email"
          />

          {/* Password input */}
          <input
            type="password"
            placeholder="Password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            required
            className="w-full px-4 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
            autoComplete="current-password"
          />

          {/* Submit button */}
          <button
            type="submit"
            className="w-full py-2 text-white bg-blue-600 rounded-lg hover:bg-blue-700"
          >
            Log In
          </button>
        </form>

        {/* Sign-up prompt for new users */}
        <p className="text-center text-gray-600">
          Don't have an account?{" "}
          <Link
            to="/signup"
            className="text-white hover:underline"
            onClick={() => setError("")} // Clear errors when navigating to sign-up
          >
            Sign Up
          </Link>
        </p>
      </div>
    </div>
  );
};

export default Login;
