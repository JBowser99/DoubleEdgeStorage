// FileList.tsx — Displays user-uploaded files with options to delete or move them to a GCP bucket

import React, { useEffect, useState } from "react";
import { httpsCallable } from "firebase/functions";
import { ref, listAll, getDownloadURL, deleteObject } from "firebase/storage";
import { storage, functions } from "../firebaseConfig";
import { useAuth } from "../components/AuthProvider";

// Interface for representing a file's name and download URL
interface FileItem {
  name: string;
  url: string;
}

// Props for the FileList component
interface FileListProps {
  refresh: boolean;         // Triggers re-fetching files from parent
  onFilesMoved: () => void; // Callback to notify parent when files are moved
}

const FileList: React.FC<FileListProps> = ({ refresh, onFilesMoved }) => {
  const { currentUser } = useAuth(); // Access current authenticated user
  const [files, setFiles] = useState<FileItem[]>([]);            // All user-uploaded files
  const [selectedFiles, setSelectedFiles] = useState<string[]>([]); // Currently selected files
  const [error, setError] = useState<string | null>(null);       // Error state
  const [isMoving, setIsMoving] = useState(false);               // Moving-to-GCP loading flag
  const [isDeleting, setIsDeleting] = useState(false);           // Deleting loading flag

  // Fetches all files for the current user from Firebase Storage
  const fetchFiles = async () => {
    if (!currentUser) {
      setError("User is not authenticated.");
      return;
    }

    setError(null); // Clear any previous error

    const userFolderRef = ref(storage, `${currentUser.uid}`); // Reference to user folder in Firebase Storage

    try {
      const fileList = await listAll(userFolderRef); // List all files
      const fileURLs = await Promise.all(
        fileList.items.map(async (item) => ({
          name: item.name,
          url: await getDownloadURL(item), // Fetch download URL for each file
        }))
      );
      setFiles(fileURLs); // Update state with fetched files
    } catch (err) {
      console.error("Error fetching files:", err);
      setError("Failed to fetch files. Please try again.");
    }
  };

  // Toggles selection of all files
  const handleSelectAll = () => {
    if (selectedFiles.length === files.length) {
      setSelectedFiles([]); // Deselect all if already all selected
    } else {
      setSelectedFiles(files.map((file) => file.name)); // Select all file names
    }
  };

  // Deletes selected files from Firebase Storage
  const handleDeleteFiles = async () => {
    if (!currentUser) {
      setError("User is not authenticated.");
      return;
    }

    setIsDeleting(true);
    try {
      for (const fileName of selectedFiles) {
        const fileRef = ref(storage, `${currentUser.uid}/${fileName}`);
        await deleteObject(fileRef); // Delete file
        console.log(`File ${fileName} deleted successfully.`);
      }
      alert("Selected files deleted successfully.");
      setSelectedFiles([]);
      fetchFiles(); // Refresh the list
    } catch (error) {
      console.error("Error deleting files:", error);
      setError("Failed to delete selected files. Please try again.");
    } finally {
      setIsDeleting(false);
    }
  };

  // Moves selected files to a Google Cloud Platform bucket via Cloud Function
  const moveToGCPBucket = async () => {
    if (!currentUser) {
      setError("User is not authenticated.");
      return;
    }

    setIsMoving(true);
    const moveFile = httpsCallable(functions, "uploadToGCPBucket"); // Firebase Cloud Function

    try {
      for (const fileName of selectedFiles) {
        const file = files.find((file) => file.name === fileName);
        if (file) {
          console.log(`Moving file: ${file.name} to GCP bucket...`);
          await moveFile({ fileName: file.name, fileUrl: file.url }); // Call cloud function

          // Delete file from Firebase Storage after successful move
          const fileRef = ref(storage, `${currentUser.uid}/${file.name}`);
          await deleteObject(fileRef);
          console.log(`File ${file.name} deleted from Firebase Storage.`);
        }
      }

      alert("Selected files successfully moved to GCP bucket.");
      setSelectedFiles([]);
      onFilesMoved(); // Notify parent component
      fetchFiles(); // Refresh the list
    } catch (error) {
      console.error("Error moving files to GCP bucket:", error);
      setError("Failed to move files to the GCP bucket. Please try again.");
    } finally {
      setIsMoving(false);
    }
  };

  // Fetch user files on component mount or when refresh prop changes
  useEffect(() => {
    fetchFiles();
  }, [currentUser, refresh]);

  return (
    <div>
      <h2 className="text-lg font-bold mb-4">Your Uploaded Files</h2>

      {/* Error message display */}
      {error && <p className="text-red-500">{error}</p>}

      {/* Action buttons */}
      <div className="flex justify-between items-center mb-4">
        {/* Select/Unselect all toggle */}
        <button
          onClick={handleSelectAll}
          className="bg-gray-500 text-white py-1 px-4 rounded hover:bg-gray-600"
        >
          {selectedFiles.length === files.length ? "Unselect All" : "Select All"}
        </button>

        {/* Delete button */}
        <button
          onClick={handleDeleteFiles}
          disabled={isDeleting || selectedFiles.length === 0}
          className={`${
            selectedFiles.length > 0 && !isDeleting
              ? "bg-red-500 hover:bg-red-600"
              : "bg-gray-400 cursor-not-allowed"
          } text-white py-1 px-4 rounded`}
        >
          {isDeleting ? "Deleting..." : "Delete Selected"}
        </button>

        {/* Move to GCP bucket button */}
        <button
          onClick={moveToGCPBucket}
          disabled={isMoving || selectedFiles.length === 0}
          className={`${
            selectedFiles.length > 0 && !isMoving
              ? "bg-blue-500 hover:bg-blue-600"
              : "bg-gray-400 cursor-not-allowed"
          } text-white py-1 px-4 rounded`}
        >
          {isMoving ? "Moving..." : "Move to GCP Bucket"}
        </button>
      </div>

      {/* File list display */}
      <div className="max-h-80 overflow-y-auto border rounded shadow-md bg-gray-50">
        <ul className="divide-y divide-gray-200">
          {files.map((file) => (
            <li key={file.name} className="flex items-center justify-between p-2">
              <div className="flex items-center">
                {/* Checkbox for selecting file */}
                <input
                  type="checkbox"
                  checked={selectedFiles.includes(file.name)}
                  onChange={() =>
                    setSelectedFiles((prev) =>
                      prev.includes(file.name)
                        ? prev.filter((name) => name !== file.name)
                        : [...prev, file.name]
                    )
                  }
                  title={`Select ${file.name}`}
                  aria-label={`Select ${file.name}`}
                  className="mr-2"
                />

                {/* Clickable file name (opens download URL) */}
                <a
                  href={file.url}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-blue-500 hover:underline"
                >
                  {file.name}
                </a>
              </div>
            </li>
          ))}
        </ul>
      </div>
    </div>
  );
};

export default FileList;
