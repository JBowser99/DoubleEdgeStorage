// ProtectedRoute.tsx — Secures routes based on authentication and optional admin-only access

import React from "react";
import { useAuth } from "./AuthProvider"; // Custom hook to access auth context
import { Navigate } from "react-router-dom"; // Used for redirecting

// Props for the ProtectedRoute component
interface ProtectedRouteProps {
  children: React.ReactNode;  // Component(s) to render if access is allowed
  adminOnly?: boolean;        // Optional flag: true if route should only be accessible to admins
}

// Functional component that wraps around protected routes
const ProtectedRoute: React.FC<ProtectedRouteProps> = ({ children, adminOnly = false }) => {
  // Get authentication state and role info from AuthProvider
  const { currentUser, isAdmin, loading } = useAuth();

  // While auth state is still loading, show a temporary placeholder (can be replaced with a spinner)
  if (loading) return <div>Loading...</div>;

  // If user is not logged in, redirect to login page
  if (!currentUser) return <Navigate to="/login" />;

  // If the route is admin-only and the user is not an admin, redirect to main user page
  if (adminOnly && !isAdmin) return <Navigate to="/main" />;

  // If access is allowed, render the protected component(s)
  return <>{children}</>;
};

export default ProtectedRoute;
