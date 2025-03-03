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
        <div className="flex items-center justify-center gap-2 mt-6">
          <span className="text-sm font-medium text-muted-foreground">Repl:</span>
          <h1 className="text-4xl font-bold tracking-tight text-primary">LearnBruh</h1>
        </div>
        
        {/* Created by */}
        <div className="text-muted-foreground mt-2">
          Created by <span className="font-semibold">dpgaus</span>
        </div>
        
        {/* Remix button */}
        <div className="pt-4">
          <a 
            href="https://replit.com/@dpgaus/LearnBruh"
            target="_blank"
            rel="noopener noreferrer"
            className="inline-flex items-center justify-center gap-2 px-6 py-3 text-base font-medium rounded-lg bg-primary text-primary-foreground hover:bg-primary/90 transition-colors"
          >
            <svg 
              className="w-5 h-5" 
              viewBox="0 0 24 24" 
              fill="none" 
              xmlns="http://www.w3.org/2000/svg"
            >
              <path d="M12 2L2 7L12 12L22 7L12 2Z" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
              <path d="M2 17L12 22L22 17" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
              <path d="M2 12L12 17L22 12" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
            </svg>
            Remix this app
          </a>
        </div>
      </div>
    </div>
  );
}