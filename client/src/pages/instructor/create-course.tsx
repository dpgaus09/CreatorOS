import { useState } from "react";
import { useLocation } from "wouter";
import { useMutation } from "@tanstack/react-query";
import { apiRequest, queryClient } from "@/lib/queryClient";
import { Course, Module } from "@shared/schema";
import CourseEditor from "@/components/course-editor";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { useToast } from "@/hooks/use-toast";
import { AlertCircle, ArrowLeft, Save } from "lucide-react";

export default function CreateCourse() {
  const [, setLocation] = useLocation();
  const { toast } = useToast();
  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [modules, setModules] = useState<Module[]>([]);

  const createCourseMutation = useMutation({
    mutationFn: async (data: Partial<Course>) => {
      const res = await apiRequest("POST", "/api/courses", data);
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/courses/instructor"] });
      toast({
        title: "Course created",
        description: "Your course has been created successfully",
      });
      setLocation("/");
    },
    onError: (error: Error) => {
      toast({
        title: "Error creating course",
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

    createCourseMutation.mutate({
      title,
      description,
      modules,
      published: false,
    });
  };

  return (
    <div className="container max-w-4xl mx-auto py-8 space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-4">
          <Button variant="ghost" size="icon" onClick={() => setLocation("/")}>
            <ArrowLeft className="h-4 w-4" />
          </Button>
          <h1 className="text-3xl font-bold">Create New Course</h1>
        </div>
        <Button
          size="lg"
          onClick={handleSubmit}
          disabled={createCourseMutation.isPending}
        >
          <Save className="mr-2 h-4 w-4" />
          {createCourseMutation.isPending ? "Creating..." : "Save Course"}
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
        />
      </div>
    </div>
  );
}