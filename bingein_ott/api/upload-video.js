// --- Module Imports (ESM Syntax) ---
// node-appwrite: Appwrite SDK specifically for Node.js environments
import { Client, Databases, ID, Permission, Role } from 'node-appwrite'; // <--- Changed import source
// @vercel/blob: Vercel's SDK for interacting with Blob Storage
import { put } from '@vercel/blob';
// formidable: Robust library for parsing multipart/form-data (file uploads)
import formidable from 'formidable';
// fs/promises: Node.js File System module (promise-based API for async operations)
import { promises as fs } from 'fs';
// fs: Node.js File System module (synchronous API for operations like existsSync, mkdirSync)
import * as fsSync from 'fs';
// path: Node.js Path module, used for path manipulation (e.g., getting base directory)
import path from 'path';

// --- Appwrite Configuration (Environment Variables) ---
const APPWRITE_PROJECT_ID = process.env.APPWRITE_PROJECT_ID;
const APPWRITE_API_KEY = process.env.APPWRITE_API_KEY;
const APPWRITE_DATABASE_ID = process.env.APPWRITE_DATABASE_ID;
const APPWRITE_COLLECTION_ID = process.env.APPWRITE_COLLECTION_ID;
const APPWRITE_ENDPOINT = process.env.APPWRITE_ENDPOINT || 'https://cloud.appwrite.io/v1';

// --- Initialize Appwrite Client ---
const client = new Client();
client
    .setEndpoint(APPWRITE_ENDPOINT)
    .setProject(APPWRITE_PROJECT_ID)
    .setKey(APPWRITE_API_KEY); // This line is crucial for authentication

const databases = new Databases(client);

// --- Vercel API Route Configuration ---
export const config = {
  api: {
    bodyParser: false,
  },
};

export default async function handler(req, res) {
  if (req.method !== 'POST') {
    return res.status(405).json({
      error: 'Method Not Allowed',
      message: 'This endpoint only accepts POST requests for video uploads and metadata saving.',
    });
  }

  console.log('--- Environment Variables Check (Full Code - ESM - node-appwrite) ---');
  console.log('APPWRITE_ENDPOINT:', APPWRITE_ENDPOINT);
  console.log('APPWRITE_PROJECT_ID:', APPWRITE_PROJECT_ID);
  console.log('APPWRITE_API_KEY (first 5 chars):', APPWRITE_API_KEY ? APPWRITE_API_KEY.substring(0, 5) + '...' : 'undefined/empty');
  console.log('APPWRITE_DATABASE_ID:', APPWRITE_DATABASE_ID);
  console.log('APPWRITE_COLLECTION_ID:', APPWRITE_COLLECTION_ID);
  console.log('----------------------------------------------------');

  try {
    const { fields, files } = await parseForm(req);
    console.log('DEBUG: Formidable parsing complete. Fields:', Object.keys(fields), 'Files:', Object.keys(files));

    // --- Extract and Validate Form Fields ---
    const title = Array.isArray(fields.title) ? fields.title[0] : fields.title;
    const description = Array.isArray(fields.description) ? fields.description[0] : fields.description;
    const duration = parseInt(Array.isArray(fields.duration) ? fields.duration[0] : fields.duration, 10);
    const isPremium = Array.isArray(fields.isPremium) ? fields.isPremium[0] === 'true' : fields.isPremium === 'true';
    const genre = Array.isArray(fields.genre) ? fields.genre[0] : fields.genre || '';
    const tags = Array.isArray(fields.tags) ? fields.tags[0] : fields.tags || '';
    
    // --- TEMPORARY: Extract Appwrite Team ID for Testing ---
    const teamId = Array.isArray(fields.teamId) ? fields.teamId[0] : fields.teamId;

    const videoFile = files.videoFile && (Array.isArray(files.videoFile) ? files.videoFile[0] : files.videoFile);
    const thumbnailFile = files.thumbnailFile && (Array.isArray(files.thumbnailFile) ? files.thumbnailFile[0] : files.thumbnailFile);

    if (!title || !description || isNaN(duration) || !videoFile || !thumbnailFile || !teamId) {
      if (videoFile?.filepath) await fs.unlink(videoFile.filepath).catch(err => console.warn('Cleanup failed:', err));
      if (thumbnailFile?.filepath) await fs.unlink(thumbnailFile.filepath).catch(err => console.warn('Cleanup failed:', err));
      return res.status(400).json({ error: 'Bad Request', message: 'Missing required fields or invalid data.' });
    }

    // --- Upload Files to Vercel Blob Storage ---
    const videoFileBuffer = await fs.readFile(videoFile.filepath);
    const videoBlob = await put(videoFile.originalFilename || path.basename(videoFile.filepath), videoFileBuffer, { access: 'public', contentType: videoFile.mimetype });
    
    const thumbnailFileBuffer = await fs.readFile(thumbnailFile.filepath);
    const thumbnailBlob = await put(thumbnailFile.originalFilename || path.basename(thumbnailFile.filepath), thumbnailFileBuffer, { access: 'public', contentType: thumbnailFile.mimetype });

    // --- Clean Up Temporary Files ---
    try {
        await fs.unlink(videoFile.filepath);
        await fs.unlink(thumbnailFile.filepath);
    } catch (cleanUpError) {
        console.warn('WARNING: Failed to delete temporary files:', cleanUpError);
    }

    // --- Insert Video Metadata into Appwrite Database with Permissions ---
    const videoData = {
      title,
      description,
      duration,
      isPremium,
      genre,
      tags,
      thumbnailUrl: thumbnailBlob.url,
      videoUrl: videoBlob.url,
      viewsCount: 0,
      uploadDate: new Date().toISOString(),
    };

    const permissions = [
      // Grant read access to "any" role (all users, logged in or not).
      Permission.read(Role.any()),
      // Grant update and delete access to the content-management team
      Permission.update(Role.team(teamId)),
      Permission.delete(Role.team(teamId))
    ];
    
    const newVideoDocument = await databases.createDocument(
      APPWRITE_DATABASE_ID,
      APPWRITE_COLLECTION_ID,
      ID.unique(),
      videoData,
      permissions
    );
    console.log('Video metadata saved to Appwrite:', newVideoDocument.$id);

    // --- Send Success Response ---
    res.status(200).json({
      message: 'Video uploaded and metadata saved successfully!',
      video: newVideoDocument,
      videoBlobUrl: videoBlob.url,
      thumbnailBlobUrl: thumbnailBlob.url,
    });

  } catch (error) {
    console.error('Error in upload-video API:', error);
    res.status(500).json({
      error: 'Internal Server Error',
      message: 'Failed to process video upload and save metadata. Please check server logs for details and try again.',
      details: error.message,
    });
  }
}

// Helper function to parse multipart/form-data requests using 'formidable'
function parseForm(req) {
  return new Promise((resolve, reject) => {
    const form = formidable({
      uploadDir: './tmp',
      keepExtensions: true,
      multiples: false,
      filename: (name, ext, part) => {
        return `${part.originalFilename || `${name}${ext}`}`;
      },
    });

    const tmpDir = './tmp';
    if (!fsSync.existsSync(tmpDir)) {
        fsSync.mkdirSync(tmpDir);
    }

    form.parse(req, (err, fields, files) => {
      if (err) {
        console.error('ERROR: Formidable parsing error:', err);
        return reject(err);
      }
      resolve({ fields, files });
    });
  });
}
