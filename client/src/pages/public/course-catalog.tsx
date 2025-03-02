import { useState, useEffect } from "react";
import { useLocation } from "wouter";
import { useQuery } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle, CardDescription, CardFooter } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { BookOpen, ChevronLeft, Loader2 } from "lucide-react";
import { ThemeToggle } from "@/components/theme-toggle";
import AccessibilitySettings from "@/components/accessibility-settings";

interface Course {
  id: number;
  title: string;
  description: string;
  instructorId: number;
  instructorName?: string;
  published: boolean;
  modules: any[];
  createdAt: string;
}

export default function PublicCourseCatalog() {
  const [, setLocation] = useLocation();
  
  // Fetch public courses
  const { data: courses = [], isLoading } = useQuery<Course[]>({
    queryKey: ["/api/courses/public"],
  });

  // Fetch LMS name
  const { data: lmsSettings } = useQuery({
    queryKey: ["/api/settings/lms-name"],
  });

  const lmsName = lmsSettings?.value || "LearnBruh";

  return (
    <div className="min-h-screen bg-background">
      {/* Header */}
      <header className="border-b">
        <div className="container mx-auto px-4 py-4 flex items-center justify-between">
          <div className="flex items-center gap-4">
            <h1 className="text-xl font-bold">{lmsName}</h1>
          </div>
          <div className="flex items-center gap-4">
            <AccessibilitySettings />
            <ThemeToggle />
            <Button variant="default" onClick={() => setLocation("/auth/login")}>
              Sign In
            </Button>
          </div>
        </div>
      </header>

      {/* Main content */}
      <main className="container mx-auto px-4 py-8">
        <div className="flex items-center justify-between mb-8">
          <div>
            <h1 className="text-3xl font-bold">Course Catalog</h1>
            <p className="text-muted-foreground mt-1">
              Browse our selection of available courses
            </p>
          </div>
        </div>

        {isLoading ? (
          <div className="flex justify-center items-center py-12">
            <Loader2 className="h-8 w-8 animate-spin text-primary" />
          </div>
        ) : courses.length === 0 ? (
          <div className="text-center py-12">
            <BookOpen className="h-12 w-12 mx-auto text-muted-foreground" />
            <h2 className="mt-4 text-xl font-semibold">No courses available</h2>
            <p className="mt-2 text-muted-foreground">
              Check back later for new courses
            </p>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {courses.map((course) => (
              <Card key={course.id} className="flex flex-col h-full">
                <CardHeader>
                  <CardTitle>{course.title}</CardTitle>
                  <CardDescription>
                    {course.description.length > 100
                      ? `${course.description.substring(0, 100)}...`
                      : course.description}
                  </CardDescription>
                </CardHeader>
                <CardContent className="flex-1">
                  <div className="text-sm text-muted-foreground">
                    {course.modules?.length || 0} {course.modules?.length === 1 ? "Module" : "Modules"}
                  </div>
                </CardContent>
                <CardFooter>
                  <Button
                    className="w-full"
                    onClick={() => setLocation("/auth/login")}
                  >
                    Sign in to enroll
                  </Button>
                </CardFooter>
              </Card>
            ))}
          </div>
        )}
      </main>

      {/* Footer */}
      <footer className="border-t mt-auto">
        <div className="container mx-auto px-4 py-6">
          <div className="flex flex-col md:flex-row justify-between items-center">
            <p className="text-sm text-muted-foreground">
              &copy; {new Date().getFullYear()} {lmsName}. All rights reserved.
            </p>
            <div className="flex items-center gap-4 mt-4 md:mt-0">
              <Button variant="link" size="sm" onClick={() => setLocation("/auth/login")}>
                Sign In
              </Button>
              <Button variant="link" size="sm" onClick={() => setLocation("/auth/register/student")}>
                Register
              </Button>
            </div>
          </div>
        </div>
      </footer>
    </div>
  );
}
