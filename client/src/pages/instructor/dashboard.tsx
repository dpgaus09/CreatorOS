import { useQuery } from "@tanstack/react-query";
import { Course, Module } from "@shared/schema";
import { Button } from "@/components/ui/button";
import { useAuth } from "@/hooks/use-auth";
import { Link, useLocation } from "wouter";
import CourseCard from "@/components/course-card";
import { Loader2, Plus, BookOpen, Users, Layout } from "lucide-react";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { useToast } from "@/hooks/use-toast";

export default function InstructorDashboard() {
  const { user } = useAuth();
  const { toast } = useToast();
  const [, setLocation] = useLocation();

  const { data: courses, isLoading: loadingCourses, error: coursesError } = useQuery<Course[]>({
    queryKey: ["/api/courses/instructor"],
  });

  const { data: students, isLoading: loadingStudents } = useQuery({
    queryKey: ["/api/students"],
  });

  if (loadingCourses || loadingStudents) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <Loader2 className="h-8 w-8 animate-spin" />
      </div>
    );
  }

  if (coursesError) {
    return (
      <div className="container mx-auto py-8">
        <div className="text-center py-12">
          <h3 className="text-xl font-medium text-destructive">
            Failed to load courses. Please try again later.
          </h3>
        </div>
      </div>
    );
  }

  const publishedCourses = courses?.filter((c) => c.published) || [];
  const draftCourses = courses?.filter((c) => !c.published) || [];
  const totalStudents = students?.length || 0;

  const totalLessons = courses?.reduce((acc, course) => {
    const modules = course.modules as Module[];
    return acc + modules.reduce(
      (moduleAcc, module) => moduleAcc + module.lessons.length,
      0
    );
  }, 0) || 0;

  return (
    <div className="container mx-auto py-8 space-y-8">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold">Welcome back, {user?.name}!</h1>
          <p className="text-muted-foreground">
            Manage your courses and track student progress
          </p>
        </div>
        <Link href="/create-course">
          <Button size="lg">
            <Plus className="mr-2 h-4 w-4" />
            Create New Course
          </Button>
        </Link>
      </div>

      <div className="grid gap-4 md:grid-cols-3">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">
              Total Courses
            </CardTitle>
            <Layout className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{courses?.length || 0}</div>
            <p className="text-xs text-muted-foreground">
              {publishedCourses.length} published, {draftCourses.length} drafts
            </p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">
              Total Students
            </CardTitle>
            <Users className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{totalStudents}</div>
            <Button
              variant="link"
              className="px-0 text-xs text-muted-foreground hover:no-underline"
              onClick={() => setLocation("/students")}
            >
              View all students →
            </Button>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">
              Total Lessons
            </CardTitle>
            <BookOpen className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{totalLessons}</div>
            <p className="text-xs text-muted-foreground">
              In {courses?.length || 0} courses
            </p>
          </CardContent>
        </Card>
      </div>

      <Tabs defaultValue="all" className="space-y-6">
        <TabsList>
          <TabsTrigger value="all">All Courses</TabsTrigger>
          <TabsTrigger value="published">Published</TabsTrigger>
          <TabsTrigger value="drafts">Drafts</TabsTrigger>
        </TabsList>

        <TabsContent value="all" className="space-y-6">
          {!courses?.length ? (
            <div className="text-center py-12">
              <h3 className="text-xl font-medium text-muted-foreground">
                No courses yet. Create your first course to get started!
              </h3>
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              {courses.map((course) => (
                <CourseCard
                  key={course.id}
                  course={course}
                  role="instructor"
                />
              ))}
            </div>
          )}
        </TabsContent>

        <TabsContent value="published" className="space-y-6">
          {publishedCourses.length === 0 ? (
            <div className="text-center py-12">
              <h3 className="text-xl font-medium text-muted-foreground">
                No published courses yet
              </h3>
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              {publishedCourses.map((course) => (
                <CourseCard
                  key={course.id}
                  course={course}
                  role="instructor"
                />
              ))}
            </div>
          )}
        </TabsContent>

        <TabsContent value="drafts" className="space-y-6">
          {draftCourses.length === 0 ? (
            <div className="text-center py-12">
              <h3 className="text-xl font-medium text-muted-foreground">
                No draft courses
              </h3>
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              {draftCourses.map((course) => (
                <CourseCard
                  key={course.id}
                  course={course}
                  role="instructor"
                />
              ))}
            </div>
          )}
        </TabsContent>
      </Tabs>
    </div>
  );
}