// AuthProvider.tsx — Provides global authentication context using Firebase Auth

import React, {
  createContext,
  useContext,
  useEffect,
  useState,
  ReactNode,
} from "react";
import {
  onAuthStateChanged,
  signInWithEmailAndPassword,
  signOut,
  User,
} from "firebase/auth";
import { doc, getDoc } from "firebase/firestore";
import { auth, db } from "../firebaseConfig"; // Firebase auth and Firestore

// Define the shape of the authentication context
interface AuthContextType {
  currentUser: User | null;       // Firebase User object or null if not logged in
  isAdmin: boolean;               // Role-based flag for admin access
  loading: boolean;               // Indicates if auth state is still being resolved
  login: (email: string, password: string) => Promise<void>;  // Login function
  logout: () => Promise<void>;    // Logout function
}

// Create the context with an initial undefined value
const AuthContext = createContext<AuthContextType | undefined>(undefined);

// The AuthProvider wraps the entire app and makes auth data accessible via context
export const AuthProvider: React.FC<{ children: ReactNode }> = ({ children }) => {
  const [currentUser, setCurrentUser] = useState<User | null>(null); // Tracks signed-in user
  const [isAdmin, setIsAdmin] = useState(false);                     // Tracks admin status
  const [loading, setLoading] = useState(true);                      // Auth state loading flag

  // Fetches admin role from Firestore 'users' collection
  const fetchAdminStatus = async (user: User) => {
    try {
      const userDoc = await getDoc(doc(db, "users", user.uid)); // Read from Firestore
      setIsAdmin(userDoc.exists() && userDoc.data()?.isAdmin === true); // Set admin flag
    } catch (err) {
      console.error("Error fetching user role:", err);
      setIsAdmin(false);
    }
  };

  // Listen to Firebase Auth state changes (login/logout/refresh)
  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, async (user) => {
      setLoading(true); // Begin loading on auth change
      setCurrentUser(user); // Set the new user

      if (user) {
        await fetchAdminStatus(user); // Determine admin role
      } else {
        setIsAdmin(false); // Reset admin flag if logged out
      }

      setLoading(false); // Done loading
    });

    return unsubscribe; // Cleanup listener on unmount
  }, []);

  // Handles user login and checks if user is admin
  const login = async (email: string, password: string): Promise<void> => {
    setLoading(true);
    try {
      await signInWithEmailAndPassword(auth, email, password); // Firebase login
      const user = auth.currentUser;
      if (user) await fetchAdminStatus(user); // Refresh admin flag
    } catch (err) {
      console.error("Login error:", err);
      throw err; // Propagate error to display it in UI
    } finally {
      setLoading(false);
    }
  };

  // Handles logout and resets all auth-related states
  const logout = async (): Promise<void> => {
    setLoading(true);
    try {
      await signOut(auth); // Firebase sign out
      setCurrentUser(null);
      setIsAdmin(false);
    } catch (err) {
      console.error("Logout error:", err);
    } finally {
      setLoading(false);
    }
  };

  // Provide the context values to the rest of the app
  return (
    <AuthContext.Provider value={{ currentUser, isAdmin, loading, login, logout }}>
      {children}
    </AuthContext.Provider>
  );
};

// Custom hook to access the AuthContext
export const useAuth = (): AuthContextType => {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error("useAuth must be used within an AuthProvider");
  }
  return context;
};
