import { useQuery, useMutation } from "@tanstack/react-query";
import { Course, Enrollment, Module } from "@shared/schema";
import { useParams } from "wouter";
import { Loader2, CheckCircle, ArrowRight } from "lucide-react";
import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from "@/components/ui/accordion";
import { Progress } from "@/components/ui/progress";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { apiRequest, queryClient } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";

function formatVideoUrl(url: string) {
  try {
    const videoUrl = new URL(url);
    if (videoUrl.hostname === 'youtu.be') {
      const videoId = videoUrl.pathname.slice(1);
      return `https://www.youtube.com/embed/${videoId}`;
    } else if (videoUrl.hostname.includes('youtube.com')) {
      const videoId = videoUrl.searchParams.get('v');
      return `https://www.youtube.com/embed/${videoId}`;
    }
    return url;
  } catch {
    return url;
  }
}

export default function CourseView() {
  const params = useParams();
  const courseId = parseInt(params.courseId || "");
  const { toast } = useToast();

  const { data: course, isLoading: loadingCourse } = useQuery<Course>({
    queryKey: [`/api/courses/${courseId}`],
    enabled: !isNaN(courseId),
  });

  const { data: enrollment, isLoading: loadingEnrollment } = useQuery<Enrollment>({
    queryKey: [`/api/enrollments/${courseId}`],
    enabled: !isNaN(courseId),
  });

  const completeLessonMutation = useMutation({
    mutationFn: async (lessonId: string) => {
      if (isNaN(courseId)) throw new Error("Invalid course ID");

      const res = await apiRequest(
        "PATCH",
        `/api/enrollments/${courseId}/progress`,
        {
          ...enrollment?.progress,
          [lessonId]: true,
        }
      );
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: [`/api/enrollments/${courseId}`] });
      queryClient.invalidateQueries({ queryKey: ["/api/enrollments"] });
      toast({
        title: "Progress saved",
        description: "Your progress has been updated",
      });
    },
    onError: (error: Error) => {
      toast({
        title: "Failed to save progress",
        description: error.message,
        variant: "destructive",
      });
    },
  });

  if (isNaN(courseId)) {
    return (
      <div className="container mx-auto py-8">
        <h1 className="text-2xl font-bold">Invalid course ID</h1>
      </div>
    );
  }

  if (loadingCourse || loadingEnrollment) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <Loader2 className="h-8 w-8 animate-spin" />
      </div>
    );
  }

  if (!course || !enrollment) {
    return (
      <div className="container mx-auto py-8">
        <h1 className="text-2xl font-bold">Course not found</h1>
      </div>
    );
  }

  const totalLessons = (course.modules as Module[]).reduce(
    (acc, module) => acc + module.lessons.length,
    0
  );

  const completedLessons = Object.keys(enrollment.progress || {}).length;
  const progress = Math.round((completedLessons / totalLessons) * 100);

  return (
    <div className="container max-w-5xl mx-auto py-8 space-y-6">
      <div className="space-y-2">
        <h1 className="text-3xl font-bold">{course.title}</h1>
        <p className="text-muted-foreground">{course.description}</p>
      </div>

      <Card>
        <CardContent className="p-6">
          <div className="space-y-2">
            <div className="flex items-center justify-between text-sm">
              <span>Your Progress</span>
              <span className="font-medium">{progress}%</span>
            </div>
            <Progress value={progress} className="h-2" />
          </div>
        </CardContent>
      </Card>

      <Accordion type="single" collapsible className="w-full">
        {(course.modules as Module[]).map((module) => (
          <AccordionItem key={module.id} value={module.id}>
            <AccordionTrigger className="text-xl hover:no-underline">
              {module.title}
            </AccordionTrigger>
            <AccordionContent>
              <div className="space-y-6 pt-4">
                {module.lessons.map((lesson, index) => (
                  <div key={lesson.id} className="space-y-4">
                    <div className="flex items-center justify-between gap-4">
                      <Button
                        variant="ghost"
                        className="flex-1 justify-start h-auto py-4 px-4"
                      >
                        <div className="flex items-center gap-3">
                          <CheckCircle
                            className={`h-5 w-5 ${
                              enrollment.progress?.[lesson.id]
                                ? "text-green-500"
                                : "text-muted-foreground"
                            }`}
                          />
                          <div className="text-left">
                            <p className="font-medium">{lesson.title}</p>
                            <p className="text-sm text-muted-foreground">
                              {lesson.type === "video" ? "Video Lesson" : "Text Lesson"}
                            </p>
                          </div>
                        </div>
                      </Button>
                      <Button
                        onClick={() => completeLessonMutation.mutate(lesson.id)}
                        disabled={completeLessonMutation.isPending}
                        variant={enrollment.progress?.[lesson.id] ? "outline" : "default"}
                      >
                        {enrollment.progress?.[lesson.id] ? (
                          "Completed"
                        ) : (
                          <>
                            Complete Lesson
                            <ArrowRight className="ml-2 h-4 w-4" />
                          </>
                        )}
                      </Button>
                    </div>
                    {lesson.type === "video" && lesson.content && (
                      <div className="relative pt-[56.25%] rounded-lg overflow-hidden bg-muted">
                        <iframe
                          src={formatVideoUrl(lesson.content)}
                          className="absolute top-0 left-0 w-full h-full"
                          frameBorder="0"
                          allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
                          allowFullScreen
                        />
                      </div>
                    )}
                    {lesson.type === "text" && (
                      <div className="prose max-w-none">
                        {lesson.content}
                      </div>
                    )}
                  </div>
                ))}
              </div>
            </AccordionContent>
          </AccordionItem>
        ))}
      </Accordion>
    </div>
  );
}