// Signup.tsx — Handles user registration with Firebase Authentication

import React, { useState } from "react";
import { createUserWithEmailAndPassword } from "firebase/auth"; // Firebase function to create new user
import { useNavigate } from "react-router-dom"; // React Router navigation
import { auth } from "../firebaseConfig"; // Firebase auth instance

const Signup: React.FC = () => {
  // Local state to manage form input values and error display
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");

  // Used to redirect user after successful signup
  const navigate = useNavigate();

  // Handles form submission and account creation
  const handleSignup = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(""); // Clear any previous error messages

    try {
      // Create a new user with the provided email and password
      await createUserWithEmailAndPassword(auth, email, password);

      // If successful, redirect to the main application page
      navigate("/main");
    } catch (err: any) {
      const errorCode = err?.code || "unknown";

      // Human-friendly error messages for common Firebase errors
      const errorMessages: Record<string, string> = {
        "auth/email-already-in-use": "This email is already in use. Please log in.",
        "auth/weak-password": "Password is too weak. Please choose a stronger password.",
        "auth/invalid-email": "The email address is not valid.",
      };

      // Show appropriate error message or fallback
      setError(errorMessages[errorCode] || "Error creating account. Please try again.");
    }
  };

  return (
    <div className="flex items-center justify-center min-h-screen bg-gradient-to-br from-slate-300 to-blue-800">
      <div className="w-full max-w-md p-8 space-y-6 bg-blue-800/10 shadow-black/60 rounded-2xl shadow-lg">
        {/* Title */}
        <h2 className="text-2xl font-bold text-center text-gray-700">Sign Up</h2>

        {/* Error message display */}
        {error && <p className="text-sm text-red-500 text-center">{error}</p>}

        {/* Signup form */}
        <form onSubmit={handleSignup} className="space-y-4">
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
            autoComplete="new-password"
          />

          {/* Submit button */}
          <button
            type="submit"
            className="w-full py-2 text-white bg-blue-600 rounded-lg hover:bg-blue-700"
          >
            Sign Up
          </button>
        </form>

        {/* Link to login page for existing users */}
        <p className="text-center text-gray-600">
          Already have an account?{" "}
          <a
            href="/login"
            className="text-white hover:underline"
            onClick={() => setError("")} // Clear error when navigating away
          >
            Login
          </a>
        </p>
      </div>
    </div>
  );
};

export default Signup;
