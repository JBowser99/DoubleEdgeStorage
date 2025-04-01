import * as functions from "firebase-functions/v1";
import * as admin from "firebase-admin";
import { Storage, UploadOptions } from "@google-cloud/storage";
import fetch from "node-fetch-commonjs";
import * as fs from "fs";
import * as path from "path";
import { onCall, HttpsError, CallableRequest } from 'firebase-functions/v2/https';

// Initialize Firebase Admin SDK
if (!admin.apps.length) {
  admin.initializeApp();
}

// Initialize Google Cloud Storage
const storage = new Storage();
const bucketName = "double-edge-coldline-bucket-030340395"; // Replace with your bucket name

/**
 * Cloud Function: Set Custom Claims
 * This function adds custom claims to new users without creating Firestore documents.
 */
export const setCustomClaims = functions.auth.user().onCreate(async (user) => {
  try {
    const { email, uid } = user;

    if (!email) {
      console.error(`User ${uid} does not have an email.`);
      return;
    }

    const isGCPEnabled = email.endsWith("@example.com");
    await admin.auth().setCustomUserClaims(uid, { gcpAccess: isGCPEnabled });

    console.log(`Custom claims set for user ${uid}: gcpAccess=${isGCPEnabled}`);
  } catch (error) {
    console.error("Error setting custom claims:", error);
    throw new functions.https.HttpsError("internal", "Failed to set custom claims.");
  }
});

// === 4. Set custom Admin claims ===
export const setCustomAdminClaims = onCall({ region: 'us-central1' }, async (request) => {
  if (!request.auth) {
    throw new HttpsError('unauthenticated', 'You must be authenticated to set custom claims.');
  }

  const { email, isAdmin } = request.data as { email: string; isAdmin: boolean };

  if (typeof isAdmin !== 'boolean') {
    throw new HttpsError('invalid-argument', 'The "isAdmin" field must be a boolean.');
  }

  if (!email) {
    throw new HttpsError('invalid-argument', 'The "email" parameter is required.');
  }

  try {
    // Get the user by email
    const user = await admin.auth().getUserByEmail(email);

    // Set custom claims in Firebase Authentication
    await admin.auth().setCustomUserClaims(user.uid, { gcpAccess: true, admin: isAdmin });

    // Save user information in Firestore
    await admin.firestore().doc(`users/${user.uid}`).set(
      {
        email,
        isAdmin,
        gcpAccess: true,
        createdAt: admin.firestore.FieldValue.serverTimestamp(),
      },
      { merge: true }
    );

    return { success: true, message: `Custom claims updated for user: ${email}` };
  } catch (error) {
    console.error('Error setting custom claims:', error);
    throw new HttpsError('unknown', 'Failed to set custom claims.');
  }
});

// Middleware to check if the user is an admin
const checkAdminAuth = (request: CallableRequest<unknown>) => {
  if (!request.auth || !request.auth.token || !request.auth.token.admin) {
    throw new HttpsError("permission-denied", "You must be an admin to perform this action.");
  }
};

// Fetch all users function
export const fetchUsers = onCall({ region: 'us-central1' }, async (request) => {
  checkAdminAuth(request); // Ensures only admins can call this function

  try {
    const users: { uid: string; email: string | null; displayName?: string | null; disabled: boolean }[] = [];
    let pageToken: string | undefined = undefined;

    // Loop to paginate through users if needed
    do {
      // Annotate with the correct type: ListUsersResult
      const listUsersResult: admin.auth.ListUsersResult = await admin.auth().listUsers(1000, pageToken); // Fetch 1000 users per request
      const userRecords = listUsersResult.users;

      // Explicitly typing userRecord
      userRecords.forEach((userRecord: admin.auth.UserRecord) => {  // <-- Add type here
        users.push({
          uid: userRecord.uid,
          email: userRecord.email ?? null,  // Explicitly assign null if email is undefined
          displayName: userRecord.displayName ?? null, // Explicitly assign null if displayName is undefined
          disabled: userRecord.disabled,
        });
      });

      // Move to the next page if there is one
      pageToken = listUsersResult.pageToken;
    } while (pageToken);

    return { success: true, users };
  } catch (error) {
    console.error("Error fetching users:", error);
    throw new HttpsError("unknown", "Failed to fetch users.");
  }
});

// Reset User Password
export const resetUserPassword = onCall({ region: 'us-central1' }, async (request) => {
  checkAdminAuth(request);
  const { uid } = request.data;

  if (!uid) {
    throw new HttpsError("invalid-argument", "UID is required to reset the password.");
  }

  const newPassword = Math.random().toString(36).slice(-8);
  try {
    await admin.auth().updateUser(uid, { password: newPassword });
    return { success: true, message: `Password reset successfully: ${newPassword}` };
  } catch (error) {
    console.error("Error resetting password:", error);
    throw new HttpsError("unknown", "Failed to reset password.");
  }
});

// Disable User Account
export const disableUserAccount = onCall({ region: 'us-central1' }, async (request) => {
  checkAdminAuth(request);
  const { uid } = request.data;

  if (!uid) {
    throw new HttpsError("invalid-argument", "UID is required to disable the account.");
  }

  try {
    await admin.auth().updateUser(uid, { disabled: true });
    return { success: true, message: "User account disabled successfully." };
  } catch (error) {
    console.error("Error disabling user account:", error);
    throw new HttpsError("unknown", "Failed to disable user account.");
  }
});

// Enable User Account
export const enableUserAccount = onCall({ region: 'us-central1' }, async (request) => {
  checkAdminAuth(request);
  const { uid } = request.data;

  if (!uid) {
    throw new HttpsError("invalid-argument", "UID is required to enable the account.");
  }

  try {
    await admin.auth().updateUser(uid, { disabled: false });
    return { success: true, message: "User account enabled successfully." };
  } catch (error) {
    console.error("Error enabling user account:", error);
    throw new HttpsError("unknown", "Failed to enable user account.");
  }
});

// Delete User Account
export const deleteUserAccount = onCall({ region: 'us-central1' }, async (request) => {
  checkAdminAuth(request);
  const { uid } = request.data;

  if (!uid) {
    throw new HttpsError("invalid-argument", "UID is required to delete the account.");
  }

  try {
    await admin.auth().deleteUser(uid);
    return { success: true, message: "User account deleted successfully." };
  } catch (error) {
    console.error("Error deleting user account:", error);
    throw new HttpsError("unknown", "Failed to delete user account.");
  }
});


//______________________________________________________________________________________________________________________


/**
 * Cloud Function: Upload to GCP Bucket
 * Handles file uploads to a GCP bucket and updates Firestore.
 */
export const uploadToGCPBucket = functions.https.onCall(
  async (data: { fileName: string; fileUrl: string }, context) => {
    if (!context.auth) {
      throw new functions.https.HttpsError("unauthenticated", "User not authenticated.");
    }

    const { fileName, fileUrl } = data;
    const uid = context.auth.uid;
    const destination = `${uid}/${fileName}`;
    const bucket = storage.bucket(bucketName);

    try {
      console.log(`Fetching file from URL: ${fileUrl}`);
      const response = await fetch(fileUrl);

      if (!response.ok) {
        throw new Error(`Failed to fetch file. Status: ${response.status}`);
      }

      const tempFilePath = path.join("/tmp", fileName);
      const writeStream = fs.createWriteStream(tempFilePath);

      await new Promise<void>((resolve, reject) => {
        response.body?.pipe(writeStream);
        response.body?.on("error", reject);
        writeStream.on("finish", resolve);
      });

      const uploadOptions: UploadOptions = {
        destination,
        metadata: {
          contentType: response.headers.get("content-type") || "application/octet-stream",
        },
      };

      await bucket.upload(tempFilePath, uploadOptions);

      // Update Firestore with the file information
      await admin
        .firestore()
        .collection("gcpFiles")
        .doc(uid)
        .collection("files")
        .doc(fileName)
        .set({ url: `https://storage.googleapis.com/${bucketName}/${destination}` });

      console.log(`File ${fileName} uploaded successfully.`);
      return { message: "File uploaded successfully." };
    } catch (error) {
      console.error("Error uploading file:", error);
      throw new functions.https.HttpsError("internal", "File upload failed.");
    } finally {
      try {
        fs.unlinkSync(path.join("/tmp", fileName));
      } catch (cleanupError) {
        console.warn("Error cleaning up temporary file:", cleanupError);
      }
    }
  }
);


/**
 * Cloud Function: Grant GCP Access
 * Updates custom claims for users granted access via the dashboard.
 */
export const grantGCPAccess = functions.https.onCall(async (_data, context) => {
  if (!context.auth) {
    throw new functions.https.HttpsError("unauthenticated", "User not authenticated.");
  }

  const uid = context.auth.uid;

  try {
    //set custom claim
    await admin.auth().setCustomUserClaims(uid, { gcpAccess: true });
    console.log(`GCP access granted for user ${uid}`);
    return { message: "GCP access granted successfully. Please refresh your token." };
  } catch (error) {
    console.error("Error granting GCP access:", error);
    throw new functions.https.HttpsError("internal", "Failed to grant GCP access.");
  }
});


/**
 * Cloud Function: List GCP Files
 * Retrieves files from the GCP bucket for the authenticated user.
 */
export const listGCPFiles = functions.https.onCall(async (_data, context) => {
  if (!context.auth) {
    throw new functions.https.HttpsError("unauthenticated", "User not authenticated.");
  }

  const uid = context.auth.uid;
  const prefix = `${uid}/`;
  const bucket = storage.bucket(bucketName);

  try {
    const [files] = await bucket.getFiles({ prefix });
    const fileList = files.map((file) => ({
      name: file.name.replace(prefix, ""),
      url: `https://storage.googleapis.com/${bucketName}/${file.name}`,
    }));

    return { files: fileList };
  } catch (error) {
    console.error("Error listing GCP bucket files:", error);
    throw new functions.https.HttpsError("internal", "Failed to list GCP bucket files.");
  }
});


/**
 * Cloud Function: Download from GCP Bucket
 * This function allows authenticated users to download a file from the GCP bucket 
 * back to Firebase Storage and removes the file from the GCP bucket afterward.
 *
 * Workflow:
 * 1. Verifies the user's authentication status.
 * 2. Validates the input to ensure a file name is provided.
 * 3. Fetches the specified file from the GCP bucket using the authenticated user's UID as the prefix.
 * 4. Downloads the file content as a binary buffer.
 * 5. Deletes the file from the GCP bucket to ensure it is no longer accessible there.
 * 6. Returns the binary file content to the client for further processing (e.g., re-upload to Firebase Storage).
 *
 * Security:
 * - The user's authentication ensures that only the owner of the file can download it.
 * - File operations are scoped to the authenticated user's UID prefix in the GCP bucket.
 *
 * Parameters:
 * - `data.fileName` (string): The name of the file to download from the GCP bucket.
 *
 * Returns:
 * - `fileContent` (Buffer): The binary content of the file that was downloaded.
 */
/**
 * Cloud Function: Download from GCP Bucket
 * Downloads a file from the GCP bucket back to Firebase Storage and removes it from Firestore and the GCP bucket.
 */
export const downloadFromGCPBucket = functions.https.onCall(
  async (data: { fileName: string }, context: functions.https.CallableContext) => {
    if (!context.auth) {
      throw new functions.https.HttpsError("unauthenticated", "User not authenticated.");
    }

    const uid = context.auth.uid;
    const { fileName } = data;

    if (!fileName) {
      throw new functions.https.HttpsError("invalid-argument", "File name is required.");
    }

    const bucket = storage.bucket(bucketName);
    const file = bucket.file(`${uid}/${fileName}`);
    const firebaseStoragePath = `${uid}/${fileName}`;
    const firebaseStorageBucket = admin.storage().bucket();

    try {
      // Download the file content from the GCP bucket
      const [contents] = await file.download();
      console.log(`File ${fileName} downloaded from GCP bucket.`);

      // Upload the file to Firebase Storage
      const firebaseFile = firebaseStorageBucket.file(firebaseStoragePath);
      await firebaseFile.save(contents, {
        metadata: { contentType: "application/octet-stream" },
      });
      console.log(`File ${fileName} uploaded to Firebase Storage.`);

      // Delete the file from the GCP bucket
      await file.delete();
      console.log(`File ${fileName} deleted from GCP bucket.`);

      // Remove the Firestore record for the file
      await admin
        .firestore()
        .collection("gcpFiles")
        .doc(uid)
        .collection("files")
        .doc(fileName)
        .delete();
      console.log(`Firestore record for file ${fileName} deleted.`);

      return { message: `File ${fileName} successfully received and stored.` };
    } catch (error) {
      console.error("Error receiving file from GCP bucket:", error);
      throw new functions.https.HttpsError("internal", "Failed to receive file from GCP bucket.");
    }
  }
);