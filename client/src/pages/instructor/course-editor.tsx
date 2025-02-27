import { useState, useEffect } from "react";
import { useLocation, useParams } from "wouter";
import { useQuery, useMutation } from "@tanstack/react-query";
import { apiRequest, queryClient } from "@/lib/queryClient";
import { Course, Module } from "@shared/schema";
import { useAuth } from "@/hooks/use-auth";
import CourseEditor from "@/components/course-editor";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { useToast } from "@/hooks/use-toast";
import { ArrowLeft, Save, Loader2 } from "lucide-react";

export default function CourseEditorPage() {
  const params = useParams();
  const courseId = parseInt(params.courseId || "0");
  const [, setLocation] = useLocation();
  const { toast } = useToast();
  const { user } = useAuth();

  const { data: course, isLoading: loadingCourse } = useQuery<Course>({
    queryKey: [`/api/courses/${courseId}`],
    enabled: courseId > 0,
  });

  const [title, setTitle] = useState(course?.title || "");
  const [description, setDescription] = useState(course?.description || "");
  const [modules, setModules] = useState<Module[]>(
    (course?.modules as Module[]) || []
  );

  // Update state when course data is loaded
  useEffect(() => {
    if (course) {
      setTitle(course.title);
      setDescription(course.description);
      setModules(course.modules as Module[]);
    }
  }, [course]);

  const updateCourseMutation = useMutation({
    mutationFn: async (data: Partial<Course>) => {
      const res = await apiRequest("PATCH", `/api/courses/${courseId}`, {
        ...data,
        instructorId: user?.id,
      });
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/courses/instructor"] });
      queryClient.invalidateQueries({ queryKey: [`/api/courses/${courseId}`] });
      toast({
        title: "Course updated",
        description: "Your changes have been saved successfully",
      });
    },
    onError: (error: Error) => {
      toast({
        title: "Error updating course",
        description: error.message,
        variant: "destructive",
      });
    },
  });

  const handleSubmit = () => {
    if (!title.trim()) {
      toast({
        title: "Title required",
        description: "Please enter a course title",
        variant: "destructive",
      });
      return;
    }

    if (!description.trim()) {
      toast({
        title: "Description required",
        description: "Please enter a course description",
        variant: "destructive",
      });
      return;
    }

    if (modules.length === 0) {
      toast({
        title: "Modules required",
        description: "Please add at least one module to your course",
        variant: "destructive",
      });
      return;
    }

    updateCourseMutation.mutate({
      title,
      description,
      modules,
    });
  };

  if (loadingCourse) {
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
        <p className="text-muted-foreground">
          This course does not exist or you don't have access to it.
        </p>
      </div>
    );
  }

  return (
    <div className="container max-w-4xl mx-auto py-8 space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-4">
          <Button variant="ghost" size="icon" onClick={() => setLocation("/")}>
            <ArrowLeft className="h-4 w-4" />
          </Button>
          <h1 className="text-3xl font-bold">Edit Course</h1>
        </div>
        <Button
          size="lg"
          onClick={handleSubmit}
          disabled={updateCourseMutation.isPending}
        >
          <Save className="mr-2 h-4 w-4" />
          {updateCourseMutation.isPending ? "Saving..." : "Save Changes"}
        </Button>
      </div>

      {/* Course Details */}
      <Card>
        <CardHeader>
          <CardTitle>Course Details</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="space-y-2">
            <label className="text-sm font-medium">Course Title</label>
            <Input
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              placeholder="Enter a descriptive title for your course"
              className="text-lg"
            />
          </div>
          <div className="space-y-2">
            <label className="text-sm font-medium">Course Description</label>
            <Textarea
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder="What will students learn in this course?"
              className="min-h-[120px] resize-none"
            />
          </div>
        </CardContent>
      </Card>

      {/* Course Content */}
      <div className="space-y-4">
        <h2 className="text-xl font-semibold">Course Content</h2>
        <CourseEditor 
          modules={modules} 
          onChange={setModules}
          courseId={courseId}
        />
      </div>
    </div>
  );
}