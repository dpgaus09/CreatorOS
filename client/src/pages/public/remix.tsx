import React from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { FaGoogle, FaGithub, FaTwitter } from "react-icons/fa";
import { useToast } from "@/hooks/use-toast";

export default function RemixPage() {
  const { toast } = useToast();
  
  const handleAuthClick = (provider: string) => {
    toast({
      title: "Authentication Required",
      description: `Redirecting to ${provider} authentication...`,
      duration: 3000,
    });
    
    // In a real implementation, this would redirect to Replit's auth flow
    setTimeout(() => {
      window.open("https://replit.com/@dpgaus/LearnBruh", "_blank");
    }, 1000);
  };

  return (
    <div className="min-h-screen flex flex-col items-center justify-center bg-gray-100">
      <div className="w-full max-w-md mx-auto">
        {/* Sign up modal/card */}
        <div className="bg-white rounded-lg shadow-xl overflow-hidden">
          {/* Header */}
          <div className="flex flex-col items-center justify-center p-6 border-b border-gray-200">
            <h2 className="text-xl font-semibold text-gray-800">Sign up to fork this App</h2>
          </div>
          
          {/* Auth buttons section */}
          <div className="p-6 space-y-4">
            {/* Google */}
            <Button 
              onClick={() => handleAuthClick("Google")}
              className="w-full bg-white text-gray-700 border border-gray-300 hover:bg-gray-50 flex items-center justify-center gap-2 h-11"
              variant="outline"
            >
              <FaGoogle className="text-[#4285F4]" />
              Continue with Google
            </Button>
            
            {/* GitHub */}
            <Button 
              onClick={() => handleAuthClick("GitHub")}
              className="w-full bg-white text-gray-700 border border-gray-300 hover:bg-gray-50 flex items-center justify-center gap-2 h-11"
              variant="outline"
            >
              <FaGithub className="text-black" />
              Continue with GitHub
            </Button>
            
            {/* Twitter/X */}
            <Button 
              onClick={() => handleAuthClick("X")}
              className="w-full bg-white text-gray-700 border border-gray-300 hover:bg-gray-50 flex items-center justify-center gap-2 h-11"
              variant="outline"
            >
              <FaTwitter className="text-[#1DA1F2]" />
              Continue with X
            </Button>
            
            {/* Divider */}
            <div className="relative">
              <div className="absolute inset-0 flex items-center">
                <div className="w-full border-t border-gray-300"></div>
              </div>
              <div className="relative flex justify-center text-sm">
                <span className="px-2 bg-white text-gray-500">OR</span>
              </div>
            </div>
            
            {/* Email & Password form */}
            <div className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="email">Email</Label>
                <Input id="email" placeholder="Email" type="email" />
              </div>
              <div className="space-y-2">
                <Label htmlFor="password">Password</Label>
                <Input id="password" placeholder="Password" type="password" />
              </div>
              <Button 
                className="w-full" 
                onClick={() => handleAuthClick("Email")}
              >
                Sign up
              </Button>
            </div>
            
            {/* Single sign-on */}
            <Button 
              onClick={() => handleAuthClick("SSO")}
              className="w-full bg-white text-gray-700 border border-gray-300 hover:bg-gray-50"
              variant="outline"
            >
              Single sign-on (SSO)
            </Button>
          </div>
          
          {/* Terms and privacy policy */}
          <div className="px-6 pb-4 text-xs text-center text-gray-500">
            By continuing, you agree to Replit's<br />
            <a href="https://replit.com/site/terms" className="text-blue-600 hover:underline" target="_blank" rel="noopener noreferrer">
              Terms of Service
            </a>
            {" and "}
            <a href="https://replit.com/site/privacy" className="text-blue-600 hover:underline" target="_blank" rel="noopener noreferrer">
              Privacy Policy
            </a>
          </div>
          
          {/* Already have an account */}
          <div className="px-6 pb-4 text-sm text-center">
            <span className="text-gray-600">Already have an account?</span>{" "}
            <a 
              href="https://replit.com/login" 
              className="text-blue-600 hover:underline" 
              target="_blank" 
              rel="noopener noreferrer"
            >
              Log in
            </a>
          </div>
          
          {/* Get help & reCAPTCHA notice */}
          <div className="px-6 pb-6 text-xs text-center space-y-2">
            <a 
              href="https://replit.com/help" 
              className="text-blue-600 hover:underline block" 
              target="_blank" 
              rel="noopener noreferrer"
            >
              Get help
            </a>
            <p className="text-gray-500">
              This site is protected by reCAPTCHA Enterprise and the Google{" "}
              <a 
                href="https://policies.google.com/privacy" 
                className="text-blue-600 hover:underline" 
                target="_blank" 
                rel="noopener noreferrer"
              >
                Privacy Policy
              </a>{" "}
              and{" "}
              <a 
                href="https://policies.google.com/terms" 
                className="text-blue-600 hover:underline" 
                target="_blank" 
                rel="noopener noreferrer"
              >
                Terms of Service
              </a>{" "}
              apply.
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}