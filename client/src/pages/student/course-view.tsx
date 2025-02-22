import { useQuery } from "@tanstack/react-query";
import { Course, Enrollment } from "@shared/schema";
import { useParams } from "wouter";
import { Loader2, CheckCircle } from "lucide-react";
import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from "@/components/ui/accordion";
import { Progress } from "@/components/ui/progress";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";

export default function CourseView() {
  const { courseId } = useParams();
  
  const { data: course, isLoading: loadingCourse } = useQuery<Course>({
    queryKey: [`/api/courses/${courseId}`],
  });

  const { data: enrollment, isLoading: loadingEnrollment } = useQuery<Enrollment>({
    queryKey: [`/api/enrollments/${courseId}`],
  });

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

  const totalLessons = course.modules.reduce(
    (acc, module) => acc + module.lessons.length,
    0
  );

  const completedLessons = Object.keys(enrollment.progress || {}).length;
  const progress = Math.round((completedLessons / totalLessons) * 100);

  return (
    <div className="container max-w-4xl mx-auto py-8 space-y-6">
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
        {course.modules.map((module) => (
          <AccordionItem key={module.id} value={module.id}>
            <AccordionTrigger className="text-xl hover:no-underline">
              {module.title}
            </AccordionTrigger>
            <AccordionContent>
              <div className="space-y-2 pt-2">
                {module.lessons.map((lesson) => (
                  <Button
                    key={lesson.id}
                    variant="ghost"
                    className="w-full justify-start h-auto py-4 px-4"
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
                ))}
              </div>
            </AccordionContent>
          </AccordionItem>
        ))}
      </Accordion>
    </div>
  );
}
