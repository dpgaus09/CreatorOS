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
import { AlertCircle } from "lucide-react";

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
    <div className="container mx-auto py-8 space-y-8">
      <div className="flex items-center justify-between">
        <h1 className="text-3xl font-bold">Create New Course</h1>
        <div className="space-x-4">
          <Button
            variant="outline"
            onClick={() => setLocation("/")}
          >
            Cancel
          </Button>
          <Button
            onClick={handleSubmit}
            disabled={createCourseMutation.isPending}
          >
            {createCourseMutation.isPending ? "Creating..." : "Create Course"}
          </Button>
        </div>
      </div>

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
              placeholder="Enter course title"
            />
          </div>
          <div className="space-y-2">
            <label className="text-sm font-medium">Course Description</label>
            <Textarea
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder="Enter course description"
              className="min-h-[100px]"
            />
          </div>
        </CardContent>
      </Card>

      {(title || description) && (
        <Card>
          <CardHeader>
            <CardTitle>Course Content</CardTitle>
          </CardHeader>
          <CardContent>
            <CourseEditor
              modules={modules}
              onChange={setModules}
            />
          </CardContent>
        </Card>
      )}
    </div>
  );
}