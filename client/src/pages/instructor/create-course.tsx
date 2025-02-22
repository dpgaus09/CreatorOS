import { useState } from "react";
import { useLocation } from "wouter";
import { useMutation } from "@tanstack/react-query";
import { apiRequest, queryClient } from "@/lib/queryClient";
import { Course } from "@shared/schema";
import CourseEditor from "@/components/course-editor";
import { Button } from "@/components/ui/button";
import { useToast } from "@/hooks/use-toast";
import { ModuleSchema } from "@shared/schema";

export default function CreateCourse() {
  const [, setLocation] = useLocation();
  const { toast } = useToast();
  const [modules, setModules] = useState<ModuleSchema[]>([]);

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
            onClick={() => {
              createCourseMutation.mutate({
                title: modules[0]?.title || "Untitled Course",
                description: "Course description",
                modules,
                published: false,
              });
            }}
            disabled={createCourseMutation.isPending || modules.length === 0}
          >
            {createCourseMutation.isPending ? "Creating..." : "Create Course"}
          </Button>
        </div>
      </div>

      <CourseEditor
        modules={modules}
        onChange={setModules}
      />
    </div>
  );
}
