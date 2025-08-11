// src/components/VideoDetailPage.jsx
import React, { useState, useEffect } from 'react';
import { Client, Databases } from 'appwrite';
import { Loader2, ArrowLeft, Film, Calendar, Eye, Star } from 'lucide-react'; // Icons

const VideoDetailPage = ({ videoId, onBack }) => { // onBack prop to go back to home page
  const [video, setVideo] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  // --- Appwrite Client-side Configuration ---
  const APPWRITE_PROJECT_ID = import.meta.env.VITE_APPWRITE_PROJECT_ID;
  const APPWRITE_DATABASE_ID = import.meta.env.VITE_APPWRITE_DATABASE_ID;
  const APPWRITE_COLLECTION_ID = import.meta.env.VITE_APPWRITE_COLLECTION_ID;
  const APPWRITE_ENDPOINT = import.meta.env.VITE_APPWRITE_ENDPOINT;

  useEffect(() => {
    const fetchVideo = async () => {
      if (!videoId) {
        setError("No video ID provided.");
        setLoading(false);
        return;
      }

      setLoading(true);
      setError(null);
      try {
        const client = new Client();
        client
          .setEndpoint(APPWRITE_ENDPOINT)
          .setProject(APPWRITE_PROJECT_ID);

        const databases = new Databases(client);

        const response = await databases.getDocument(
          APPWRITE_DATABASE_ID,
          APPWRITE_COLLECTION_ID,
          videoId // Fetch specific document by ID
        );
        
        setVideo(response);
      } catch (err) {
        console.error(`Failed to fetch video ${videoId} from Appwrite:`, err);
        setError(`Failed to load video. It might not exist or there's a network issue.`);
      } finally {
        setLoading(false);
      }
    };

    fetchVideo();
  }, [videoId]); // Re-fetch if videoId changes

  return (
    <div className="min-h-screen bg-gray-950 text-gray-100 p-4 sm:p-8 font-inter">
      <button 
        onClick={onBack} 
        className="cursor-pointer mb-6 flex items-center px-4 py-2 bg-gray-800 text-gray-200 rounded-lg hover:bg-gray-700 transition-colors duration-200"
      >
        <ArrowLeft className="w-5 h-5 mr-2" /> Back to Home
      </button>

      {loading && (
        <div className="flex justify-center items-center h-64">
          <Loader2 className="h-12 w-12 text-blue-500 animate-spin" />
          <p className="ml-4 text-xl">Loading video details...</p>
        </div>
      )}

      {error && (
        <div className="bg-red-800 bg-opacity-30 border border-red-700 text-red-300 px-6 py-4 rounded-lg shadow-md text-center">
          <p className="font-semibold text-lg">Error:</p>
          <p>{error}</p>
        </div>
      )}

      {!loading && !error && video && (
        <div className="max-w-4xl mx-auto bg-gray-800 rounded-lg shadow-xl overflow-hidden border border-gray-700">
          {/* Video Player Section */}
          <div className="relative w-full aspect-video bg-black">
            {video.videoUrl ? (
              <video
                controls
                autoPlay // Autoplay the video
                src={video.videoUrl}
                className="w-full h-full object-contain bg-black"
                poster={video.thumbnailUrl || 'https://placehold.co/1280x720/1f2937/d1d5db?text=No+Video+Preview'} // Use thumbnail as poster
                onContextMenu={(e) => e.preventDefault()} // Disable right-click for simple copy protection
              >
                Your browser does not support the video tag.
              </video>
            ) : (
              <div className="w-full h-full flex items-center justify-center text-gray-400 text-xl">
                Video URL not available.
              </div>
            )}
          </div>

          {/* Video Information Section */}
          <div className="p-6">
            <h1 className="text-3xl sm:text-4xl font-extrabold text-white mb-3 leading-tight">{video.title}</h1>
            
            <div className="flex flex-wrap items-center text-gray-400 text-sm mb-4 gap-x-4 gap-y-2">
              <span className="flex items-center">
                <Film className="w-4 h-4 mr-1 text-blue-400" /> {video.genre || 'General'}
              </span>
              <span className="flex items-center">
                <Calendar className="w-4 h-4 mr-1 text-blue-400" /> Uploaded: {new Date(video.uploadDate).toLocaleDateString()}
              </span>
              <span className="flex items-center">
                <Eye className="w-4 h-4 mr-1 text-blue-400" /> {video.viewsCount || 0} Views
              </span>
              {video.isPremium && (
                <span className="flex items-center bg-yellow-500 text-yellow-900 text-xs font-semibold px-2.5 py-0.5 rounded-full ml-auto sm:ml-0">
                  <Star className="w-3 h-3 mr-1" /> PREMIUM
                </span>
              )}
            </div>

            <p className="text-gray-300 text-base leading-relaxed mb-6">{video.description}</p>

            {/* Tags display */}
            {video.tags && video.tags.split(',').map((tag, index) => (
              <span key={index} className="inline-block bg-gray-700 text-gray-300 text-xs font-medium px-2 py-1 rounded-full mr-2 mb-2 hover:bg-gray-600 transition-colors">
                #{tag.trim()}
              </span>
            ))}
          </div>
        </div>
      )}
    </div>
  );
};

export default VideoDetailPage;