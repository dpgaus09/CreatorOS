import { Course, Enrollment, Module } from "@shared/schema";
import { Card, CardContent, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Progress } from "@/components/ui/progress";
import { useMutation } from "@tanstack/react-query";
import { apiRequest, queryClient } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";
import { Book, CheckCircle, Users, Clock, Edit, Eye } from "lucide-react";
import { useLocation } from "wouter";
import { useAccessibility } from "@/hooks/use-accessibility";

interface CourseCardProps {
  course: Course;
  role: "instructor" | "student";
  enrollment?: Enrollment;
}

export default function CourseCard({ course, role, enrollment }: CourseCardProps) {
  const { toast } = useToast();
  const [, setLocation] = useLocation();
  const { speak } = useAccessibility();

  const enrollMutation = useMutation({
    mutationFn: async () => {
      const res = await apiRequest("POST", "/api/enrollments", {
        courseId: course.id,
      });
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/enrollments"] });
      queryClient.invalidateQueries({ queryKey: ["/api/courses/published"] });
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
    onError: (error: Error) => {
      toast({
        title: "Failed to update course",
        description: error.message,
        variant: "destructive",
      });
    },
  });

  const modules = course.modules as Module[];
  const totalLessons = modules.reduce(
    (acc, module) => acc + module.lessons.length,
    0
  );

  const getProgress = () => {
    if (!enrollment?.progress) return 0;
    const completedLessons = Object.keys(enrollment.progress).length;
    return Math.round((completedLessons / totalLessons) * 100);
  };

  return (
    <Card className="relative overflow-hidden">
      {role === "instructor" && (
        <div className={`absolute top-0 right-0 p-2 rounded-bl-lg ${
          course.published ? "bg-green-500/10" : "bg-yellow-500/10"
        }`}>
          <span className={`text-sm font-medium ${
            course.published ? "text-green-600" : "text-yellow-600"
          }`}
            onMouseEnter={() => speak(course.published ? "Published" : "Draft")}
          >
            {course.published ? "Published" : "Draft"}
          </span>
        </div>
      )}

      <CardHeader>
        <CardTitle className="flex items-start justify-between">
          <div className="space-y-1">
            <h3 
              className="text-xl font-bold"
              onMouseEnter={() => speak(course.title)}
              tabIndex={0}
              onFocus={() => speak(course.title)}
            >
              {course.title}
            </h3>
            <p 
              className="text-sm text-muted-foreground line-clamp-2"
              onMouseEnter={() => speak(course.description)}
              tabIndex={0}
              onFocus={() => speak(course.description)}
            >
              {course.description}
            </p>
          </div>
        </CardTitle>
      </CardHeader>

      <CardContent>
        <div className="grid grid-cols-2 gap-4 text-sm mb-4">
          <div 
            className="flex items-center gap-2"
            onMouseEnter={() => speak(`${modules.length} modules`)}
            tabIndex={0}
            onFocus={() => speak(`${modules.length} modules`)}
          >
            <Book className="h-4 w-4 text-primary" />
            <span>{modules.length} modules</span>
          </div>
          <div 
            className="flex items-center gap-2"
            onMouseEnter={() => speak(`${totalLessons} lessons`)}
            tabIndex={0}
            onFocus={() => speak(`${totalLessons} lessons`)}
          >
            <Clock className="h-4 w-4 text-primary" />
            <span>{totalLessons} lessons</span>
          </div>
        </div>

        {enrollment && (
          <div 
            className="space-y-2"
            onMouseEnter={() => speak(`Progress: ${getProgress()}%`)}
            tabIndex={0}
            onFocus={() => speak(`Progress: ${getProgress()}%`)}
          >
            <div className="flex items-center justify-between text-sm">
              <span>Progress</span>
              <span className="font-medium">{getProgress()}%</span>
            </div>
            <Progress value={getProgress()} className="h-2" />
          </div>
        )}
      </CardContent>

      <CardFooter className="flex gap-2">
        {role === "instructor" ? (
          <>
            <Button
              className="flex-1"
              variant="outline"
              onClick={() => setLocation(`/course/${course.id}/edit`)}
              onMouseEnter={() => speak("Edit course")}
              onFocus={() => speak("Edit course")}
            >
              <Edit className="mr-2 h-4 w-4" />
              Edit
            </Button>
            <Button
              className="flex-1"
              variant={course.published ? "outline" : "default"}
              onClick={() => publishMutation.mutate()}
              disabled={publishMutation.isPending}
              onMouseEnter={() => speak(course.published ? "Unpublish course" : "Publish course")}
              onFocus={() => speak(course.published ? "Unpublish course" : "Publish course")}
            >
              <Eye className="mr-2 h-4 w-4" />
              {course.published ? "Unpublish" : "Publish"}
            </Button>
            <Button
              className="flex-1"
              variant="outline"
              onClick={() => setLocation(`/course/${course.id}`)}
              onMouseEnter={() => speak("Preview course")}
              onFocus={() => speak("Preview course")}
            >
              <Eye className="mr-2 h-4 w-4" />
              Preview
            </Button>
          </>
        ) : (
          enrollment ? (
            <Button
              className="w-full"
              variant="outline"
              onClick={() => setLocation(`/course/${course.id}`)}
              onMouseEnter={() => speak("Continue Learning")}
              onFocus={() => speak("Continue Learning")}
            >
              <CheckCircle className="mr-2 h-4 w-4" />
              Continue Learning
            </Button>
          ) : (
            <Button
              className="w-full"
              onClick={() => enrollMutation.mutate()}
              disabled={enrollMutation.isPending}
              onMouseEnter={() => speak("Enroll Now")}
              onFocus={() => speak("Enroll Now")}
            >
              {enrollMutation.isPending ? "Enrolling..." : "Enroll Now"}
            </Button>
          )
        )}
      </CardFooter>
    </Card>
  );
}