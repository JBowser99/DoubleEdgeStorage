// GCPBucketList.tsx — Lists files stored in a Google Cloud Platform (GCP) bucket
// Allows authenticated users to view, select, and "receive" (download) files via Firebase Cloud Functions

import React, { useEffect, useState } from "react";
import { httpsCallable } from "firebase/functions";
import { useAuth } from "../components/AuthProvider";
import { functions } from "../firebaseConfig";

// File item interface representing a file's name and download URL
interface FileItem {
  name: string;
  url: string;
}

// Props passed from parent component
interface GCPBucketListProps {
  refresh: boolean; // Triggers re-fetching when changed
  onFilesReceived: () => void; // Callback after files are successfully received
}

const GCPBucketList: React.FC<GCPBucketListProps> = ({ refresh, onFilesReceived }) => {
  const { currentUser } = useAuth(); // Get current authenticated user
  const [files, setFiles] = useState<FileItem[]>([]); // List of GCP bucket files
  const [selectedFiles, setSelectedFiles] = useState<string[]>([]); // Names of selected files
  const [error, setError] = useState<string | null>(null); // Error state
  const [isLoading, setIsLoading] = useState(false); // Loading state for initial fetch
  const [isReceiving, setIsReceiving] = useState(false); // Loading state for receiving files

  // Fetches file list from GCP bucket using a Firebase Cloud Function
  const fetchGCPFiles = async () => {
    if (!currentUser) return;

    setIsLoading(true);
    setError(null);

    const listFiles = httpsCallable(functions, "listGCPFiles");

    try {
      const response: any = await listFiles();
      setFiles(response.data.files || []); // Set files if returned
    } catch (err) {
      console.error("Error fetching GCP files:", err);
      setError("Failed to fetch files from GCP bucket. Please try again.");
    } finally {
      setIsLoading(false); // Always stop loading, success or fail
    }
  };

  // Receives selected files from the GCP bucket via Firebase Cloud Function
  const handleReceiveFiles = async () => {
    if (!currentUser) {
      setError("User is not authenticated.");
      return;
    }

    setIsReceiving(true);
    setError(null);

    const receiveFile = httpsCallable(functions, "downloadFromGCPBucket");
    let successfulDownloads: string[] = [];
    let failedDownloads: string[] = [];

    try {
      // Attempt to download each selected file
      for (const fileName of selectedFiles) {
        console.log(`Receiving file: ${fileName} from GCP bucket...`);
        try {
          await receiveFile({ fileName }); // Call Firebase function
          successfulDownloads.push(fileName);
          console.log(`File ${fileName} received successfully.`);
        } catch (fileError) {
          console.error(`Error receiving file ${fileName}:`, fileError);
          failedDownloads.push(fileName);
        }
      }

      // Show summary alert after receiving files
      if (successfulDownloads.length > 0) {
        alert(
          `Successfully received ${successfulDownloads.length} files. ${
            failedDownloads.length > 0
              ? `${failedDownloads.length} files failed to download.`
              : ""
          }`
        );
      }

      setSelectedFiles([]); // Clear selection
      onFilesReceived(); // Notify parent to refresh local file list
      fetchGCPFiles(); // Refresh GCP file list
    } catch (error) {
      console.error("Error receiving files:", error);
      setError("Failed to receive files from GCP bucket. Please try again.");
    } finally {
      setIsReceiving(false);
    }
  };

  // Fetch files on mount and whenever `refresh` or user changes
  useEffect(() => {
    fetchGCPFiles();
  }, [refresh, currentUser]);

  // Select/unselect all files in the list
  const handleSelectAll = () => {
    if (selectedFiles.length === files.length) {
      setSelectedFiles([]); // Unselect all
    } else {
      setSelectedFiles(files.map((file) => file.name)); // Select all
    }
  };

  return (
    <div>
      {/* Title */}
      <h2 className="text-lg font-bold mb-4">Your GCP Bucket Files</h2>

      {/* Error message */}
      {error && <p className="text-red-500">{error}</p>}

      {/* Action buttons */}
      <div className="flex justify-between items-center mb-4">
        <button
          onClick={handleSelectAll}
          className="bg-gray-500 text-white py-1 px-4 rounded hover:bg-gray-600"
        >
          {selectedFiles.length === files.length ? "Unselect All" : "Select All"}
        </button>

        <button
          onClick={handleReceiveFiles}
          disabled={isReceiving || selectedFiles.length === 0}
          className={`${
            selectedFiles.length > 0 && !isReceiving
              ? "bg-green-500 hover:bg-green-600"
              : "bg-gray-400 cursor-not-allowed"
          } text-white py-1 px-4 rounded`}
        >
          {isReceiving ? "Receiving..." : `Receive Selected (${selectedFiles.length})`}
        </button>
      </div>

      {/* File list or loading message */}
      {isLoading ? (
        <p className="text-blue-500">Loading files...</p>
      ) : (
        <ul className="divide-y divide-gray-200 bg-gray-50 rounded shadow-md max-h-80 overflow-y-auto">
          {files.map((file) => (
            <li key={file.name} className="p-2 flex justify-between items-center">
              <div className="flex items-center">
                {/* Checkbox to select file */}
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

                {/* File download link */}
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
      )}
    </div>
  );
};

export default GCPBucketList;
