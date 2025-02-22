import { useQuery } from "@tanstack/react-query";
import { Course } from "@shared/schema";
import { Button } from "@/components/ui/button";
import { useAuth } from "@/hooks/use-auth";
import { Link } from "wouter";
import CourseCard from "@/components/course-card";
import { Loader2, Plus } from "lucide-react";

export default function InstructorDashboard() {
  const { user } = useAuth();
  const { data: courses, isLoading } = useQuery<Course[]>({
    queryKey: ["/api/courses/instructor"],
  });

  if (isLoading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <Loader2 className="h-8 w-8 animate-spin" />
      </div>
    );
  }

  return (
    <div className="container mx-auto py-8 space-y-8">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold">Welcome, {user?.name}!</h1>
          <p className="text-muted-foreground">Manage your courses and students</p>
        </div>
        <Link href="/create-course">
          <Button>
            <Plus className="mr-2 h-4 w-4" />
            Create Course
          </Button>
        </Link>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {courses?.map((course) => (
          <CourseCard 
            key={course.id} 
            course={course}
            role="instructor"
          />
        ))}
        {courses?.length === 0 && (
          <div className="col-span-full text-center py-12">
            <h3 className="text-xl font-medium text-muted-foreground">
              No courses yet. Create your first course to get started!
            </h3>
          </div>
        )}
      </div>
    </div>
  );
}
