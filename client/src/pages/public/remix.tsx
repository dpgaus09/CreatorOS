import React from "react";
import { useTheme } from "@/components/theme-provider";

export default function RemixPage() {
  const { theme } = useTheme();
  
  return (
    <div className="min-h-screen flex flex-col items-center justify-center bg-background px-4 py-10">
      <div className="w-full max-w-4xl mx-auto">
        <div className="flex flex-col items-center justify-center mb-8">
          {/* LearnBruh Logo */}
          <div className="mx-auto mb-6">
            <img 
              src="/book.png" 
              alt="LearnBruh Logo" 
              className="w-24 h-24" 
            />
          </div>
          
          {/* App Name */}
          <h1 className="text-3xl font-bold tracking-tight text-primary">LearnBruh</h1>
        </div>
        
        {/* Embedded Replit iframe */}
        <div className="w-full overflow-hidden rounded-lg border border-border shadow-lg">
          <iframe 
            src="https://replit.com/@dpgaus/LearnBruh?embed=true" 
            width="100%" 
            height="600" 
            title="LearnBruh Replit"
            className="border-0"
            allow="accelerometer; camera; encrypted-media; geolocation; gyroscope; microphone; midi; clipboard-read; clipboard-write"
            sandbox="allow-forms allow-modals allow-popups allow-presentation allow-same-origin allow-scripts"
          ></iframe>
        </div>
      </div>
    </div>
  );
}