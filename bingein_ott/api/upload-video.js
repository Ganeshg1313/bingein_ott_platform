// api/upload-video.js
// This file serves as a Vercel Serverless Function.
// It handles file uploads to Vercel Blob Storage and
// inserts video metadata into your Appwrite database.

// Using CommonJS 'require' syntax for node-appwrite and @vercel/blob
// as this combination has been confirmed to work in your environment.
const sdk = require('node-appwrite');
const { put } = require('@vercel/blob');
const busboy = require('busboy'); // For parsing multipart/form-data

// --- Appwrite Configuration ---
// These environment variables are crucial for connecting to your Appwrite instance.
// They should be defined in your .env.local file for local development
// and in your Vercel Project Settings for deployments (Development, Preview, Production).
const APPWRITE_PROJECT_ID = process.env.APPWRITE_PROJECT_ID;
const APPWRITE_API_KEY = process.env.APPWRITE_API_KEY;
const APPWRITE_DATABASE_ID = process.env.APPWRITE_DATABASE_ID;
const APPWRITE_COLLECTION_ID = process.env.APPWRITE_COLLECTION_ID;
// Default to Appwrite Cloud endpoint if not specified
const APPWRITE_ENDPOINT = process.env.APPWRITE_ENDPOINT || 'https://cloud.appwrite.io/v1';

// --- Initialize Appwrite Client ---
// Create a new Appwrite client instance.
const client = new sdk.Client();

// Configure the client with your Appwrite endpoint, project ID, and API key.
// The .setKey() method is used for server-side authentication with an API key.
client
    .setEndpoint(APPWRITE_ENDPOINT) // Set your Appwrite API Endpoint
    .setProject(APPWRITE_PROJECT_ID) // Set your Appwrite Project ID
    .setKey(APPWRITE_API_KEY);       // Set your Appwrite Secret API Key

// Instantiate Appwrite services that you will use.
// In this case, we need the Databases service to create new video documents.
const databases = new sdk.Databases(client);

// Access the ID utility for generating unique document IDs.
const ID = sdk.ID;

// --- Vercel API Configuration ---
// This setting is essential for handling file uploads (`multipart/form-data`).
// It tells Vercel's built-in body parser to *not* process the request body,
// allowing us to handle it manually using `busboy`.
export const config = {
  api: {
    bodyParser: false,
  },
};

// --- Main Serverless Function Handler ---
// This function is executed when an HTTP request hits the /api/upload-video endpoint.
export default async function handler(req, res) {
  // Ensure that only POST requests are allowed for this upload endpoint.
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method Not Allowed', message: 'This endpoint only accepts POST requests.' });
  }

  // --- Debugging: Log Environment Variables ---
  // These logs help confirm that your environment variables are being loaded correctly.
  // They will appear in your terminal when running `vercel dev` or in Vercel's deployment logs.
  console.log('--- Environment Variables Check (Full Code) ---');
  console.log('APPWRITE_ENDPOINT:', APPWRITE_ENDPOINT);
  console.log('APPWRITE_PROJECT_ID:', APPWRITE_PROJECT_ID);
  console.log('APPWRITE_API_KEY (first 5 chars):', APPWRITE_API_KEY ? APPWRITE_API_KEY.substring(0, 5) + '...' : 'undefined/empty');
  console.log('APPWRITE_DATABASE_ID:', APPWRITE_DATABASE_ID);
  console.log('APPWRITE_COLLECTION_ID:', APPWRITE_COLLECTION_ID);
  console.log('----------------------------------------------------');

  try {
    // Parse the incoming `multipart/form-data` request.
    // This extracts all form fields (text and files) into a FormData object.
    const formData = await parseMultipartFormData(req);

    console.log("BYE");
    // --- Extract Form Data ---
    // Retrieve the values for each field from the parsed FormData object.
    const title = formData.get('title');
    const description = formData.get('description');
    // Convert duration to an integer.
    const duration = parseInt(formData.get('duration'), 10);
    // 'isPremium' is an optional boolean. Check if it exists and convert its string value to a boolean.
    // Defaults to `false` if the checkbox was not checked or the field was not sent.
    const isPremium = formData.has('isPremium') ? formData.get('isPremium') === 'true' : false;
    // Optional fields default to an empty string if not provided.
    const genre = formData.get('genre') || '';
    const tags = formData.get('tags') || '';
    // Get the file objects for video and thumbnail.
    const videoFile = formData.get('videoFile');
    const thumbnailFile = formData.get('thumbnailFile');

    console.log("SUIIII")

    // --- Basic Server-Side Validation ---
    // Ensure all mandatory fields and files are present before proceeding.
    if (!title || !description || isNaN(duration) || !videoFile || !thumbnailFile) {
      return res.status(400).json({
        error: 'Bad Request',
        message: 'Missing required fields or invalid duration. Please ensure all mandatory fields are filled and both video and thumbnail files are selected.',
      });
    }
    // Additional validation could be added here (e.g., file size limits, file type checks).

    // --- Step 1: Upload Video File to Vercel Blob Storage ---
    // The `put` function uploads the file.
    // `videoFile.name` is used as the filename in Blob Storage.
    // `access: 'public'` makes the file accessible via a public URL.
    // `contentType` is important for correct browser interpretation.
    const videoBlob = await put(videoFile.name, videoFile, {
      access: 'public',
      contentType: videoFile.type,
    });
    console.log('Video uploaded to Vercel Blob:', videoBlob.url);

    // --- Step 2: Upload Thumbnail File to Vercel Blob Storage ---
    // Similar process for the thumbnail image.
    const thumbnailBlob = await put(thumbnailFile.name, thumbnailFile, {
      access: 'public',
      contentType: thumbnailFile.type,
    });
    console.log('Thumbnail uploaded to Vercel Blob:', thumbnailBlob.url);

    // --- Step 3: Insert Video Metadata into Appwrite Database ---
    // Construct the data payload that matches your Appwrite `videos` collection schema.
    const videoData = {
      title,
      description,
      duration,
      isPremium,
      genre,
      tags,
      thumbnailUrl: thumbnailBlob.url, // Store the public URL from Vercel Blob
      videoUrl: videoBlob.url,         // Store the public URL from Vercel Blob
      viewsCount: 0,                   // Initialize views count for a new video
      uploadDate: new Date().toISOString(), // Record the current timestamp in ISO format
    };

    // Create a new document in your Appwrite database.
    // `ID.unique()` generates a unique document ID for the new entry.
    const newVideoDocument = await databases.createDocument(
      APPWRITE_DATABASE_ID,
      APPWRITE_COLLECTION_ID,
      ID.unique(), // Let Appwrite generate a unique ID
      videoData
    );
    console.log('Video metadata saved to Appwrite:', newVideoDocument.$id);

    // --- Success Response ---
    // Send a success response back to the frontend, including relevant details.
    res.status(200).json({
      message: 'Video uploaded and metadata saved successfully!',
      video: newVideoDocument, // The full Appwrite document that was created
      videoBlobUrl: videoBlob.url,
      thumbnailBlobUrl: thumbnailBlob.url,
    });

  } catch (error) {
    // --- Error Handling ---
    // Log the full error for server-side debugging.
    console.error('Error in upload-video API:', error);

    // Send a user-friendly error response to the frontend.
    res.status(500).json({
      error: 'Internal Server Error',
      message: 'Failed to process video upload and save metadata. Please try again.',
      details: error.message, // Include error message for more specific debugging on frontend
    });
  }
}

// --- Helper Function: parseMultipartFormData ---
// This function is crucial for processing `multipart/form-data` requests.
// It uses the `busboy` library to stream and parse the incoming request body,
// extracting both text fields and file data.
// Helper function: parseMultipartFormData (enhanced debugging)
async function parseMultipartFormData(req) {
  console.log('DEBUG: parseMultipartFormData started.');
  return new Promise((resolve, reject) => {
    // Check if req.headers is available and contains Content-Type
    console.log('DEBUG: Request Headers:', req.headers);
    if (!req.headers || !req.headers['content-type']) {
      console.error('ERROR: Missing request headers or Content-Type.');
      return reject(new Error('Missing request headers or Content-Type for multipart form data.'));
    }

    const bb = busboy({ headers: req.headers });
    const formData = new FormData();
    console.log('DEBUG: Busboy initialized.');

    bb.on('file', (name, file, info) => {
      const { filename, encoding, mimeType } = info;
      console.log(`DEBUG: File detected - Name: ${name}, Filename: ${filename}, MimeType: ${mimeType}`);
      let fileBuffer = Buffer.from([]);

      file.on('data', (data) => {
        fileBuffer = Buffer.concat([fileBuffer, data]);
        // console.log(`DEBUG: File data chunk received for ${filename}, size: ${data.length}`); // Too verbose, uncomment if desperate
      });

      file.on('end', () => {
        console.log(`DEBUG: File end received for ${filename}, total size: ${fileBuffer.length} bytes`);
        const blob = new Blob([fileBuffer], { type: mimeType });
        Object.defineProperty(blob, 'name', { value: filename });
        formData.append(name, blob);
        console.log(`DEBUG: File ${filename} appended to FormData.`);
      });

      file.on('error', (err) => {
        console.error(`ERROR: File stream error for ${filename}:`, err);
        reject(err);
      });
    });

    bb.on('field', (name, val, info) => {
      console.log(`DEBUG: Field detected - Name: ${name}, Value: ${val}`);
      formData.append(name, val);
    });

    bb.on('close', () => {
      console.log('DEBUG: Busboy closed. Resolving FormData.');
      resolve(formData);
    });

    bb.on('error', (err) => {
      console.error('ERROR: Busboy parsing error:', err);
      reject(err);
    });

    // Pipe the request stream to busboy.
    // This is where busboy starts consuming the incoming data.
    req.pipe(bb);
    console.log('DEBUG: Request piped to busboy.');
  });
}