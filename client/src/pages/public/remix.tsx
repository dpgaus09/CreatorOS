import React, { useState, useEffect } from "react";
import { useToast } from "@/hooks/use-toast";

export default function RemixPage() {
  const { toast } = useToast();
  const [iframeLoaded, setIframeLoaded] = useState(false);
  const [iframeHeight, setIframeHeight] = useState("800px");

  // The specific fork URL that opens the fork dialog directly
  const forkUrl = "https://replit.com/@dpgaus/LearnBruh?forkRepl=bdd4fd45-2d0e-4770-b98a-d8972bca212e&forkContext=coverPage&redirecting=1#README.md";

  useEffect(() => {
    // Adjust iframe height for mobile
    const handleResize = () => {
      if (window.innerWidth < 768) {
        setIframeHeight("100vh");
      } else {
        setIframeHeight("800px");
      }
    };

    window.addEventListener("resize", handleResize);
    handleResize(); // Initial check
    
    return () => window.removeEventListener("resize", handleResize);
  }, []);

  const handleIframeLoad = () => {
    setIframeLoaded(true);
    toast({
      title: "Ready to Fork",
      description: "Sign up or log in to fork LearnBruh LMS to your Replit account.",
      duration: 5000,
    });
  };

  return (
    <div className="min-h-screen w-full flex flex-col items-center bg-gray-100">
      {/* Loading indicator */}
      {!iframeLoaded && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-white bg-opacity-80">
          <div className="text-center">
            <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-primary mb-4 mx-auto"></div>
            <p className="text-lg font-medium">Loading Replit Authentication...</p>
            <p className="text-sm text-gray-500 mt-2">This may take a few seconds</p>
          </div>
        </div>
      )}

      {/* Responsive container for iframe */}
      <div className="w-full max-w-6xl mx-auto pt-4 px-4 md:pt-8 md:px-8">
        <div className="bg-white rounded-lg shadow-xl overflow-hidden">
          {/* Logo and branding */}
          <div className="p-4 border-b border-gray-200 flex items-center justify-between">
            <div className="flex items-center space-x-2">
              <img src="/book.png" alt="LearnBruh Logo" className="w-6 h-6" />
              <span className="font-semibold text-gray-800">LearnBruh LMS</span>
            </div>
            <div className="text-sm text-gray-500">Fork to your Replit account</div>
          </div>
          
          {/* Iframe with direct fork URL */}
          <div className="w-full" style={{ height: iframeHeight }}>
            <iframe 
              src={forkUrl}
              width="100%" 
              height="100%" 
              onLoad={handleIframeLoad}
              title="LearnBruh Replit Fork"
              className="border-0"
              allow="accelerometer; camera; encrypted-media; geolocation; gyroscope; microphone; midi; clipboard-read; clipboard-write"
              sandbox="allow-forms allow-modals allow-popups allow-presentation allow-same-origin allow-scripts"
            ></iframe>
          </div>
        </div>
        
        {/* Info text at the bottom */}
        <div className="mt-4 text-sm text-center text-gray-500 px-4">
          By signing up, you'll create your own copy of LearnBruh LMS that you can customize and deploy.
        </div>
      </div>
    </div>
  );
}