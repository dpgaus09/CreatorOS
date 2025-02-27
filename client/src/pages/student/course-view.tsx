import { useState, useEffect } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { Course, Enrollment, Module } from "@shared/schema";
import { useParams, useLocation } from "wouter";
import { CheckCircle, ArrowRight, ArrowLeft, Loader2 } from "lucide-react";
import { IoArrowBackCircleSharp } from "react-icons/io5";
import { useAuth } from "@/hooks/use-auth";
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
  if (!url) return '';

  try {
    // Handle empty or malformed URLs
    if (!url.includes('http')) {
      return `https://${url}`;
    }

    const videoUrl = new URL(url);

    // Handle YouTube short URLs (youtu.be)
    if (videoUrl.hostname === 'youtu.be') {
      const videoId = videoUrl.pathname.slice(1);
      return `https://www.youtube.com/embed/${videoId}`;
    }
    // Handle full YouTube URLs
    else if (videoUrl.hostname.includes('youtube.com')) {
      const videoId = videoUrl.searchParams.get('v');
      return videoId ? `https://www.youtube.com/embed/${videoId}` : url;
    }
    return url;
  } catch (error) {
    console.warn('Invalid video URL:', url, error);
    // If URL parsing fails, try to fix common issues
    if (url.includes('youtube.com/watch?v=')) {
      const videoId = url.split('v=')[1]?.split('&')[0];
      if (videoId) {
        return `https://www.youtube.com/embed/${videoId}`;
      }
    }
    return url;
  }
}

export default function CourseView() {
  const params = useParams();
  const [, setLocation] = useLocation();
  const courseId = parseInt(params.courseId || "0");
  const { toast } = useToast();
  const { user } = useAuth();
  const isInstructor = user?.role === "instructor";

  const { data: course, isLoading: loadingCourse } = useQuery<Course>({
    queryKey: [`/api/courses/${courseId}`],
    enabled: courseId > 0,
  });

  const { data: enrollment, isLoading: loadingEnrollment } = useQuery<Enrollment>({
    queryKey: [`/api/enrollments/${courseId}`],
    enabled: courseId > 0 && !isInstructor, // Don't fetch enrollment for instructor preview
  });

  const completeLessonMutation = useMutation({
    mutationFn: async (lessonId: string) => {
      if (courseId <= 0) throw new Error("Invalid course ID");
      if (isInstructor) return; // Prevent instructors from marking lessons complete in preview

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

  if (loadingCourse || (!isInstructor && loadingEnrollment)) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <Loader2 className="h-8 w-8 animate-spin" />
      </div>
    );
  }

  if (!course) {
    return (
      <div className="container mx-auto py-8">
        <h1 className="text-2xl font-bold">Course not found</h1>
        <p className="text-muted-foreground">This course does not exist or you don't have access to it.</p>
      </div>
    );
  }

  const modules = course.modules as Module[];
  const totalLessons = modules.reduce(
    (acc, module) => acc + module.lessons.length,
    0
  );

  const completedLessons = Object.keys(enrollment?.progress || {}).length;
  const progress = Math.round((completedLessons / totalLessons) * 100);

  return (
    <div className="container max-w-5xl mx-auto py-8 space-y-6">
      <div className="flex items-center gap-4 mb-6">
        <Button
          variant="ghost"
          size="icon"
          onClick={() => setLocation("/")}
          className="h-10 w-10 hover:bg-transparent"
        >
          <IoArrowBackCircleSharp className="h-8 w-8 text-primary hover:text-primary/80 transition-colors" />
        </Button>
        <div className="space-y-2">
          <h1 className="text-3xl font-bold">{course?.title}</h1>
          <p className="text-muted-foreground">{course?.description}</p>
        </div>
      </div>
      {isInstructor && (
        <div className="bg-yellow-100 dark:bg-yellow-900/20 border border-yellow-200 dark:border-yellow-900 rounded-lg p-4 mb-6">
          <div className="flex items-center justify-between">
            <p className="text-yellow-800 dark:text-yellow-200">
              Preview Mode: Viewing course as a student would see it
            </p>
            <Button
              variant="outline"
              onClick={() => setLocation("/")}
              className="bg-yellow-200 hover:bg-yellow-300 dark:bg-yellow-800 dark:hover:bg-yellow-700 border-yellow-300 dark:border-yellow-700"
            >
              <ArrowLeft className="mr-2 h-4 w-4" />
              Exit Preview
            </Button>
          </div>
        </div>
      )}

      {!isInstructor && (
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
      )}

      <Accordion type="single" collapsible className="w-full">
        {modules.map((module) => (
          <AccordionItem key={module.id} value={module.id}>
            <AccordionTrigger className="text-xl hover:no-underline">
              {module.title}
            </AccordionTrigger>
            <AccordionContent>
              <div className="space-y-6 pt-4">
                {module.lessons.map((lesson) => {
                  console.log('Lesson:', lesson.title, 'Type:', lesson.type, 'Content:', lesson.content);
                  return (
                    <div key={lesson.id} className="space-y-4">
                      <div className="flex items-center justify-between gap-4">
                        <Button
                          variant="ghost"
                          className="flex-1 justify-start h-auto py-4 px-4"
                        >
                          <div className="flex items-center gap-3">
                            <CheckCircle
                              className={`h-5 w-5 ${
                                (!isInstructor && enrollment?.progress?.[lesson.id])
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
                        {!isInstructor && (
                          <Button
                            onClick={() => completeLessonMutation.mutate(lesson.id)}
                            disabled={completeLessonMutation.isPending}
                            variant={enrollment?.progress?.[lesson.id] ? "outline" : "default"}
                          >
                            {enrollment?.progress?.[lesson.id] ? (
                              "Completed"
                            ) : (
                              <>
                                Complete Lesson
                                <ArrowRight className="ml-2 h-4 w-4" />
                              </>
                            )}
                          </Button>
                        )}
                      </div>
                      {lesson.type === "video" && lesson.content && (
                        <div className="relative pt-[56.25%] rounded-lg overflow-hidden bg-muted">
                          <iframe
                            src={formatVideoUrl(lesson.content)}
                            className="absolute top-0 left-0 w-full h-full"
                            title={lesson.title}
                            frameBorder="0"
                            allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
                            allowFullScreen
                          />
                        </div>
                      )}
                      {lesson.type === "text" && lesson.content && (
                        <div className="prose dark:prose-invert max-w-none">
                          {lesson.content}
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>
            </AccordionContent>
          </AccordionItem>
        ))}
      </Accordion>
    </div>
  );
}