import { useState, useEffect, useRef } from "react";
import { useLocation, useParams } from "wouter";
import { useQuery, useMutation } from "@tanstack/react-query";
import { apiRequest, queryClient } from "@/lib/queryClient";
import { Course, Module, Image } from "@shared/schema";
import { useAuth } from "@/hooks/use-auth";
import CourseEditor from "@/components/course-editor";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { useToast } from "@/hooks/use-toast";
import { ArrowLeft, Save, Loader2, Upload, Image as ImageIcon, X } from "lucide-react";

export default function CourseEditorPage() {
  const params = useParams();
  const courseId = parseInt(params.courseId || "0");
  const [, setLocation] = useLocation();
  const { toast } = useToast();
  const { user } = useAuth();
  const fileInputRef = useRef<HTMLInputElement>(null);

  const { data: course, isLoading: loadingCourse } = useQuery<Course>({
    queryKey: [`/api/courses/${courseId}`],
    enabled: courseId > 0,
  });
  
  const { data: courseImages } = useQuery<Image[]>({
    queryKey: [`/api/courses/${courseId}/images`],
    enabled: courseId > 0,
  });

  const [title, setTitle] = useState(course?.title || "");
  const [description, setDescription] = useState(course?.description || "");
  const [modules, setModules] = useState<Module[]>(
    (course?.modules as Module[]) || []
  );
  const [selectedImage, setSelectedImage] = useState<Image | null>(null);

  // Update state when course data is loaded
  useEffect(() => {
    if (course) {
      setTitle(course.title);
      setDescription(course.description);
      setModules(course.modules as Module[]);
    }
  }, [course]);
  
  // Set the latest image as selected when images are loaded
  useEffect(() => {
    if (courseImages?.length) {
      // Sort by createdAt date and get the most recent one
      const latestImage = [...courseImages].sort((a, b) => 
        new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()
      )[0];
      setSelectedImage(latestImage);
    }
  }, [courseImages]);
  
  const uploadImageMutation = useMutation({
    mutationFn: async (file: File) => {
      const formData = new FormData();
      formData.append('image', file);
      formData.append('courseId', courseId.toString());
      
      const res = await fetch('/api/images/upload', {
        method: 'POST',
        body: formData,
        credentials: 'include',
      });
      
      if (!res.ok) {
        const error = await res.json();
        throw new Error(error.message || 'Failed to upload image');
      }
      
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: [`/api/courses/${courseId}/images`] });
      toast({
        title: "Image uploaded",
        description: "Course image has been updated successfully",
      });
    },
    onError: (error: Error) => {
      toast({
        title: "Upload failed",
        description: error.message,
        variant: "destructive",
      });
    },
  });
  
  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    
    // Check file type and size
    if (!file.type.startsWith('image/')) {
      toast({
        title: "Invalid file type",
        description: "Please upload an image file (JPEG, PNG, etc.)",
        variant: "destructive",
      });
      return;
    }
    
    // 5MB size limit
    if (file.size > 5 * 1024 * 1024) {
      toast({
        title: "File too large",
        description: "Image size should not exceed 5MB",
        variant: "destructive",
      });
      return;
    }
    
    uploadImageMutation.mutate(file);
  };

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
        <CardContent className="space-y-6">
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
          
          {/* Course Image Section */}
          <div className="space-y-3">
            <div className="flex justify-between items-center">
              <label className="text-sm font-medium">Course Image</label>
              <input 
                type="file" 
                ref={fileInputRef}
                className="hidden" 
                accept="image/*"
                onChange={handleFileChange}
              />
              <Button 
                type="button" 
                variant="outline" 
                size="sm"
                onClick={() => fileInputRef.current?.click()}
                disabled={uploadImageMutation.isPending}
              >
                {uploadImageMutation.isPending ? (
                  <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                ) : (
                  <Upload className="h-4 w-4 mr-2" />
                )}
                {uploadImageMutation.isPending ? "Uploading..." : "Upload Image"}
              </Button>
            </div>
            
            <div className="relative overflow-hidden rounded-md bg-muted h-[200px]">
              {selectedImage ? (
                <div className="relative h-full w-full">
                  <img
                    src={selectedImage.url}
                    alt="Course background"
                    className="h-full w-full object-cover"
                  />
                  <div className="absolute inset-0 bg-gradient-to-t from-black/70 to-transparent">
                    <div className="absolute bottom-4 left-4 right-4">
                      <h3 className="text-xl font-bold text-white">{title}</h3>
                      <p className="text-white/80 text-sm line-clamp-1">{description}</p>
                    </div>
                  </div>
                </div>
              ) : (
                <div className="flex items-center justify-center h-full">
                  <div className="text-center">
                    <ImageIcon className="h-10 w-10 text-muted-foreground mx-auto mb-2" />
                    <p className="text-sm text-muted-foreground">No image uploaded</p>
                    <p className="text-xs text-muted-foreground">Upload an image to enhance your course card</p>
                  </div>
                </div>
              )}
            </div>
            
            <p className="text-sm text-muted-foreground">
              Upload an image (PNG, JPG) to make your course stand out. Recommended size: 1280×720px.
            </p>
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