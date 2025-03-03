import React from "react";

export default function RemixPage() {
  return (
    <div className="min-h-screen flex flex-col items-center justify-center bg-white">
      <div className="w-full max-w-2xl mx-auto flex flex-col items-center justify-center py-20">
        {/* Logo and title section */}
        <div className="flex flex-col items-center justify-center mb-12">
          {/* LearnBruh Logo */}
          <img 
            src="/book.png" 
            alt="LearnBruh Logo" 
            className="w-28 h-28 mb-5" 
          />
          
          {/* App Name */}
          <h1 className="text-4xl font-bold text-gray-900 tracking-tight">LearnBruh</h1>
        </div>
        
        {/* Replit info card */}
        <div className="w-full border border-gray-200 rounded-lg overflow-hidden">
          {/* Header with Replit info */}
          <div className="p-4 border-b border-gray-200 flex items-center">
            <div className="flex items-center">
              {/* Replit icon */}
              <svg viewBox="0 0 16 16" fill="none" className="w-4 h-4 text-orange-500 mr-2">
                <path d="M2 0H14L16 2V14L14 16H2L0 14V2L2 0Z" fill="#F26207"></path>
                <path d="M8 10C9.10457 10 10 9.10457 10 8C10 6.89543 9.10457 6 8 6C6.89543 6 6 6.89543 6 8C6 9.10457 6.89543 10 8 10Z" fill="white"></path>
                <path d="M8 4.5C4 4.5 3.5 8 3.5 8H12.5C12.5 8 12 4.5 8 4.5Z" fill="white"></path>
                <path d="M8 11.5C12 11.5 12.5 8 12.5 8H3.5C3.5 8 4 11.5 8 11.5Z" fill="white"></path>
              </svg>
              {/* Username */}
              <span className="text-gray-400 text-sm mr-1">@dpgaus</span>
            </div>
          </div>
          
          {/* Button row */}
          <div className="bg-gray-900 p-3 flex justify-center">
            <a 
              href="https://replit.com/@dpgaus/LearnBruh"
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex items-center justify-center gap-2 px-4 py-2 text-sm font-medium rounded bg-green-600 text-white hover:bg-green-700 transition-colors"
            >
              <svg 
                className="w-4 h-4" 
                viewBox="0 0 24 24" 
                fill="none" 
                xmlns="http://www.w3.org/2000/svg"
              >
                <path d="M4 12V20C4 20.5304 4.21071 21.0391 4.58579 21.4142C4.96086 21.7893 5.46957 22 6 22H18C18.5304 22 19.0391 21.7893 19.4142 21.4142C19.7893 21.0391 20 20.5304 20 20V12" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
                <path d="M12 17L12 3" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
                <path d="M8 7L11.8 3.2C11.8545 3.13962 11.9221 3.09179 11.9978 3.05823C12.0735 3.02467 12.1553 3.00603 12.238 3.00321C12.3207 3.00039 12.4033 3.01342 12.4807 3.04148C12.558 3.06955 12.628 3.11207 12.686 3.168L16.686 7.168" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
              </svg>
              Open on Replit
            </a>
          </div>
          
          {/* Mock README content */}
          <div className="bg-gray-900 text-white p-6">
            <h2 className="text-2xl font-bold mb-4">LearnBruh Learning Management System</h2>
            <p className="text-gray-300 mb-6">A comprehensive learning management system for instructors and students.</p>
          </div>
        </div>
      </div>
    </div>
  );
}