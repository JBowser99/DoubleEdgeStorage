// FileUpload.tsx — Allows authenticated users to upload files to their personal Firebase Storage folder

import React, { useState } from "react";
import { ref, uploadBytes, getDownloadURL } from "firebase/storage";
import { storage } from "../firebaseConfig";
import { useAuth } from "./AuthProvider";

// Props for the FileUpload component
interface FileUploadProps {
  onUploadComplete: () => void; // Callback to refresh file list after upload
}

const FileUpload: React.FC<FileUploadProps> = ({ onUploadComplete }) => {
  const { currentUser } = useAuth(); // Get current authenticated user from context

  // State to track upload progress and error messages
  const [uploading, setUploading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Handles the actual upload process for a single file
  const handleUpload = async (file: File) => {
    if (!currentUser) {
      setError("User not authenticated.");
      return;
    }

    setUploading(true);   // Start uploading
    setError(null);       // Clear any previous errors

    // Reference to store the file under the user's UID
    const fileRef = ref(storage, `${currentUser.uid}/${file.name}`);

    try {
      console.log(`Uploading file: ${file.name}`);

      // Upload the file to Firebase Storage
      const snapshot = await uploadBytes(fileRef, file);

      // Get the file's public download URL (optional: can be stored in Firestore or shown to the user)
      const url = await getDownloadURL(snapshot.ref);
      console.log(`File uploaded successfully. URL: ${url}`);

      // Notify parent component to refresh file list
      onUploadComplete();
    } catch (err) {
      console.error("Error uploading file:", err);
      setError("Failed to upload file. Please try again.");
    } finally {
      setUploading(false); // Reset uploading state
    }
  };

  // Handles file selection from the file input
  const handleFileSelect = (event: React.ChangeEvent<HTMLInputElement>) => {
    const files = event.target.files;
    if (files) {
      for (const file of files) {
        handleUpload(file); // Upload each selected file
      }
    }
  };

  return (
    <div>
      {/* Show error message if upload fails */}
      {error && <p className="text-red-500 mb-4">{error}</p>}

      {/* Drag and drop / browse input section */}
      <div className="border-2 border-dashed border-gray-300 p-4 rounded mb-4 text-center">
        Drag and drop files here or{" "}
        <label className="text-white underline cursor-pointer">
          <input
            type="file"
            onChange={handleFileSelect}
            className="hidden"
            multiple // Allows multiple files to be selected and uploaded
          />
          browse files
        </label>
      </div>

      {/* Uploading indicator */}
      {uploading && <p className="text-blue-500 mb-4">Uploading...</p>}
    </div>
  );
};

export default FileUpload;
