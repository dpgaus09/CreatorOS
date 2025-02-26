import { useState, useEffect } from "react";
import { useAuth } from "@/hooks/use-auth";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { LogOut, User, Pencil } from "lucide-react";
import { Link, useLocation } from "wouter";
import { apiRequest } from "@/lib/queryClient";
import { useQuery, useMutation } from "@tanstack/react-query";
import { useToast } from "@/hooks/use-toast";

export default function Navbar() {
  const { user, logoutMutation } = useAuth();
  const [location] = useLocation();
  const [isEditing, setIsEditing] = useState(false);
  const { toast } = useToast();

  const { data: settings } = useQuery({
    queryKey: ["/api/settings/lms-name"],
    queryFn: async () => {
      const response = await fetch("/api/settings/lms-name");
      if (!response.ok) {
        throw new Error("Failed to fetch LMS name");
      }
      return response.json();
    },
  });

  const updateLmsNameMutation = useMutation({
    mutationFn: async (newName: string) => {
      return apiRequest("POST", "/api/settings/lms-name", { value: newName });
    },
    onSuccess: () => {
      toast({
        title: "Success",
        description: "LMS name updated successfully",
      });
    },
    onError: (error: Error) => {
      toast({
        title: "Error",
        description: error.message,
        variant: "destructive",
      });
    },
  });

  const isInstructor = user?.role === "instructor";
  const isInstructorDashboard = location === "/";
  const lmsName = settings?.value || "LearnBruh";

  const handleNameUpdate = (newName: string) => {
    updateLmsNameMutation.mutate(newName);
    setIsEditing(false);
  };

  return (
    <nav className="border-b">
      <div className="container mx-auto px-4 h-16 flex items-center justify-between">
        <Link href="/" className="hover:opacity-80 transition-opacity">
          {isInstructor && isInstructorDashboard && isEditing ? (
            <Input
              value={lmsName}
              onChange={(e) => handleNameUpdate(e.target.value)} //Changed to handleNameUpdate
              onBlur={() => handleNameUpdate(lmsName)}
              onKeyDown={(e) => {
                if (e.key === 'Enter') {
                  handleNameUpdate(lmsName);
                }
              }}
              autoFocus
              className="w-40 text-xl font-bold px-0"
            />
          ) : (
            <div className="flex items-center gap-2">
              <h1 className="text-xl font-bold cursor-pointer">{lmsName}</h1>
              {isInstructor && isInstructorDashboard && (
                <Button
                  variant="ghost"
                  size="icon"
                  className="h-8 w-8 hover:bg-transparent"
                  onClick={() => setIsEditing(true)}
                >
                  <Pencil className="h-4 w-4 text-muted-foreground" />
                </Button>
              )}
            </div>
          )}
        </Link>

        {user && (
          <div className="flex items-center gap-4">
            <div className="flex items-center gap-2">
              <User className="h-4 w-4" />
              <span>{user.name}</span>
            </div>
            <Button 
              variant="outline" 
              size="sm"
              onClick={() => logoutMutation.mutate()}
              disabled={logoutMutation.isPending}
            >
              <LogOut className="h-4 w-4 mr-2" />
              {logoutMutation.isPending ? "Logging out..." : "Logout"}
            </Button>
          </div>
        )}
      </div>
    </nav>
  );
}