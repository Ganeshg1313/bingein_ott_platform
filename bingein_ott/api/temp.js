// api/upload-video.js
import { put } from '@vercel/blob';
import { Client, Databases, ID } from 'appwrite';
import busboy from 'busboy'; // Import busboy for multipart/form-data parsing

// Configuration for Appwrite (these values will be read from Vercel Environment Variables in production,
// or from your .env.local file during local development with `vercel dev`)
const APPWRITE_PROJECT_ID = process.env.APPWRITE_PROJECT_ID;
const APPWRITE_API_KEY = process.env.APPWRITE_API_KEY;
const APPWRITE_DATABASE_ID = process.env.APPWRITE_DATABASE_ID;
const APPWRITE_COLLECTION_ID = process.env.APPWRITE_COLLECTION_ID;
const APPWRITE_ENDPOINT = process.env.APPWRITE_ENDPOINT || 'https://cloud.appwrite.io/v1'; // Default for Appwrite Cloud

// Initialize Appwrite Client
const client = new Client()
    .setEndpoint(APPWRITE_ENDPOINT)
    .setProject(APPWRITE_PROJECT_ID)
    .setKey(APPWRITE_API_KEY);

const databases = new Databases(client);

// Vercel API configuration to disable default body parser.
// This is crucial because we are handling `multipart/form-data` manually with `busboy`.
export const config = {
  api: {
    bodyParser: false,
  },
};

// Main handler function for the API route
export default async function handler(req, res) {
  // Ensure the request method is POST, as this route is for uploading data.
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method Not Allowed' });
  }

  try {
    // Parse the incoming `multipart/form-data` request body.
    // This extracts text fields and file data.
    const formData = await parseMultipartFormData(req);

    // Extract data from the parsed form data.
    // Use .get() for single values.
    const title = formData.get('title');
    const description = formData.get('description');
    const duration = parseInt(formData.get('duration'), 10); // Convert duration string to integer
    // isPremium is an optional field, so we check if it exists and convert its string value to a boolean.
    // If not provided, it defaults to `false`.
    const isPremium = formData.has('isPremium') ? formData.get('isPremium') === 'true' : false;
    const genre = formData.get('genre') || ''; // Optional field, default to empty string if not provided
    const tags = formData.get('tags') || '';   // Optional field, default to empty string if not provided
    const videoFile = formData.get('videoFile');     // The actual video file object
    const thumbnailFile = formData.get('thumbnailFile'); // The actual thumbnail file object

    // Perform basic server-side validation for required fields.
    if (!title || !description || isNaN(duration) || !videoFile || !thumbnailFile) {
      return res.status(400).json({ error: 'Missing required fields or invalid duration. Please ensure all mandatory fields are filled and files are selected.' });
    }

    // --- Step 1: Upload Video File to Vercel Blob Storage ---
    // `put` function uploads a file. `videoFile.name` is used as the filename in Blob Storage.
    // `access: 'public'` makes the uploaded file publicly accessible via a URL.
    // `contentType` is important for browsers to correctly interpret the file type.
    const videoBlob = await put(videoFile.name, videoFile, {
      access: 'public',
      contentType: videoFile.type,
    });

    // --- Step 2: Upload Thumbnail File to Vercel Blob Storage ---
    // Similar to video upload, but for the thumbnail image.
    const thumbnailBlob = await put(thumbnailFile.name, thumbnailFile, {
      access: 'public',
      contentType: thumbnailFile.type,
    });

    // --- Step 3: Insert Video Metadata into Appwrite Database ---
    // Construct the data object matching your Appwrite `videos` collection schema.
    const videoData = {
      title,
      description,
      duration,
      isPremium,
      genre,
      tags,
      thumbnailUrl: thumbnailBlob.url, // Store the public URL from Vercel Blob
      videoUrl: videoBlob.url,         // Store the public URL from Vercel Blob
      viewsCount: 0,                   // Initialize views count for new videos
      uploadDate: new Date().toISOString(), // Record the current upload timestamp
    };

    // Use Appwrite SDK to create a new document in the specified database and collection.
    // `ID.unique()` generates a unique ID for the new document.
    const newVideoDocument = await databases.createDocument(
      APPWRITE_DATABASE_ID,
      APPWRITE_COLLECTION_ID,
      ID.unique(),
      videoData
    );

    // Send a success response back to the frontend, including the new document details
    // and the URLs of the uploaded files.
    res.status(200).json({
      message: 'Video uploaded and metadata saved successfully!',
      video: newVideoDocument,
      videoBlobUrl: videoBlob.url,
      thumbnailBlobUrl: thumbnailBlob.url,
    });

  } catch (error) {
    // Log any errors that occur during the process for debugging.
    console.error('Error in upload-video API:', error);
    // Send an error response to the frontend.
    res.status(500).json({ error: 'Internal Server Error', details: error.message });
  }
}

// --- Helper Function: parseMultipartFormData ---
// This function is crucial for handling file uploads (multipart/form-data)
// because Vercel's default bodyParser is disabled for this API route.
// It uses the `busboy` library to parse the request stream.
async function parseMultipartFormData(req) {
  return new Promise((resolve, reject) => {
    // Initialize busboy with the request headers.
    const bb = busboy({ headers: req.headers });
    // Use a native FormData object to store parsed fields and files.
    const formData = new FormData();

    // Event listener for when a file is encountered in the form data.
    bb.on('file', (name, file, info) => {
      const { filename, encoding, mimeType } = info;
      let fileBuffer = Buffer.from([]); // Accumulate file data in a buffer.

      // Listen for 'data' chunks from the file stream.
      file.on('data', (data) => {
        fileBuffer = Buffer.concat([fileBuffer, data]);
      });

      // Listen for 'end' of the file stream.
      file.on('end', () => {
        // Create a Blob object from the accumulated buffer.
        // Node.js Buffers are compatible with the Blob constructor.
        const blob = new Blob([fileBuffer], { type: mimeType });
        // Add a 'name' property to the Blob, which is expected by `@vercel/blob`'s `put` function.
        Object.defineProperty(blob, 'name', { value: filename });
        // Append the file (as a Blob) to the FormData object.
        formData.append(name, blob);
      });
    });

    // Event listener for when a regular field (non-file) is encountered.
    bb.on('field', (name, val, info) => {
      // Append the field name and value to the FormData object.
      formData.append(name, val);
    });

    // Event listener for when busboy finishes parsing the entire form.
    bb.on('close', () => {
      resolve(formData); // Resolve the promise with the populated FormData object.
    });

    // Event listener for any errors during parsing.
    bb.on('error', (err) => {
      reject(err); // Reject the promise if an error occurs.
    });

    // Pipe the incoming request stream to busboy to start parsing.
    req.pipe(bb);
  });
}
