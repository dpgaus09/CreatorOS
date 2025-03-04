import React from "react";
import { Button } from "@/components/ui/button";

export default function RemixPage() {
  // The exact URL to fork the project
  const forkUrl = "https://replit.com/@dpgaus/LearnBruh";
  
  const handleForkClick = () => {
    window.open(forkUrl, "_blank");
  };

  return (
    <div className="min-h-screen w-full flex flex-col bg-gray-50">
      {/* Header matching the screenshot */}
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
      
      {/* Main content area */}
      <div className="flex-1 flex flex-col items-center justify-center p-6">
        <div className="max-w-lg w-full flex flex-col items-center text-center">
          {/* Large LearnBruh Logo */}
          <img 
            src="/book.png" 
            alt="LearnBruh Logo" 
            className="w-32 h-32 mb-6" 
          />
          
          <h1 className="text-3xl font-bold text-gray-900 mb-4">LearnBruh Learning Management System</h1>
          
          <p className="text-gray-600 mb-8">
            Get your own copy of this Learning Management System by forking it to your Replit account.
            Customize it, deploy it, and make it your own.
          </p>
          
          {/* Fork button */}
          <Button 
            onClick={handleForkClick}
            className="bg-[#0098ab] hover:bg-[#007d8a] text-white px-6 py-6 text-lg h-auto"
            size="lg"
          >
            Fork to your Replit account
          </Button>
          
          <p className="text-sm text-gray-500 mt-6">
            You'll need a Replit account to fork this project. If you don't have one,
            you can create one for free when you click the button above.
          </p>
        </div>
      </div>
    </div>
  );
}