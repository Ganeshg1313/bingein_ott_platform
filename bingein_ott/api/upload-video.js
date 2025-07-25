// api/upload-video.js

/**
 * @file This Vercel Serverless Function handles video and thumbnail uploads
 * to Vercel Blob Storage and then saves the corresponding metadata
 * to an Appwrite database.
 * It uses 'node-appwrite' for Appwrite interaction and 'formidable'
 * for parsing multipart/form-data requests (file uploads).
 */

// --- Module Imports ---
// node-appwrite: Appwrite SDK for server-side operations
const sdk = require('node-appwrite');
// @vercel/blob: Vercel's SDK for interacting with Blob Storage
const { put } = require('@vercel/blob');
// formidable: Robust library for parsing multipart/form-data (file uploads)
const formidable = require('formidable');
// fs: Node.js File System module, used for reading/deleting temporary files
const fs = require('fs');
// path: Node.js Path module, used for path manipulation (e.g., getting base directory)
const path = require('path');

// --- Appwrite Configuration (Environment Variables) ---
// These variables are loaded from the Vercel environment (or .env.local for local development).
// They contain sensitive API keys and IDs and should NEVER be exposed client-side.
const APPWRITE_PROJECT_ID = process.env.APPWRITE_PROJECT_ID;
const APPWRITE_API_KEY = process.env.APPWRITE_API_KEY;
const APPWRITE_DATABASE_ID = process.env.APPWRITE_DATABASE_ID;
const APPWRITE_COLLECTION_ID = process.env.APPWRITE_COLLECTION_ID;
// Default to Appwrite Cloud endpoint if not specified
const APPWRITE_ENDPOINT = process.env.APPWRITE_ENDPOINT || 'https://cloud.appwrite.io/v1';

// --- Initialize Appwrite Client ---
// Create a new Appwrite client instance.
// This client is configured with the endpoint, project ID, and API key
// for server-side communication with your Appwrite project.
const client = new sdk.Client();
client
    .setEndpoint(APPWRITE_ENDPOINT) // Set your Appwrite API endpoint
    .setProject(APPWRITE_PROJECT_ID) // Set your Appwrite Project ID
    .setKey(APPWRITE_API_KEY); // Set your Appwrite secret API key (server-side only)

// Initialize Appwrite services using the configured client
const databases = new sdk.Databases(client);
// ID is used for generating unique IDs (e.g., for new documents)
const ID = sdk.ID;

// --- Vercel API Route Configuration ---
// This configuration is crucial for handling file uploads.
// `bodyParser: false` tells Vercel's default parser NOT to consume the request body,
// allowing 'formidable' to handle the raw stream.
export const config = {
  api: {
    bodyParser: false,
  },
};

/**
 * Main handler function for the API route.
 * @param {object} req - The incoming Node.js request object.
 * @param {object} res - The outgoing Node.js response object.
 * @returns {Promise<void>} - A promise that resolves when the response is sent.
 */
export default async function handler(req, res) {
  // Ensure only POST requests are allowed for file uploads
  if (req.method !== 'POST') {
    // Return a 405 Method Not Allowed error for other HTTP methods
    return res.status(405).json({
      error: 'Method Not Allowed',
      message: 'This endpoint only accepts POST requests for video uploads and metadata saving.',
    });
  }

  // Log environment variables for debugging purposes.
  // Sensitive API keys are partially masked for safety in logs.
  console.log('--- Environment Variables Check (Full Code) ---');
  console.log('APPWRITE_ENDPOINT:', APPWRITE_ENDPOINT);
  console.log('APPWRITE_PROJECT_ID:', APPWRITE_PROJECT_ID);
  console.log('APPWRITE_API_KEY (first 5 chars):', APPWRITE_API_KEY ? APPWRITE_API_KEY.substring(0, 5) + '...' : 'undefined/empty');
  console.log('APPWRITE_DATABASE_ID:', APPWRITE_DATABASE_ID);
  console.log('APPWRITE_COLLECTION_ID:', APPWRITE_COLLECTION_ID);
  console.log('----------------------------------------------------');

  try {
    // Parse the incoming multipart/form-data request using 'formidable'.
    // This extracts text fields and saves file streams to temporary locations.
    const { fields, files } = await parseForm(req);
    console.log('DEBUG: Formidable parsing complete. Fields:', Object.keys(fields), 'Files:', Object.keys(files));

    // --- Extract and Validate Form Fields ---
    // formidable returns fields as arrays, so we extract the first element.
    const title = Array.isArray(fields.title) ? fields.title[0] : fields.title;
    const description = Array.isArray(fields.description) ? fields.description[0] : fields.description;
    const duration = parseInt(Array.isArray(fields.duration) ? fields.duration[0] : fields.duration, 10);
    // Convert 'true'/'false' string from form to boolean
    const isPremium = Array.isArray(fields.isPremium) ? fields.isPremium[0] === 'true' : fields.isPremium === 'true';
    const genre = Array.isArray(fields.genre) ? fields.genre[0] : fields.genre || ''; // Default to empty string if not provided
    const tags = Array.isArray(fields.tags) ? fields.tags[0] : fields.tags || '';     // Default to empty string if not provided

    // Extract file objects from the 'files' object returned by formidable.
    // Ensure they are valid file objects.
    const videoFile = files.videoFile && (Array.isArray(files.videoFile) ? files.videoFile[0] : files.videoFile);
    const thumbnailFile = files.thumbnailFile && (Array.isArray(files.thumbnailFile) ? files.thumbnailFile[0] : files.thumbnailFile);

    // Debugging: Log details of parsed file objects
    // console.log('DEBUG: Parsed videoFile object:', videoFile ? { name: videoFile.originalFilename, filepath: videoFile.filepath, mimetype: videoFile.mimetype } : 'undefined');
    // console.log('DEBUG: Parsed thumbnailFile object:', thumbnailFile ? { name: thumbnailFile.originalFilename, filepath: thumbnailFile.filepath, mimetype: thumbnailFile.mimetype } : 'undefined');

    // Basic server-side validation: Check if required fields and files are present and valid.
    if (!title || !description || isNaN(duration) || !videoFile || !thumbnailFile || !videoFile.filepath || !thumbnailFile.filepath) {
      return res.status(400).json({
        error: 'Bad Request',
        message: 'Missing required fields or invalid data. Please ensure all mandatory fields (Title, Description, Duration) are filled, and both Video File and Thumbnail Image are selected and valid.',
      });
    }

    // --- Upload Video File to Vercel Blob Storage ---
    // formidable saves files to `filepath`. Read the file content into a buffer.
    const videoFileBuffer = await fs.promises.readFile(videoFile.filepath);
    // Upload the buffer to Vercel Blob. Use originalFilename if available, fallback to filepath.
    const videoBlob = await put(videoFile.originalFilename || path.basename(videoFile.filepath), videoFileBuffer, {
      access: 'public', // Make the uploaded file publicly accessible
      contentType: videoFile.mimetype, // Set the correct MIME type
    });
    console.log('Video uploaded to Vercel Blob:', videoBlob.url);

    // --- Upload Thumbnail File to Vercel Blob Storage ---
    const thumbnailFileBuffer = await fs.promises.readFile(thumbnailFile.filepath);
    const thumbnailBlob = await put(thumbnailFile.originalFilename || path.basename(thumbnailFile.filepath), thumbnailFileBuffer, {
      access: 'public',
      contentType: thumbnailFile.mimetype,
    });
    console.log('Thumbnail uploaded to Vercel Blob:', thumbnailBlob.url);

    // --- Clean Up Temporary Files ---
    // It's crucial to delete temporary files from the serverless function's ephemeral disk.
    try {
        await fs.promises.unlink(videoFile.filepath);
        await fs.promises.unlink(thumbnailFile.filepath);
        console.log('DEBUG: Temporary files deleted successfully.');
    } catch (cleanUpError) {
        // Log a warning if cleanup fails, but don't block the main process.
        console.warn('WARNING: Failed to delete temporary files:', cleanUpError);
    }

    // --- Insert Video Metadata into Appwrite Database ---
    const videoData = {
      title,
      description,
      duration,
      isPremium,
      genre,
      tags,
      thumbnailUrl: thumbnailBlob.url, // Store the public URL from Vercel Blob
      videoUrl: videoBlob.url,         // Store the public URL from Vercel Blob
      viewsCount: 0, // Initialize views count for new videos
      uploadDate: new Date().toISOString(), // Record the upload timestamp
    };

    // Create a new document in the specified Appwrite database and collection.
    // ID.unique() generates a unique ID for the document.
    const newVideoDocument = await databases.createDocument(
      APPWRITE_DATABASE_ID,
      APPWRITE_COLLECTION_ID,
      ID.unique(),
      videoData
    );
    console.log('Video metadata saved to Appwrite:', newVideoDocument.$id);

    // --- Send Success Response ---
    res.status(200).json({
      message: 'Video uploaded and metadata saved successfully!',
      video: newVideoDocument, // Return the newly created Appwrite document details
      videoBlobUrl: videoBlob.url, // Return Vercel Blob URLs for client confirmation/use
      thumbnailBlobUrl: thumbnailBlob.url,
    });

  } catch (error) {
    // --- Handle Errors ---
    // Log the full error for server-side debugging
    console.error('Error in upload-video API:', error);
    // Send a generic 500 Internal Server Error to the client
    res.status(500).json({
      error: 'Internal Server Error',
      message: 'Failed to process video upload and save metadata. Please check server logs for details and try again.',
      details: error.message, // Include error message for debugging on client
    });
  }
}

/**
 * Helper function to parse multipart/form-data requests using 'formidable'.
 * This function processes the incoming request stream and extracts
 * form fields and uploaded files into a temporary directory.
 * @param {object} req - The Node.js request stream.
 * @returns {Promise<{fields: object, files: object}>} - A promise that resolves with parsed fields and files.
 */
function parseForm(req) {
  return new Promise((resolve, reject) => {
    // Configure formidable:
    // - uploadDir: Directory to save temporary uploaded files. Must exist and be writable.
    // - keepExtensions: Keep original file extensions.
    // - multiples: Set to false as we expect single files for video and thumbnail.
    // - filename: Customizes the temporary filename to keep the original name (more readable).
    const form = new formidable.IncomingForm({
      uploadDir: './tmp',
      keepExtensions: true,
      multiples: false,
      filename: (name, ext, part) => {
        // formidable's part.originalFilename is preferred for the original file name
        return `${part.originalFilename || `${name}${ext}`}`;
      },
    });

    // Ensure the temporary upload directory exists.
    // Serverless functions have ephemeral file systems, so './tmp' must be created on each invocation.
    const tmpDir = './tmp';
    if (!fs.existsSync(tmpDir)) {
        console.log(`DEBUG: Creating temporary directory: ${tmpDir}`);
        fs.mkdirSync(tmpDir);
    }

    // Parse the incoming request.
    form.parse(req, (err, fields, files) => {
      if (err) {
        console.error('ERROR: Formidable parsing error:', err);
        // Clean up any partially uploaded files if parsing fails
        form.emit('error', err); // Trigger the error handler for formidable
        return reject(err);
      }
      resolve({ fields, files });
    });
  });
}
