import React, { useState, useEffect } from "react";
import { Client, Databases, Query } from "appwrite";
import { PlayCircle, Eye, Film, Calendar, Loader2 } from "lucide-react";

const Home = ({onVideoClick}) => {
  const [videos, setVideos] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  const APPWRITE_PROJECT_ID = import.meta.env.VITE_APPWRITE_PROJECT_ID;
  const APPWRITE_DATABASE_ID = import.meta.env.VITE_APPWRITE_DATABASE_ID;
  const APPWRITE_COLLECTION_ID = import.meta.env.VITE_APPWRITE_COLLECTION_ID;
  const APPWRITE_ENDPOINT = import.meta.env.VITE_APPWRITE_ENDPOINT;

  useEffect(() => {
    const fectchVideos = async () => {
      setLoading(true);
      setError(null);

      try {
        const client = new Client();
        client.setEndpoint(APPWRITE_ENDPOINT).setProject(APPWRITE_PROJECT_ID);

        const databases = new Databases(client);

        const response = await databases.listDocuments(
          APPWRITE_DATABASE_ID,
          APPWRITE_COLLECTION_ID
        );

        setVideos(response.documents);
      } catch (error) {
        console.error("Failed to fetch videos from Appwrite:", err);
        setError("Failed to load videos. Please try again later.");
      } finally {
        setLoading(false); // Stop loading regardless of outcome
      }
    };

    fectchVideos(); // Call the fetch function when the component mounts
  }, []);

  return (
    <div className="min-h-screen bg-gray-950 text-gray-100 sm:p-8 font-inter">
      <h1 className="text-4xl sm:text-5xl font-extrabold text-blue-400 mb-10 text-center tracking-wide">
        Explore Videos
      </h1>

      {/* Loading State*/}
      {loading && (
        <div className="flex justify-center items-center h-64">
          <Loader2 className="h-12 w-12 text-blue-500 animate-spin" />
          <p className="ml-4 text-xl">Loading videos...</p>
        </div>
      )}

      {/* Error State */}
      {error && (
        <div className="bg-red-800 bg-opacity-30 border border-red-700 text-red-300 px-6 py-4 rounded-lg shadow-md text-center">
          <p className="font-semibold text-lg">Error:</p>
          <p>{error}</p>
        </div>
      )}

      {/* No Videos Found State */}
      {!loading && !error && videos.length === 0 && (
        <div className="text-center text-gray-400 text-xl py-20">
          New content is coming. Stay tuned!
        </div>
      )}

      {/* Video Grid */}
      {!loading && !error && videos.length > 0 && (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
          {videos.map((video) => (
            <div
              key={video.$id}
              onClick={() => onVideoClick(video.$id)}
              className="bg-gray-800 rounded-lg shadow-xl overflow-hidden transform hover:scale-105 transition-transform duration-300 relative group border border-gray-700"
            >
              <div 
              className="cursor-pointer relative w-full h-48 bg-gray-700 flex items-center justify-center">
                {video.thumbnailUrl ? (
                  <img
                    src={video.thumbnailUrl}
                    alt={video.title}
                    className="w-full h-full object-cover"
                    onError={(e) => {
                      e.target.onerror = null;
                      e.target.src =
                        "https://placehold.co/640x360/1f2937/d1d5db?text=No+Thumbnail";
                    }}
                  />
                ) : (
                  <div className="text-gray-400 text-center">
                    No Thumbnail Available
                  </div>
                )}
                <div className="absolute inset-0 bg-black bg-opacity-50 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity duration-300">
                  <PlayCircle className="w-16 h-16 text-white" />
                </div>
              </div>

              <div className="p-4">
                <h2 className="text-xl font-bold text-white mb-2 line-clamp-2">
                  {video.title}
                </h2>
                <p className="text-gray-400 text-sm mb-3 line-clamp-3">
                  {video.description}
                </p>

                <div className="flex items-center text-gray-400 text-sm mb-2">
                  <Film className="w-4 h-4 mr-2" />
                  <span>Genre: {video.genre || "N/A"}</span>
                </div>
                <div className="flex items-center text-gray-400 text-sm mb-2">
                  <Calendar className="w-4 h-4 mr-2" />
                  <span>
                    Uploaded: {new Date(video.uploadDate).toLocaleDateString()}
                  </span>
                </div>
                <div className="flex items-center text-gray-400 text-sm">
                  <Eye className="w-4 h-4 mr-2" />
                  <span>{video.viewsCount} Views</span>
                </div>
                {video.isPremium && (
                  <span className="mt-2 inline-block bg-yellow-500 text-yellow-900 text-xs font-semibold px-2.5 py-0.5 rounded-full">
                    Premium
                  </span>
                )}
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
};

export default Home;
