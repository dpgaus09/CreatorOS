import { useQuery } from "@tanstack/react-query";
import { Course, Enrollment } from "@shared/schema";
import { useAuth } from "@/hooks/use-auth";
import CourseCard from "@/components/course-card";
import { Loader2 } from "lucide-react";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { useToast } from "@/hooks/use-toast";

export default function StudentDashboard() {
  const { user } = useAuth();
  const { toast } = useToast();

  const { data: publishedCourses, isLoading: loadingCourses } = useQuery<Course[]>({
    queryKey: ["/api/courses/published"],
    onError: (error: Error) => {
      toast({
        title: "Error loading courses",
        description: error.message,
        variant: "destructive",
      });
    },
  });

  const { data: enrollments, isLoading: loadingEnrollments } = useQuery<Enrollment[]>({
    queryKey: ["/api/enrollments"],
  });

  if (loadingCourses || loadingEnrollments) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <Loader2 className="h-8 w-8 animate-spin" />
      </div>
    );
  }

  const enrolledCourseIds = new Set(enrollments?.map(e => e.courseId));
  const enrolledCourses = publishedCourses?.filter(c => enrolledCourseIds.has(c.id)) || [];
  const availableCourses = publishedCourses?.filter(c => !enrolledCourseIds.has(c.id)) || [];

  return (
    <div className="container mx-auto py-8 space-y-8">
      <div>
        <h1 className="text-3xl font-bold">Welcome, {user?.name}!</h1>
        <p className="text-muted-foreground">Continue learning or discover new courses</p>
      </div>

      <Tabs defaultValue="available">
        <TabsList>
          <TabsTrigger value="enrolled">My Courses</TabsTrigger>
          <TabsTrigger value="available">Available Courses</TabsTrigger>
        </TabsList>

        <TabsContent value="enrolled" className="mt-6">
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {enrolledCourses.map((course) => (
              <CourseCard
                key={course.id}
                course={course}
                role="student"
                enrollment={enrollments?.find(e => e.courseId === course.id)}
              />
            ))}
            {enrolledCourses.length === 0 && (
              <div className="col-span-full text-center py-12">
                <h3 className="text-xl font-medium text-muted-foreground">
                  You haven't enrolled in any courses yet
                </h3>
              </div>
            )}
          </div>
        </TabsContent>

        <TabsContent value="available" className="mt-6">
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {availableCourses.map((course) => (
              <CourseCard
                key={course.id}
                course={course}
                role="student"
              />
            ))}
            {availableCourses.length === 0 && (
              <div className="col-span-full text-center py-12">
                <h3 className="text-xl font-medium text-muted-foreground">
                  No courses available at the moment
                </h3>
              </div>
            )}
          </div>
        </TabsContent>
      </Tabs>
    </div>
  );
}