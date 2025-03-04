import React, { useState, useEffect } from "react";

export default function RemixPage() {
  const [iframeHeight, setIframeHeight] = useState("calc(100vh - 56px)");
  
  // The simpler URL you provided
  const replitUrl = "https://replit.com/@dpgaus/LearnBruh";

  useEffect(() => {
    // Adjust iframe height based on window size
    const handleResize = () => {
      // Leave room for the header (56px)
      setIframeHeight(`calc(100vh - 56px)`);
    };

    window.addEventListener("resize", handleResize);
    handleResize(); // Initial check
    
    return () => window.removeEventListener("resize", handleResize);
  }, []);

  return (
    <div className="min-h-screen w-full flex flex-col bg-gray-50">
      {/* Simple header matching the screenshot */}
      <div className="flex items-center justify-between bg-white px-4 h-14 border-b border-gray-200">
        <div className="flex items-center space-x-2">
          <svg viewBox="0 0 24 24" className="w-5 h-5 text-gray-700" fill="none" xmlns="http://www.w3.org/2000/svg">
            <path d="M19 3H5C3.89543 3 3 3.89543 3 5V19C3 20.1046 3.89543 21 5 21H19C20.1046 21 21 20.1046 21 19V5C21 3.89543 20.1046 3 19 3Z" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
            <path d="M3 9H21" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
            <path d="M9 21V9" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
          </svg>
          <span className="font-medium text-gray-900">LearnBruh LMS</span>
        </div>
        <div className="text-sm text-gray-600">Fork to your Replit account</div>
      </div>
      
      {/* Full-width iframe */}
      <div className="w-full flex-1" style={{ height: iframeHeight }}>
        <iframe 
          src={replitUrl}
          width="100%" 
          height="100%" 
          title="LearnBruh Replit"
          className="border-0"
          allow="accelerometer; camera; encrypted-media; geolocation; gyroscope; microphone; midi; clipboard-read; clipboard-write"
          sandbox="allow-forms allow-modals allow-popups allow-presentation allow-same-origin allow-scripts"
        ></iframe>
      </div>
    </div>
  );
}