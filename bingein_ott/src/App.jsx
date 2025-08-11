import React, { useState } from 'react';
import AdminUploadPage from './admin/AdminUploadPage';
import HomePage from './components/HomePage';
import VideoDetailPage from './components/videoDetailPage'; // Import the new detail page

function App() {
  // State to manage current page view and selected video ID
  const [currentPage, setCurrentPage] = useState('home'); // 'home', 'upload', or 'detail'
  const [selectedVideoId, setSelectedVideoId] = useState(null); // Stores ID of video to play

  // Function to navigate to video detail page
  const navigateToVideoDetail = (videoId) => {
    setSelectedVideoId(videoId);
    setCurrentPage('detail');
  };

  // Function to navigate back to home page
  const navigateToHome = () => {
    setSelectedVideoId(null); // Clear selected video
    setCurrentPage('home');
  };

  // Render the selected page based on state
  const renderPage = () => {
    switch (currentPage) {
      case 'home':
        // Pass a prop to HomePage to handle video clicks
        return <HomePage onVideoClick={navigateToVideoDetail} />;
      case 'upload':
        return <AdminUploadPage />;
      case 'detail':
        // Pass the selectedVideoId to VideoDetailPage
        return <VideoDetailPage videoId={selectedVideoId} onBack={navigateToHome} />;
      default:
        return <HomePage onVideoClick={navigateToVideoDetail} />;
    }
  };

  return (
    <>
      {/* Basic Navigation */}
      <nav className="bg-gray-900 p-4 shadow-lg">
        <div className="container mx-auto flex justify-between items-center">
          <h1 className="text-white text-2xl font-bold">MyOTT</h1>
          <div>
            <button
              onClick={navigateToHome} // Use navigateToHome to ensure ID is cleared
              className={`px-4 py-2 rounded-md transition-colors duration-200 ${currentPage === 'home' ? 'bg-blue-600 text-white' : 'text-gray-300 hover:bg-gray-700'}`}
            >
              Home
            </button>
            <button
              onClick={() => setCurrentPage('upload')}
              className={`ml-4 px-4 py-2 rounded-md transition-colors duration-200 ${currentPage === 'upload' ? 'bg-blue-600 text-white' : 'text-gray-300 hover:bg-gray-700'}`}
            >
              Upload
            </button>
          </div>
        </div>
      </nav>

      {/* Render the current page */}
      <main>
        {renderPage()}
      </main>
    </>
  );
}

export default App;