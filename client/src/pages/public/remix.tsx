import React from "react";
import { useTheme } from "@/components/theme-provider";

export default function RemixPage() {
  const { theme } = useTheme();
  
  return (
    <div className="min-h-screen flex flex-col items-center justify-center bg-background">
      <div className="max-w-md w-full text-center space-y-8">
        {/* LearnBruh Logo */}
        <div className="mx-auto">
          <img 
            src="/book.png" 
            alt="LearnBruh Logo" 
            className="w-32 h-32 mx-auto" 
          />
        </div>
        
        {/* App Name */}
        <h1 className="text-5xl font-bold tracking-tight text-primary">LearnBruh</h1>
      </div>
    </div>
  );
}