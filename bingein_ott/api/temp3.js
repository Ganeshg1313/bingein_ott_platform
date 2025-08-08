import React, { useState } from 'react';
import { Upload, CheckCircle, XCircle, Loader2, Info } from 'lucide-react'; // Icons for better UX

/**
 * AdminUploadPage Component
 *
 * This component provides a form for administrators to upload new video content.
 * It handles form state, client-side validation, file selection, and submission
 * to a Vercel serverless API route. It provides visual feedback for loading,
 * success, and error states.
 *
 * Key features:
 * - Controlled components for all form inputs.
 * - File input handling for video and thumbnail.
 * - Dynamic UI feedback (loading spinner, success/error messages).
 * - Basic client-side form validation.
 * - Integration with a backend API for file upload and metadata storage.
 * - Uses Tailwind CSS for styling and Lucide React for icons.
 * - Includes temporary fields for Appwrite User/Team IDs for backend permission testing.
 * (These should be replaced by a proper authentication system in a production app).
 */
const AdminUploadPage = () => {
  // --- State Management for Form Inputs ---
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [duration, setDuration] = useState(''); // Stored as string, parsed to number on submit
  const [isPremium, setIsPremium] = useState(false); // Boolean for checkbox
  const [genre, setGenre] = useState('');
  const [tags, setTags] = useState(''); // Comma-separated string
  const [videoFile, setVideoFile] = useState(null); // Stores File object
  const [thumbnailFile, setThumbnailFile] = useState(null); // Stores File object

  // --- Temporary State for Appwrite IDs (for backend permission testing) ---
  // IMPORTANT: In a production application, these IDs would be derived from
  // the authenticated user's session (e.g., via Appwrite's client-side SDK)
  // and NOT manually entered by the user or hardcoded.
  const [appwriteUserId, setAppwriteUserId] = useState(''); // Placeholder for actual user ID
  const [appwriteTeamId, setAppwriteTeamId] = useState(''); // Placeholder for your 'content-management' team ID

  // --- State for UI Feedback and Loading ---
  const [loading, setLoading] = useState(false);
  const [successMessage, setSuccessMessage] = useState('');
  const [errorMessage, setErrorMessage] = useState('');

  // --- Event Handlers ---

  /**
   * Handles changes to text input fields (title, description, duration, genre, tags).
   * @param {React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>} e - The change event.
   * @param {function} setter - The state setter function for the specific field.
   */
  const handleTextChange = (e, setter) => {
    setter(e.target.value);
    setErrorMessage(''); // Clear error messages on input change
    setSuccessMessage(''); // Clear success messages on input change
  };

  /**
   * Handles changes to the video file input.
   * Performs basic file type validation.
   * @param {React.ChangeEvent<HTMLInputElement>} e - The change event.
   */
  const handleVideoFileChange = (e) => {
    const file = e.target.files ? e.target.files[0] : null;
    if (file && file.type.startsWith('video/')) {
      setVideoFile(file);
      setErrorMessage('');
    } else {
      setVideoFile(null);
      setErrorMessage('Please select a valid video file (e.g., .mp4, .mov).');
    }
  };

  /**
   * Handles changes to the thumbnail file input.
   * Performs basic file type validation.
   * @param {React.ChangeEvent<HTMLInputElement>} e - The change event.
   */
  const handleThumbnailFileChange = (e) => {
    const file = e.target.files ? e.target.files[0] : null;
    if (file && file.type.startsWith('image/')) {
      setThumbnailFile(file);
      setErrorMessage('');
    } else {
      setThumbnailFile(null);
      setErrorMessage('Please select a valid image file (e.g., .jpg, .png).');
    }
  };

  /**
   * Handles the form submission.
   * Constructs FormData, sends it to the API, and manages UI feedback.
   * @param {React.FormEvent<HTMLFormElement>} e - The form submission event.
   */
  const handleSubmit = async (e) => {
    e.preventDefault(); // Prevent default browser form submission

    setLoading(true);
    setSuccessMessage('');
    setErrorMessage('');

    // --- Client-side Validation ---
    // Ensure all required fields are filled before sending the request.
    if (!title.trim() || !description.trim() || isNaN(parseInt(duration)) || !videoFile || !thumbnailFile || !appwriteUserId.trim() || !appwriteTeamId.trim()) {
      setErrorMessage('Please fill in all required fields, select both files, and provide valid Appwrite User/Team IDs.');
      setLoading(false);
      return;
    }

    // Create FormData object to send multipart/form-data
    const formData = new FormData();
    formData.append('title', title.trim());
    formData.append('description', description.trim());
    formData.append('duration', parseInt(duration, 10).toString()); // Ensure it's a string for FormData
    formData.append('isPremium', isPremium.toString()); // Convert boolean to string "true" or "false"
    formData.append('genre', genre.trim());
    formData.append('tags', tags.trim());
    formData.append('videoFile', videoFile);
    formData.append('thumbnailFile', thumbnailFile);
    // Append the Appwrite IDs for backend permission processing
    formData.append('userId', appwriteUserId.trim());
    formData.append('teamId', appwriteTeamId.trim());

    try {
      // Send the request to the Vercel API route
      const response = await fetch('/api/upload-video', {
        method: 'POST',
        body: formData, // FormData automatically sets Content-Type: multipart/form-data
      });

      const data = await response.json();

      if (response.ok) {
        setSuccessMessage('Video uploaded and metadata saved successfully!');
        // Reset form fields after successful upload
        setTitle('');
        setDescription('');
        setDuration('');
        setIsPremium(false);
        setGenre('');
        setTags('');
        setVideoFile(null);
          setThumbnailFile(null);
        // Manually reset file input elements to clear selected file names in UI
        document.getElementById('videoFileInput').value = '';
        document.getElementById('thumbnailFileInput').value = '';

      } else {
        // Display error message from the backend
        setErrorMessage(data.message || data.error || 'An unknown error occurred during upload.');
      }
    } catch (error) {
      console.error('Frontend Upload Error:', error);
      setErrorMessage('Failed to connect to the upload service. Please check your network or try again.');
    } finally {
      setLoading(false); // Always stop loading regardless of success or failure
    }
  };

  // --- Render Method ---
  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-900 to-gray-800 flex items-center justify-center p-4 sm:p-6 font-inter">
      <div className="bg-gray-800 p-6 sm:p-8 rounded-xl shadow-2xl w-full max-w-2xl border border-gray-700">
        <h1 className="text-3xl sm:text-4xl font-extrabold text-white mb-8 text-center tracking-tight">
          <Upload className="inline-block mr-3 text-blue-400" size={32} />
          Upload New Content
        </h1>

        {/* --- Feedback Messages --- */}
        {successMessage && (
          <div className="flex items-center bg-green-600 bg-opacity-20 border border-green-500 text-green-200 px-4 py-3 rounded-lg mb-6 shadow-md" role="alert">
            <CheckCircle className="h-6 w-6 mr-3 text-green-400" />
            <p className="text-base font-medium">{successMessage}</p>
          </div>
        )}
        {errorMessage && (
          <div className="flex items-center bg-red-600 bg-opacity-20 border border-red-500 text-red-200 px-4 py-3 rounded-lg mb-6 shadow-md" role="alert">
            <XCircle className="h-6 w-6 mr-3 text-red-400" />
            <p className="text-base font-medium">{errorMessage}</p>
          </div>
        )}

        <form onSubmit={handleSubmit} className="space-y-6">
          {/* --- Temporary Appwrite IDs for Testing --- */}
          <div className="bg-blue-900 bg-opacity-30 border border-blue-700 p-4 rounded-lg shadow-inner">
            <p className="font-bold text-blue-200 flex items-center mb-2">
              <Info className="h-5 w-5 mr-2 text-blue-400" />
              <span className="text-sm sm:text-base">Developer Testing (Remove in Production)</span>
            </p>
            <p className="text-xs text-blue-300 mb-3">
              These IDs are for backend permission testing. Replace with a secure authentication flow.
            </p>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <label htmlFor="appwriteUserId" className="block text-sm font-medium text-gray-300 mb-1">Appwrite User ID</label>
                <input
                  type="text"
                  id="appwriteUserId"
                  value={appwriteUserId}
                  onChange={(e) => handleTextChange(e, setAppwriteUserId)}
                  className="w-full px-4 py-2 bg-gray-700 border border-gray-600 rounded-md text-gray-100 placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent text-sm"
                  placeholder="e.g., user_123abc"
                  required // Make required for testing
                />
              </div>
              <div>
                <label htmlFor="appwriteTeamId" className="block text-sm font-medium text-gray-300 mb-1">Appwrite Team ID</label>
                <input
                  type="text"
                  id="appwriteTeamId"
                  value={appwriteTeamId}
                  onChange={(e) => handleTextChange(e, setAppwriteTeamId)}
                  className="w-full px-4 py-2 bg-gray-700 border border-gray-600 rounded-md text-gray-100 placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent text-sm"
                  placeholder="e.g., team_xyz789 (content-management)"
                  required // Make required for testing
                />
              </div>
            </div>
          </div>

          {/* --- Form Fields --- */}
          {/* Title */}
          <div>
            <label htmlFor="title" className="block text-sm font-medium text-gray-300 mb-1">
              Video Title <span className="text-red-400">*</span>
            </label>
            <input
              type="text"
              id="title"
              value={title}
              onChange={(e) => handleTextChange(e, setTitle)}
              maxLength={255}
              required
              className="w-full px-4 py-2 bg-gray-700 border border-gray-600 rounded-md text-gray-100 placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent text-sm"
              placeholder="e.g., Epic Journey Through the Alps"
            />
          </div>

          {/* Description */}
          <div>
            <label htmlFor="description" className="block text-sm font-medium text-gray-300 mb-1">
              Description <span className="text-red-400">*</span>
            </label>
            <textarea
              id="description"
              rows="4"
              value={description}
              onChange={(e) => handleTextChange(e, setDescription)}
              required
              className="w-full px-4 py-2 bg-gray-700 border border-gray-600 rounded-md text-gray-100 placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent text-sm resize-y"
              placeholder="Provide a detailed description of the video content..."
            ></textarea>
          </div>

          {/* Duration */}
          <div>
            <label htmlFor="duration" className="block text-sm font-medium text-gray-300 mb-1">
              Duration (seconds) <span className="text-red-400">*</span>
            </label>
            <input
              type="number"
              id="duration"
              value={duration}
              onChange={(e) => handleTextChange(e, setDuration)}
              required
              min="1"
              className="w-full px-4 py-2 bg-gray-700 border border-gray-600 rounded-md text-gray-100 placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent text-sm"
              placeholder="e.g., 360 (for 6 minutes)"
            />
          </div>

          {/* Is Premium Checkbox */}
          <div className="flex items-center">
            <input
              id="isPremium"
              type="checkbox"
              checked={isPremium}
              onChange={(e) => setIsPremium(e.target.checked)}
              className="h-5 w-5 text-blue-500 bg-gray-700 border-gray-600 rounded focus:ring-blue-500"
            />
            <label htmlFor="isPremium" className="ml-3 block text-base text-gray-200">
              Mark as Premium Content
            </label>
          </div>

          {/* Genre */}
          <div>
            <label htmlFor="genre" className="block text-sm font-medium text-gray-300 mb-1">
              Genre
            </label>
            <input
              type="text"
              id="genre"
              value={genre}
              onChange={(e) => handleTextChange(e, setGenre)}
              className="w-full px-4 py-2 bg-gray-700 border border-gray-600 rounded-md text-gray-100 placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent text-sm"
              placeholder="e.g., Action, Documentary, Sci-Fi"
            />
          </div>

          {/* Tags */}
          <div>
            <label htmlFor="tags" className="block text-sm font-medium text-gray-300 mb-1">
              Tags (comma-separated)
            </label>
            <input
              type="text"
              id="tags"
              value={tags}
              onChange={(e) => handleTextChange(e, setTags)}
              className="w-full px-4 py-2 bg-gray-700 border border-gray-600 rounded-md text-gray-100 placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent text-sm"
              placeholder="e.g., adventure, mountains, travel, hiking"
            />
          </div>

          {/* Video File Upload */}
          <div>
            <label htmlFor="videoFileInput" className="block text-sm font-medium text-gray-300 mb-1">
              Video File <span className="text-red-400">*</span>
            </label>
            <input
              type="file"
              id="videoFileInput"
              accept="video/mp4,video/mov,video/avi,video/mkv,video/webm" // Common video formats
              onChange={handleVideoFileChange}
              required
              className="w-full text-sm text-gray-400 file:mr-4 file:py-2 file:px-4 file:rounded-full file:border-0 file:text-sm file:font-semibold file:bg-blue-500 file:text-white hover:file:bg-blue-600 transition-colors duration-200 cursor-pointer"
            />
            {videoFile && <p className="text-xs text-gray-400 mt-2">Selected: <span className="font-medium">{videoFile.name}</span> ({ (videoFile.size / (1024 * 1024)).toFixed(2) } MB)</p>}
          </div>

          {/* Thumbnail File Upload */}
          <div>
            <label htmlFor="thumbnailFileInput" className="block text-sm font-medium text-gray-300 mb-1">
              Thumbnail Image <span className="text-red-400">*</span>
            </label>
            <input
              type="file"
              id="thumbnailFileInput"
              accept="image/jpeg,image/png,image/gif,image/webp" // Common image formats
              onChange={handleThumbnailFileChange}
              required
              className="w-full text-sm text-gray-400 file:mr-4 file:py-2 file:px-4 file:rounded-full file:border-0 file:text-sm file:font-semibold file:bg-blue-500 file:text-white hover:file:bg-blue-600 transition-colors duration-200 cursor-pointer"
            />
            {thumbnailFile && <p className="text-xs text-gray-400 mt-2">Selected: <span className="font-medium">{thumbnailFile.name}</span> ({ (thumbnailFile.size / 1024).toFixed(2) } KB)</p>}
          </div>

          {/* Submit Button */}
          <button
            type="submit"
            disabled={loading}
            className={`w-full flex justify-center items-center px-6 py-3 border border-transparent rounded-lg shadow-lg text-lg font-semibold transition-all duration-300 ease-in-out
              ${loading ? 'bg-blue-700 cursor-not-allowed opacity-70' : 'bg-blue-600 hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 text-white'}
            `}
          >
            {loading ? (
              <>
                <Loader2 className="mr-3 h-6 w-6 animate-spin" />
                Uploading...
              </>
            ) : (
              <>
                <Upload className="mr-3 h-6 w-6" />
                Upload Content
              </>
            )}
          </button>
        </form>
      </div>
    </div>
  );
};

export default AdminUploadPage;
