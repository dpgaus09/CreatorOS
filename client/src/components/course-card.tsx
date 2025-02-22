import { Course, Enrollment } from "@shared/schema";
import { Card, CardContent, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Progress } from "@/components/ui/progress";
import { useMutation } from "@tanstack/react-query";
import { apiRequest, queryClient } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";
import { Book, CheckCircle } from "lucide-react";

interface CourseCardProps {
  course: Course;
  role: "instructor" | "student";
  enrollment?: Enrollment;
}

export default function CourseCard({ course, role, enrollment }: CourseCardProps) {
  const { toast } = useToast();

  const enrollMutation = useMutation({
    mutationFn: async () => {
      const res = await apiRequest("POST", "/api/enrollments", {
        courseId: course.id,
      });
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/enrollments"] });
      toast({
        title: "Enrolled successfully",
        description: `You are now enrolled in ${course.title}`,
      });
    },
    onError: (error: Error) => {
      toast({
        title: "Failed to enroll",
        description: error.message,
        variant: "destructive",
      });
    },
  });

  const publishMutation = useMutation({
    mutationFn: async () => {
      const res = await apiRequest("PATCH", `/api/courses/${course.id}`, {
        published: !course.published,
      });
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/courses/instructor"] });
      toast({
        title: course.published ? "Course unpublished" : "Course published",
        description: course.published
          ? "Students can no longer enroll in this course"
          : "Students can now enroll in this course",
      });
    },
  });

  const getProgress = () => {
    if (!enrollment?.progress) return 0;
    const totalLessons = course.modules.reduce(
      (acc, module) => acc + module.lessons.length,
      0,
    );
    const completedLessons = Object.keys(enrollment.progress).length;
    return Math.round((completedLessons / totalLessons) * 100);
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center justify-between">
          <span>{course.title}</span>
          {role === "instructor" && (
            <Button
              variant={course.published ? "outline" : "default"}
              size="sm"
              onClick={() => publishMutation.mutate()}
              disabled={publishMutation.isPending}
            >
              {course.published ? "Unpublish" : "Publish"}
            </Button>
          )}
        </CardTitle>
      </CardHeader>
      <CardContent>
        <div className="flex items-center gap-2 text-sm text-muted-foreground mb-4">
          <Book className="h-4 w-4" />
          <span>
            {course.modules.length} modules,{" "}
            {course.modules.reduce((acc, m) => acc + m.lessons.length, 0)} lessons
          </span>
        </div>
        {enrollment && (
          <div className="space-y-2">
            <div className="flex items-center justify-between text-sm">
              <span>Progress</span>
              <span>{getProgress()}%</span>
            </div>
            <Progress value={getProgress()} />
          </div>
        )}
      </CardContent>
      <CardFooter>
        {role === "student" &&
          (enrollment ? (
            <Button className="w-full" variant="outline">
              <CheckCircle className="mr-2 h-4 w-4" />
              Continue Learning
            </Button>
          ) : (
            <Button
              className="w-full"
              onClick={() => enrollMutation.mutate()}
              disabled={enrollMutation.isPending}
            >
              {enrollMutation.isPending ? "Enrolling..." : "Enroll Now"}
            </Button>
          ))}
      </CardFooter>
    </Card>
  );
}
