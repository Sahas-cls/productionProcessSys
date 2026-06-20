// utils/b2AttachmentStorage.js
const AWS = require("aws-sdk");
const path = require("path");

// Initialize S3 for Backblaze B2
const s3 = new AWS.S3({
  endpoint: "https://s3.eu-central-003.backblazeb2.com",
  region: "eu-central-003",
  credentials: {
    accessKeyId: process.env.B2_KEY_ID || "",
    secretAccessKey: process.env.B2_APP_KEY || "",
  },
  s3ForcePathStyle: true,
  httpOptions: {
    timeout: 30000,
    connectTimeout: 10000,
  },
});

const BUCKET_NAME = process.env.B2_BUCKET_NAME || "guston-test-bucket";

/**
 * Upload attachment media to B2
 */
exports.uploadAttachmentMedia = async (fileBuffer, fileName, mediaType) => {
  try {
    // Determine folder based on media type
    const folder =
      mediaType === "image" ? "Attachments/Images" : "Attachments/Videos";
    const key = `${folder}/${fileName}`;

    const params = {
      Bucket: BUCKET_NAME,
      Key: key,
      Body: fileBuffer,
      ContentType: mediaType === "image" ? "image/jpeg" : "video/mp4",
    };

    const result = await s3.upload(params).promise();

    console.log(`✅ File uploaded to B2: ${result.Key}`);

    return {
      filePath: result.Key,
      fileId: result.Key, // Using Key as fileId for consistency
      location: result.Location,
    };
  } catch (error) {
    console.error("❌ B2 upload error:", error);
    throw new Error(`Failed to upload to B2: ${error.message}`);
  }
};

/**
 * Delete file from B2
 */
exports.deleteFile = async (fileId, filePath) => {
  try {
    const params = {
      Bucket: BUCKET_NAME,
      Key: filePath,
    };

    await s3.deleteObject(params).promise();
    console.log(`✅ File deleted from B2: ${filePath}`);
    return true;
  } catch (error) {
    console.error("❌ B2 delete error:", error);
    throw new Error(`Failed to delete from B2: ${error.message}`);
  }
};
