import React from "react";
import { BrowserRouter as Router, Route, Routes, Navigate } from "react-router-dom";
import { AuthProvider, useAuth } from "./components/AuthProvider";
import ProtectedRoute from "./components/ProtectedRoute";
import Login from "./pages/Login";
import Signup from "./pages/Signup";
import Main from "./pages/Main";
import Adminpage from "./pages/Adminpage";
import NotFound from "./pages/NotFound";

const App: React.FC = () => (
  <Router>
    <AuthProvider>
      <Routes>
        {/* Initial routes available before authentication */}
        <Route path="/login" element={<Login />} />
        <Route path="/signup" element={<Signup />} />
        {/* Route accessible to authenticated users (regular users) */}
        <Route
          path="/main"
          element={
            <ProtectedRoute>
              <Main />
            </ProtectedRoute>
          }
        />
        {/* Route accessible only to admin users after login */}
        <Route
          path="/admin"
          element={
            <ProtectedRoute adminOnly>
              <Adminpage />
            </ProtectedRoute>
          }
        />
        {/* Root path redirects based on authentication and admin status */}
        <Route path="/" element={<RootRedirect />} />
        {/* Catch-all route for undefined paths (404) */}
        <Route path="*" element={<NotFound />} /> {/* Catch-all route for 404 */}
      </Routes>
    </AuthProvider>
  </Router>
);

// This component handles conditional redirecting after the app loads
const RootRedirect: React.FC = () => {
  const { isAdmin, loading, currentUser } = useAuth();

  // Wait until auth state is resolved
  if (loading) return <div>Loading...</div>; // Optionally add a spinner or loading component
  
  // Redirect to login if not authenticated
  if (!currentUser) return <Navigate to="/login" />;
  
  // Redirect based on user role
  return <Navigate to={isAdmin ? "/admin" : "/main"} />;
};

export default App;
