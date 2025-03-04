import { useState, useEffect, useRef } from "react";
import { useLocation } from "wouter";
import { useMutation, useQuery } from "@tanstack/react-query";
import { apiRequest, queryClient } from "@/lib/queryClient";
import { useAuth } from "@/hooks/use-auth";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { useToast } from "@/hooks/use-toast";
import { ArrowLeft, Save, RefreshCw, Palette, Bell, Users, BookOpen, Settings, BarChart3, Trash2, UserX, Plus, Edit } from "lucide-react";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue
} from "@/components/ui/select";
import { Switch } from "@/components/ui/switch";
import { Label } from "@/components/ui/label";
import {
  BarChart,
  Bar,
  PieChart,
  Pie,
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ResponsiveContainer,
  Cell
} from "recharts";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import {
  Form,
  FormControl,
  FormDescription,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@/components/ui/form";
import { Textarea } from "@/components/ui/textarea";
import { format } from "date-fns";
import { Course, Enrollment, Announcement } from "@shared/schema";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";

type Student = {
  id: number;
  name: string;
  email: string;
  username: string;
  createdAt: string;
  enrollments: (Enrollment & { course?: Course })[];
};

export default function AdminSettings() {
  const [, setLocation] = useLocation();
  const { toast } = useToast();
  const { user } = useAuth();
  const [lmsName, setLmsName] = useState("LearnBruh");
  const [enrollmentUrl, setEnrollmentUrl] = useState("/auth/login");
  const [activeTab, setActiveTab] = useState("general");
  const [analyticsEnabled, setAnalyticsEnabled] = useState(true);
  const [studentToDelete, setStudentToDelete] = useState<Student | null>(null);
  const [showDeleteDialog, setShowDeleteDialog] = useState(false);
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [announcementsEnabled, setAnnouncementsEnabled] = useState(true);
  const [showAnnouncementDialog, setShowAnnouncementDialog] = useState(false);
  const [editingAnnouncement, setEditingAnnouncement] = useState<Announcement | null>(null);
  const [stripePortalUrl, setStripePortalUrl] = useState("");

  // Settings query
  const { data: settings, isLoading } = useQuery({
    queryKey: ["/api/settings/lms-name"],
  });

  // Enrollment URL query
  const { data: enrollmentUrlSetting } = useQuery({
    queryKey: ["/api/settings/enrollment-url"],
  });

  // Analytics settings query
  const { data: analyticsEnabledSetting } = useQuery({
    queryKey: ["/api/analytics/settings"],
  });

  // Announcements settings query
  const { data: announcementsEnabledSetting } = useQuery({
    queryKey: ["/api/settings/announcements-enabled"],
  });
  
  // Stripe portal URL query
  const { data: stripePortalUrlSetting } = useQuery({
    queryKey: ["/api/settings/stripe-portal-url"],
  });

  // Announcements query
  const { data: announcements, isLoading: isLoadingAnnouncements } = useQuery<Announcement[]>({
    queryKey: ["/api/announcements"],
  });

  // Logo query
  const logoQuery = useQuery({
    queryKey: ["/api/settings/logo"],
  });

  // Analytics data queries
  const { data: analyticsData, isLoading: isLoadingAnalytics } = useQuery({
    queryKey: ["/api/analytics/dashboard"],
    enabled: analyticsEnabled,
  });

  const { data: userActivityData } = useQuery({
    queryKey: ["/api/analytics/user-activity"],
    enabled: analyticsEnabled,
  });

  // Students list query
  const { data: students, isLoading: isLoadingStudents } = useQuery<Student[]>({
    queryKey: ["/api/students"],
  });

  // Update LMS name mutation
  const updateLmsNameMutation = useMutation({
    mutationFn: async (value: string) => {
      const res = await apiRequest("POST", "/api/settings/lms-name", { value });
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/settings/lms-name"] });
      toast({
        title: "Settings updated",
        description: "LMS name has been updated successfully",
      });
    },
    onError: (error: Error) => {
      toast({
        title: "Error updating settings",
        description: error.message,
        variant: "destructive",
      });
    },
  });

  // Update enrollment URL mutation
  const updateEnrollmentUrlMutation = useMutation({
    mutationFn: async (value: string) => {
      const res = await apiRequest("POST", "/api/settings/enrollment-url", { value });
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/settings/enrollment-url"] });
      toast({
        title: "Settings updated",
        description: "Enrollment URL has been updated successfully",
      });
    },
    onError: (error: Error) => {
      toast({
        title: "Error updating settings",
        description: error.message,
        variant: "destructive",
      });
    },
  });

  // Update analytics setting mutation
  const updateAnalyticsEnabledMutation = useMutation({
    mutationFn: async (value: boolean) => {
      const res = await apiRequest("POST", "/api/analytics/settings", { value: value ? "true" : "false" });
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/analytics/settings"] });
      toast({
        title: "Settings updated",
        description: "Analytics settings have been updated successfully",
      });
    },
    onError: (error: Error) => {
      toast({
        title: "Error updating settings",
        description: error.message,
        variant: "destructive",
      });
    },
  });

  // Update announcements enabled mutation
  const updateAnnouncementsEnabledMutation = useMutation({
    mutationFn: async (value: boolean) => {
      const res = await apiRequest("POST", "/api/settings/announcements-enabled", { value: value ? "true" : "false" });
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/settings/announcements-enabled"] });
      toast({
        title: "Settings updated",
        description: "Announcements settings have been updated successfully",
      });
    },
    onError: (error: Error) => {
      toast({
        title: "Error updating settings",
        description: error.message,
        variant: "destructive",
      });
    },
  });
  
  // Update Stripe portal URL mutation
  const updateStripePortalUrlMutation = useMutation({
    mutationFn: async (value: string) => {
      const res = await apiRequest("POST", "/api/settings/stripe-portal-url", { value });
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/settings/stripe-portal-url"] });
      toast({
        title: "Settings updated",
        description: "Stripe customer portal URL has been updated successfully",
      });
    },
    onError: (error: Error) => {
      toast({
        title: "Error updating settings",
        description: error.message,
        variant: "destructive",
      });
    },
  });

  // Delete student mutation
  const deleteStudentMutation = useMutation({
    mutationFn: async (studentId: number) => {
      const res = await apiRequest("DELETE", `/api/students/${studentId}`);
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/students"] });
      setShowDeleteDialog(false);
      setStudentToDelete(null);
      toast({
        title: "Student deleted",
        description: "The student has been removed successfully",
      });
    },
    onError: (error: Error) => {
      toast({
        title: "Error deleting student",
        description: error.message,
        variant: "destructive",
      });
    },
  });

  // Create announcement mutation
  const createAnnouncementMutation = useMutation({
    mutationFn: async (data: z.infer<typeof announcementFormSchema>) => {
      console.log("Creating announcement with data:", JSON.stringify(data));
      const res = await fetch('/api/announcements', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          title: data.title,
          content: data.content,
          active: data.active,
          createdBy: user?.id
        }),
        credentials: 'include', // This is crucial for sending cookies with the request
      });

      if (!res.ok) {
        const errorData = await res.json().catch(() => ({ message: 'Failed to create announcement' }));
        console.error("Announcement creation error:", errorData);
        throw new Error(errorData.message || 'Failed to create announcement');
      }

      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/announcements"] });
      setShowAnnouncementDialog(false);
      setEditingAnnouncement(null);
      toast({
        title: "Announcement created",
        description: "The announcement has been created successfully",
      });
    },
    onError: (error: Error) => {
      console.error("Announcement creation error:", error);
      toast({
        title: "Error creating announcement",
        description: error.message,
        variant: "destructive",
      });
    },
  });

  // Update announcement mutation
  const updateAnnouncementMutation = useMutation({
    mutationFn: async ({ id, data }: { id: number, data: Partial<Announcement> }) => {
      console.log("Updating announcement with data:", JSON.stringify(data));
      const res = await fetch(`/api/announcements/${id}`, {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(data),
        credentials: 'include', // Include credentials
      });

      if (!res.ok) {
        const errorData = await res.json().catch(() => ({ message: 'Failed to update announcement' }));
        console.error("Announcement update error:", errorData);
        throw new Error(errorData.message || 'Failed to update announcement');
      }

      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/announcements"] });
      setShowAnnouncementDialog(false);
      setEditingAnnouncement(null);
      toast({
        title: "Announcement updated",
        description: "The announcement has been updated successfully",
      });
    },
    onError: (error: Error) => {
      console.error("Announcement update error:", error);
      toast({
        title: "Error updating announcement",
        description: error.message,
        variant: "destructive",
      });
    },
  });

  // Toggle announcement active status
  const toggleAnnouncementActiveMutation = useMutation({
    mutationFn: async ({ id, active }: { id: number, active: boolean }) => {
      console.log(`Setting announcement ${id} active state to: ${active}`);
      const res = await fetch(`/api/announcements/${id}`, {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ active }),
        credentials: 'include',
      });

      if (!res.ok) {
        const errorData = await res.json().catch(() => ({ message: 'Failed to update announcement' }));
        console.error("Announcement update error:", errorData);
        throw new Error(errorData.message || 'Failed to update announcement status');
      }

      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/announcements"] });
      toast({
        title: "Announcement updated",
        description: "The announcement status has been updated",
      });
    },
    onError: (error: Error) => {
      console.error("Announcement status update error:", error);
      toast({
        title: "Error updating announcement",
        description: error.message,
        variant: "destructive",
      });
    },
  });

  // Delete announcement mutation
  const deleteAnnouncementMutation = useMutation({
    mutationFn: async (id: number) => {
      console.log("Deleting announcement with id:", id);
      const res = await fetch(`/api/announcements/${id}`, {
        method: 'DELETE',
        credentials: 'include', // Include credentials
      });

      if (!res.ok) {
        const errorData = await res.json().catch(() => ({ message: 'Failed to delete announcement' }));
        console.error("Announcement deletion error:", errorData);
        throw new Error(errorData.message || 'Failed to delete announcement');
      }

      return res.json();
    },
    onSuccess: () => {
      // Invalidate both regular and active announcements queries
      queryClient.invalidateQueries({ queryKey: ["/api/announcements"] });
      queryClient.invalidateQueries({ queryKey: ["/api/announcements/active"] });
      toast({
        title: "Announcement deleted",
        description: "The announcement has been deleted successfully",
      });
    },
    onError: (error: Error) => {
      console.error("Announcement deletion error:", error);
      toast({
        title: "Error deleting announcement",
        description: error.message,
        variant: "destructive",
      });
    },
  });

  // Logo upload mutation
  const uploadLogo = useMutation({
    mutationFn: async (file: File) => {
      const formData = new FormData();
      formData.append('logo', file);

      const res = await fetch('/api/settings/logo', {
        method: 'POST',
        body: formData,
        credentials: 'include',
      });

      if (!res.ok) {
        const error = await res.json();
        throw new Error(error.message || 'Failed to upload logo');
      }

      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/settings/logo"] });
      setSelectedFile(null);
      toast({
        title: "Logo updated",
        description: "Your platform logo has been updated successfully",
      });
    },
    onError: (error: Error) => {
      toast({
        title: "Error uploading logo",
        description: error.message,
        variant: "destructive",
      });
    },
  });

  // Logo remove mutation
  const removeLogo = useMutation({
    mutationFn: async () => {
      return await apiRequest("POST", "/api/settings/logo", { value: "" });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/settings/logo"] });
      toast({
        title: "Logo removed",
        description: "Your platform logo has been removed",
      });
    },
    onError: (error: Error) => {
      toast({
        title: "Error removing logo",
        description: error.message,
        variant: "destructive",
      });
    },
  });

  // Simplified announcement form schema (removed expiresAt)
  const announcementFormSchema = z.object({
    title: z.string().min(1, "Title is required"),
    content: z.string().min(1, "Content is required"),
    active: z.boolean().default(true),
  });

  // Announcement form
  const announcementForm = useForm<z.infer<typeof announcementFormSchema>>({
    resolver: zodResolver(announcementFormSchema),
    defaultValues: {
      title: "",
      content: "",
      active: true,
    },
  });

  useEffect(() => {
    if (settings?.value) {
      setLmsName(settings.value);
    }
  }, [settings]);

  useEffect(() => {
    if (enrollmentUrlSetting?.value) {
      setEnrollmentUrl(enrollmentUrlSetting.value);
    }
  }, [enrollmentUrlSetting]);

  useEffect(() => {
    if (analyticsEnabledSetting?.value) {
      setAnalyticsEnabled(analyticsEnabledSetting.value === "true");
    }
  }, [analyticsEnabledSetting]);

  useEffect(() => {
    if (announcementsEnabledSetting?.value) {
      setAnnouncementsEnabled(announcementsEnabledSetting.value === "true");
    }
  }, [announcementsEnabledSetting]);
  
  useEffect(() => {
    if (stripePortalUrlSetting?.value) {
      setStripePortalUrl(stripePortalUrlSetting.value);
    }
  }, [stripePortalUrlSetting]);

  // Reset form when editing announcement changes
  useEffect(() => {
    if (editingAnnouncement) {
      announcementForm.reset({
        title: editingAnnouncement.title,
        content: editingAnnouncement.content,
        active: editingAnnouncement.active,
      });
    } else {
      announcementForm.reset({
        title: "",
        content: "",
        active: true,
      });
    }
  }, [editingAnnouncement, announcementForm]);

  // Only instructors should access this page
  if (user?.role !== "instructor") {
    return null;
  }

  const handleSaveLmsName = () => {
    updateLmsNameMutation.mutate(lmsName);
  };

  const handleSaveEnrollmentUrl = () => {
    updateEnrollmentUrlMutation.mutate(enrollmentUrl);
  };

  const handleToggleAnalytics = (enabled: boolean) => {
    setAnalyticsEnabled(enabled);
    updateAnalyticsEnabledMutation.mutate(enabled);
  };

  const handleToggleAnnouncements = (enabled: boolean) => {
    setAnnouncementsEnabled(enabled);
    updateAnnouncementsEnabledMutation.mutate(enabled);
  };
  
  const handleSaveStripePortalUrl = () => {
    updateStripePortalUrlMutation.mutate(stripePortalUrl);
  };

  const handleDeleteStudent = (student: Student) => {
    setStudentToDelete(student);
    setShowDeleteDialog(true);
  };

  const confirmDeleteStudent = () => {
    if (studentToDelete) {
      deleteStudentMutation.mutate(studentToDelete.id);
    }
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      setSelectedFile(e.target.files[0]);
    }
  };

  const handleUploadLogo = () => {
    if (selectedFile) {
      uploadLogo.mutate(selectedFile);
    }
  };

  const handleRemoveLogo = () => {
    removeLogo.mutate();
  };

  const openCreateAnnouncementDialog = () => {
    setEditingAnnouncement(null);
    setShowAnnouncementDialog(true);
  };

  const openEditAnnouncementDialog = (announcement: Announcement) => {
    setEditingAnnouncement(announcement);
    setShowAnnouncementDialog(true);
  };

  const handleDeleteAnnouncement = (id: number) => {
    deleteAnnouncementMutation.mutate(id);
  };

  const handleToggleAnnouncementActive = (id: number, active: boolean) => {
    // If we're activating this announcement, we need to deactivate all others
    if (active && announcements) {
      // First, deactivate all other announcements
      announcements.forEach(announcement => {
        if (announcement.id !== id && announcement.active) {
          toggleAnnouncementActiveMutation.mutate({ id: announcement.id, active: false });
        }
      });
    }

    // Now toggle the current announcement
    toggleAnnouncementActiveMutation.mutate({ id, active });
  };

  const onSubmitAnnouncement = (data: z.infer<typeof announcementFormSchema>) => {
    console.log("Submitting announcement data:", data);

    // If we're creating a new announcement with active=true or updating an existing one to active=true
    if (data.active) {
      // Deactivate all other announcements first
      announcements?.forEach(announcement => {
        if ((!editingAnnouncement || announcement.id !== editingAnnouncement.id) && announcement.active) {
          toggleAnnouncementActiveMutation.mutate({ id: announcement.id, active: false });
        }
      });
    }

    if (editingAnnouncement) {
      updateAnnouncementMutation.mutate({
        id: editingAnnouncement.id,
        data: {
          title: data.title,
          content: data.content,
          active: data.active,
        },
      });
    } else {
      createAnnouncementMutation.mutate({
        title: data.title,
        content: data.content,
        active: data.active,
        createdBy: user?.id,
      });
    }
  };

  // Use real data when available, fallback to defaults for a better UX
  const deviceUsageData = analyticsData?.deviceBreakdown?.map(item => ({
    name: item.deviceType || 'Unknown',
    value: item.count,
    color: item.deviceType === 'desktop' ? '#3b82f6' :
      item.deviceType === 'mobile' ? '#10b981' :
        item.deviceType === 'tablet' ? '#f59e0b' : '#6b7280'
  })) || [
    { name: 'Desktop', value: 0, color: '#3b82f6' },
    { name: 'Mobile', value: 0, color: '#10b981' },
    { name: 'Tablet', value: 0, color: '#f59e0b' },
  ];

  // Prepare course completion data (placeholder until we have real completion tracking)
  const courseCompletionData = [
    { name: 'Completed', value: analyticsData?.summary?.completionRate || 0, color: '#10b981' },
    { name: 'In Progress', value: 100 - (analyticsData?.summary?.completionRate || 0), color: '#6b7280' },
  ];

  // Format activity data for chart
  const formattedUserActivity = (userActivityData?.map(item => ({
    date: item.date,
    views: item.views,
    uniqueUsers: item.uniqueUsers,
  })) || []);


  return (
    <div className="container max-w-5xl mx-auto py-8 space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-4">
          <Button variant="ghost" size="icon" onClick={() => setLocation("/")}>
            <ArrowLeft className="h-4 w-4" />
          </Button>
          <h1 className="text-3xl font-bold">Admin Settings</h1>
        </div>
      </div>

      {/* Tabs */}
      <Tabs value={activeTab} onValueChange={setActiveTab}>
        <TabsList className="flex flex-wrap gap-1 mb-8 overflow-x-auto">
          <TabsTrigger value="general" className="flex items-center gap-2">
            <Settings className="h-4 w-4" />
            <span>General</span>
          </TabsTrigger>
          <TabsTrigger value="appearance" className="flex items-center gap-2">
            <Palette className="h-4 w-4" />
            <span>Appearance</span>
          </TabsTrigger>
          <TabsTrigger value="users" className="flex items-center gap-2">
            <Users className="h-4 w-4" />
            <span>Users</span>
          </TabsTrigger>
          <TabsTrigger value="courses" className="flex items-center gap-2">
            <BookOpen className="h-4 w-4" />
            <span>Courses</span>
          </TabsTrigger>
          <TabsTrigger value="students" className="flex items-center gap-2">
            <Users className="h-4 w-4" />
            <span>Students</span>
          </TabsTrigger>
          <TabsTrigger value="notifications" className="flex items-center gap-2">
            <Bell className="h-4 w-4" />
            <span>Notifications</span>
          </TabsTrigger>
          <TabsTrigger value="analytics" className="flex items-center gap-2">
            <BarChart3 className="h-4 w-4" />
            <span>Analytics</span>
          </TabsTrigger>
        </TabsList>

        {/* General Settings */}
        <TabsContent value="general">
          <div className="grid gap-6">
            <Card>
              <CardHeader>
                <CardTitle>Platform Settings</CardTitle>
                <CardDescription>
                  Configure the general settings for your learning platform
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="space-y-2">
                  <Label htmlFor="lms-name">LMS Platform Name</Label>
                  <div className="flex gap-2">
                    <Input
                      id="lms-name"
                      value={lmsName}
                      onChange={(e) => setLmsName(e.target.value)}
                      placeholder="Enter your LMS name"
                    />
                    <Button
                      onClick={handleSaveLmsName}
                      disabled={updateLmsNameMutation.isPending}
                    >
                      {updateLmsNameMutation.isPending ? (
                        <RefreshCw className="h-4 w-4 animate-spin" />
                      ) : (
                        <Save className="h-4 w-4" />
                      )}
                    </Button>
                  </div>
                </div>

                <div className="space-y-4 pt-4">
                  <div className="flex items-center justify-between">
                    <div>
                      <Label htmlFor="analytics">Enable Analytics</Label>
                      <p className="text-sm text-muted-foreground">
                        Track user engagement and course metrics
                      </p>
                    </div>
                    <Switch
                      id="analytics"
                      checked={analyticsEnabled}
                      onCheckedChange={handleToggleAnalytics}
                    />
                  </div>

                  <div className="flex items-center justify-between">
                    <div>
                      <Label htmlFor="maintenance">Maintenance Mode</Label>
                      <p className="text-sm text-muted-foreground">
                        Temporarily disable access to the platform for maintenance
                      </p>
                    </div>
                    <Switch id="maintenance" />
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="timezone">Default Timezone</Label>
                    <Select defaultValue="utc">
                      <SelectTrigger id="timezone">
                        <SelectValue placeholder="Select timezone" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="utc">UTC (Coordinated Universal Time)</SelectItem>
                        <SelectItem value="est">EST (Eastern Standard Time)</SelectItem>
                        <SelectItem value="cst">CST (Central Standard Time)</SelectItem>
                        <SelectItem value="mst">MST (Mountain Standard Time)</SelectItem>
                        <SelectItem value="pst">PST (Pacific Standard Time)</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>
        </TabsContent>

        {/* Appearance Settings */}
        <TabsContent value="appearance">
          <Card>
            <CardHeader>
              <CardTitle>Platform Appearance</CardTitle>
              <CardDescription>
                Customize how your learning platform looks
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-6">
              {/* Logo Upload UI */}
              <div className="space-y-4">
                <Label>Logo</Label>
                <p className="text-sm text-muted-foreground mb-2">
                  Upload a logo to replace the LMS name in the header. Recommended size: 200x50px.
                </p>

                {/* Logo preview area */}
                <div className="border border-input rounded-md p-6 flex flex-col items-center justify-center gap-4">
                  {logoQuery.data?.value ? (
                    <div className="flex flex-col items-center gap-4">
                      <img
                        src={logoQuery.data.value}
                        alt="Current Logo"
                        className="max-h-16 max-w-xs object-contain mb-2"
                      />
                      <div className="flex gap-2">
                        <Button
                          variant="outline"
                          onClick={() => fileInputRef.current?.click()}
                        >
                          Change Logo
                        </Button>
                        <Button
                          variant="destructive"
                          onClick={handleRemoveLogo}
                          disabled={removeLogo.isPending}
                        >
                          {removeLogo.isPending ? (
                            <><RefreshCw className="h-4 w-4 mr-2 animate-spin" /> Removing</>
                          ) : (
                            'Remove Logo'
                          )}
                        </Button>
                      </div>
                    </div>
                  ) : (
                    <div className="flex flex-col items-center">
                      <div className="text-4xl font-bold text-muted-foreground mb-4">{lmsName}</div>
                      <p className="text-sm text-muted-foreground mb-4">
                        No logo uploaded. Upload one to replace the text name.
                      </p>
                      <Button
                        variant="outline"
                        onClick={() => fileInputRef.current?.click()}
                      >
                        Upload Logo
                      </Button>
                    </div>
                  )}

                  {/* Hidden file input */}
                  <input
                    ref={fileInputRef}
                    type="file"
                    className="hidden"
                    accept="image/jpeg,image/png,image/gif"
                    onChange={handleFileChange}
                  />
                </div>

                {/* Upload progress/status */}
                {selectedFile && (
                  <div className="flex items-center gap-2 mt-2">
                    <span className="text-sm">Selected: {selectedFile.name}</span>
                    <Button
                      onClick={handleUploadLogo}
                      disabled={uploadLogo.isPending || !selectedFile}
                      size="sm"
                    >
                      {uploadLogo.isPending ? (
                        <><RefreshCw className="h-4 w-4 mr-2 animate-spin" /> Uploading</>
                      ) : (
                        'Upload'
                      )}
                    </Button>
                  </div>
                )}
              </div>

              <div className="space-y-2">
                <Label htmlFor="theme">Default Theme</Label>
                <Select defaultValue="system">
                  <SelectTrigger id="theme">
                    <SelectValue placeholder="Select theme" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="light">Light</SelectItem>
                    <SelectItem value="dark">Dark</SelectItem>
                    <SelectItem value="system">System</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        {/* Users Settings */}
        <TabsContent value="users">
          <Card>
            <CardHeader>
              <CardTitle>User Management</CardTitle>
              <CardDescription>
                Configure settings related to user accounts
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="flex items-center justify-between">
                <div>
                  <Label htmlFor="self-registration">Self Registration</Label>
                  <p className="text-sm text-muted-foreground">
                    Allow users to create their own accounts
                  </p>
                </div>
                <Switch id="self-registration" defaultChecked />
              </div>

              <div className="space-y-2">
                <Label htmlFor="default-role">Default User Role</Label>
                <Select defaultValue="student">
                  <SelectTrigger id="default-role">
                    <SelectValue placeholder="Select role" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="student">Student</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        {/* Courses Settings */}
        <TabsContent value="courses">
          <Card>
            <CardHeader>
              <CardTitle>Course Settings</CardTitle>
              <CardDescription>
                Configure settings related to courses
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="flex items-center justify-between">
                <div>
                  <Label htmlFor="auto-enrollment">Auto Enrollment</Label>
                  <p className="text-sm text-muted-foreground">
                    Automatically enroll new users in selected courses
                  </p>
                </div>
                <Switch id="auto-enrollment" />
              </div>

              <div className="flex items-center justify-between">
                <div>
                  <Label htmlFor="course-catalog">Public Course Catalog</Label>
                  <p className="text-sm text-muted-foreground">
                    Make your course catalog viewable to the public
                  </p>
                </div>
                <Switch id="course-catalog" defaultChecked />
              </div>

              <div className="flex items-center justify-between">
                <div>
                  <Label htmlFor="course-reviews">Course Reviews</Label>
                  <p className="text-sm text-muted-foreground">
                    Allow students to leave reviews for courses
                  </p>
                </div>
                <Switch id="course-reviews" defaultChecked />
              </div>

              {/* Enrollment URL Setting */}
              <div className="space-y-2 pt-4">
                <Label htmlFor="enrollment-url">Enrollment URL</Label>
                <p className="text-sm text-muted-foreground mb-2">
                  URL where users will be directed from public catalog to enroll (payment page, signup, etc.)
                </p>
                <div className="flex gap-2">
                  <Input
                    id="enrollment-url"
                    value={enrollmentUrl}
                    onChange={(e) => setEnrollmentUrl(e.target.value)}
                    placeholder="Enter enrollment URL (e.g., /auth/login, https://payment.example.com)"
                  />
                  <Button
                    onClick={handleSaveEnrollmentUrl}
                    disabled={updateEnrollmentUrlMutation.isPending}
                  >
                    {updateEnrollmentUrlMutation.isPending ? (
                      <RefreshCw className="h-4 w-4 animate-spin" />
                    ) : (
                      <Save className="h-4 w-4" />
                    )}
                  </Button>
                </div>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        {/* Students Tab */}
        <TabsContent value="students">
          <Card>
            <CardHeader>
              <CardTitle>Student Management</CardTitle>
              <CardDescription>
                View and manage registered students
              </CardDescription>
            </CardHeader>
            <CardContent>
              {isLoadingStudents ? (
                <div className="text-center py-4">Loading students...</div>
              ) : (
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Student Name</TableHead>
                      <TableHead>Email</TableHead>
                      <TableHead>Username</TableHead>
                      <TableHead>Joined</TableHead>
                      <TableHead>Courses Enrolled</TableHead>
                      <TableHead>Actions</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {students?.map((student) => (
                      <TableRow key={student.id}>
                        <TableCell className="font-medium">{student.name}</TableCell>
                        <TableCell>{student.email}</TableCell>
                        <TableCell>{student.username}</TableCell>
                        <TableCell>
                          {student.createdAt ? format(new Date(student.createdAt), "MMM d, yyyy") : "Unknown"}
                        </TableCell>
                        <TableCell>
                          {student.enrollments && student.enrollments.length > 0 ? (
                            <ul className="list-disc pl-4">
                              {student.enrollments.slice(0, 3).map((enrollment, idx) => (
                                <li key={idx} className="text-sm">
                                  {enrollment.course?.title || "Unknown Course"}
                                </li>
                              ))}
                            </ul>
                          ) : (
                            <span className="text-gray-500">No courses enrolled</span>
                          )}
                        </TableCell>
                        <TableCell>
                          <Button
                            variant="ghost"
                            size="icon"
                            onClick={() => handleDeleteStudent(student)}
                            className="text-red-500 hover:text-red-700 hover:bg-red-100"
                          >
                            <Trash2 className="h-4 w-4" />
                          </Button>
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              )}
            </CardContent>
          </Card>

          {/* Delete Student Confirmation Dialog */}
          <Dialog open={showDeleteDialog} onOpenChange={setShowDeleteDialog}>
            <DialogContent>
              <DialogHeader>
                <DialogTitle>Delete Student</DialogTitle>
                <DialogDescription>
                  Are you sure you want to delete {studentToDelete?.name}? This action cannot be undone.
                </DialogDescription>
              </DialogHeader>
              <DialogFooter>
                <Button variant="outline" onClick={() => setShowDeleteDialog(false)}>
                  Cancel
                </Button>
                <Button
                  variant="destructive"
                  onClick={confirmDeleteStudent}
                  disabled={deleteStudentMutation.isPending}
                >
                  {deleteStudentMutation.isPending ? (
                    <><RefreshCw className="h-4 w-4 mr-2 animate-spin" /> Deleting...</>
                  ) : (
                    <><UserX className="h-4 w-4 mr-2" /> Delete Student</>
                  )}
                </Button>
              </DialogFooter>
            </DialogContent>
          </Dialog>
        </TabsContent>

        {/* Notifications Settings */}
        <TabsContent value="notifications">
          <Card>
            <CardHeader>
              <CardTitle>Notification Settings</CardTitle>
              <CardDescription>
                Configure system notifications and announcements
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="flex items-center justify-between">
                <div>
                  <Label htmlFor="announcements">System Announcements</Label>
                  <p className="text-sm text-muted-foreground">
                    Show announcements to users across the platform
                  </p>
                </div>
                <Switch
                  id="announcements"
                  checked={announcementsEnabled}
                  onCheckedChange={handleToggleAnnouncements}
                />
              </div>
            </CardContent>
          </Card>

          {/* Announcements Management */}
          <Card className="mt-6">
            <CardHeader className="flex flex-row items-center justify-between">
              <div>
                <CardTitle>Manage Announcements</CardTitle>
                <CardDescription>
                  Create and manage announcements for your platform. Only one announcement can be active at a time.
                </CardDescription>
              </div>
              <Button
                onClick={openCreateAnnouncementDialog}
                disabled={!announcementsEnabled}
                className="flex items-center gap-2"
              >
                <Plus className="h-4 w-4" />
                <span>New Announcement</span>
              </Button>
            </CardHeader>
            <CardContent>
              {!announcementsEnabled ? (
                <div className="text-center py-8 text-muted-foreground">
                  Enable System Announcements to manage announcements
                </div>
              ) : isLoadingAnnouncements ? (
                <div className="text-center py-4">Loading announcements...</div>
              ) : (announcements?.length || 0) === 0 ? (
                <div className="text-center py-8 text-muted-foreground">
                  No announcements created yet. Create your first announcement to notify users.
                </div>
              ) : (
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Title</TableHead>
                      <TableHead>Content</TableHead>
                      <TableHead>Status</TableHead>
                      <TableHead>Created</TableHead>
                      <TableHead>Actions</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {announcements?.map((announcement) => (
                      <TableRow key={announcement.id}>
                        <TableCell className="font-medium">{announcement.title}</TableCell>
                        <TableCell className="max-w-xs truncate">{announcement.content}</TableCell>
                        <TableCell>
                          <div className="flex items-center space-x-2">
                            <Switch
                              checked={announcement.active}
                              onCheckedChange={(checked) => handleToggleAnnouncementActive(announcement.id, checked)}
                            />
                            <span className={`text-xs font-medium ${
                              announcement.active ? 'text-green-600' : 'text-gray-400'
                            }`}>
                              {announcement.active ? 'Active' : 'Inactive'}
                            </span>
                          </div>
                        </TableCell>
                        <TableCell>
                          {format(new Date(announcement.createdAt), "MMM d, yyyy")}
                        </TableCell>
                        <TableCell>
                          <div className="flex gap-2">
                            <Button
                              variant="ghost"
                              size="icon"
                              onClick={() => openEditAnnouncementDialog(announcement)}
                            >
                              <Edit className="h-4 w-4" />
                            </Button>
                            <Button
                              variant="ghost"
                              size="icon"
                              onClick={() => handleDeleteAnnouncement(announcement.id)}
                              className="text-red-500 hover:text-red-700 hover:bg-red-100"
                            >
                              <Trash2 className="h-4 w-4" />
                            </Button>
                          </div>
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              )}
            </CardContent>
          </Card>

          {/* Announcement Dialog */}
          <Dialog open={showAnnouncementDialog} onOpenChange={setShowAnnouncementDialog}>
            <DialogContent className="sm:max-w-[525px]">
              <DialogHeader>
                <DialogTitle>{editingAnnouncement ? 'Edit Announcement' : 'Create Announcement'}</DialogTitle>
                <DialogDescription>
                  {editingAnnouncement
                    ? 'Edit your announcement details below'
                    : 'Create a new announcement to notify all users'
                  }
                </DialogDescription>
              </DialogHeader>
              <Form {...announcementForm}>
                <form onSubmit={announcementForm.handleSubmit(onSubmitAnnouncement)} className="space-y-4">
                  <FormField
                    control={announcementForm.control}
                    name="title"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Announcement Title</FormLabel>
                        <FormControl>
                          <Input placeholder="Enter announcement title" {...field} />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                  <FormField
                    control={announcementForm.control}
                    name="content"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Announcement Content</FormLabel>
                        <FormControl>
                          <Textarea
                            placeholder="Enter announcement content"
                            className="min-h-[100px]"
                            {...field}
                          />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                  <FormField
                    control={announcementForm.control}
                    name="active"
                    render={({ field }) => (
                      <FormItem className="flex flex-row items-center justify-between rounded-lg border p-3">
                        <div className="space-y-0.5">
                          <FormLabel>Active</FormLabel>
                          <FormDescription>
                            Display this announcement to users (only one announcement can be active at a time)
                          </FormDescription>
                        </div>
                        <FormControl>
                          <Switch
                            checked={field.value}
                            onCheckedChange={field.onChange}
                          />
                        </FormControl>
                      </FormItem>
                    )}
                  />
                  <DialogFooter>
                    <Button
                      type="button"
                      variant="outline"
                      onClick={() => setShowAnnouncementDialog(false)}
                    >
                      Cancel
                    </Button>
                    <Button
                      type="submit"
                      disabled={createAnnouncementMutation.isPending || updateAnnouncementMutation.isPending}
                    >
                      {(createAnnouncementMutation.isPending || updateAnnouncementMutation.isPending) ? (
                        <><RefreshCw className="h-4 w-4 mr-2 animate-spin" /> Saving...</>
                      ) : (
                        <>{editingAnnouncement ? 'Update' : 'Create'} Announcement</>
                      )}
                    </Button>
                  </DialogFooter>
                </form>
              </Form>
            </DialogContent>
          </Dialog>
        </TabsContent>

        {/* Analytics Tab */}
        <TabsContent value="analytics">
          {analyticsEnabled ? (
            <div className="grid gap-6">
              {/* Summary Cards */}
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <Card>
                  <CardHeader className="pb-2">
                    <CardTitle className="text-sm font-medium">
                      Total Users
                    </CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="text-2xl font-bold">
                      {analyticsData?.summary?.userCount || 0}
                    </div>
                    <p className="text-xs text-muted-foreground mt-1">
                      {analyticsData?.summary?.newUserCount || 0} new in the last 30 days
                    </p>
                  </CardContent>
                </Card>
                <Card>
                  <CardHeader className="pb-2">
                    <CardTitle className="text-sm font-medium">
                      Total Courses
                    </CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="text-2xl font-bold">
                      {analyticsData?.summary?.courseCount || 0}
                    </div>
                    <p className="text-xs text-muted-foreground mt-1">
                      {analyticsData?.summary?.publishedCourseCount || 0} published courses
                    </p>
                  </CardContent>
                </Card>
                <Card>
                  <CardHeader className="pb-2">
                    <CardTitle className="text-sm font-medium">
                      Total Enrollments
                    </CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="text-2xl font-bold">
                      {analyticsData?.summary?.enrollmentCount || 0}
                    </div>
                    <p className="text-xs text-muted-foreground mt-1">
                      {analyticsData?.summary?.activeEnrollmentCount || 0} active enrollments
                    </p>
                  </CardContent>
                </Card>
              </div>

              {/* User Activity Chart */}
              <Card>
                <CardHeader>
                  <CardTitle>User Activity</CardTitle>
                  <CardDescription>
                    Daily views and unique users over time
                  </CardDescription>
                </CardHeader>
                <CardContent>
                  <div className="h-[300px]">
                    <ResponsiveContainer width="100%" height="100%">
                      <LineChart data={formattedUserActivity}>
                        <CartesianGrid strokeDasharray="3 3" />
                        <XAxis dataKey="date" />
                        <YAxis />
                        <Tooltip />
                        <Legend />
                        <Line
                          type="monotone"
                          dataKey="views"
                          stroke="#3b82f6"
                          name="Page Views"
                          strokeWidth={2}
                        />
                        <Line
                          type="monotone"
                          dataKey="uniqueUsers"
                          stroke="#10b981"
                          name="Unique Users"
                          strokeWidth={2}
                        />
                      </LineChart>
                    </ResponsiveContainer>
                  </div>
                </CardContent>
              </Card>

              {/* Pie Charts */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <Card>
                  <CardHeader>
                    <CardTitle>Course Completion</CardTitle>
                    <CardDescription>
                      Progress for all enrolled students
                    </CardDescription>
                  </CardHeader>
                  <CardContent>
                    <div className="h-[300px]">
                      <ResponsiveContainer width="100%" height="100%">
                        <PieChart>
                          <Pie
                            data={courseCompletionData}
                            cx="50%"
                            cy="50%"
                            innerRadius={60}
                            outerRadius={80}
                            paddingAngle={2}
                            dataKey="value"
                            label={({ name, percent }) => `${name} ${(percent * 100).toFixed(0)}%`}
                          >
                            {courseCompletionData.map((entry, index) => (
                              <Cell key={`cell-${index}`} fill={entry.color} />
                            ))}
                          </Pie>
                          <Tooltip />
                          <Legend />
                        </PieChart>
                      </ResponsiveContainer>
                    </div>
                  </CardContent>
                </Card>

                <Card>
                  <CardHeader>
                    <CardTitle>Device Usage</CardTitle>
                    <CardDescription>
                      Devices used to access your platform
                    </CardDescription>
                  </CardHeader>
                  <CardContent>
                    <div className="h-[300px]">
                      <ResponsiveContainer width="100%" height="100%">
                        <PieChart>
                          <Pie
                            data={deviceUsageData}
                            cx="50%"
                            cy="50%"
                            innerRadius={60}
                            outerRadius={80}
                            paddingAngle={2}
                            dataKey="value"
                            label={({ name, value }) => `${name}: ${value}`}
                          >
                            {deviceUsageData.map((entry, index) => (
                              <Cell key={`cell-${index}`} fill={entry.color} />
                            ))}
                          </Pie>
                          <Tooltip />
                          <Legend />
                        </PieChart>
                      </ResponsiveContainer>
                    </div>
                  </CardContent>
                </Card>
              </div>

              {/* Popular pages */}
              <Card>
                <CardHeader>
                  <CardTitle>Popular Pages</CardTitle>
                  <CardDescription>
                    Most visited pages in your platform
                  </CardDescription>
                </CardHeader>
                <CardContent>
                  <div className="rounded-md border">
                    <table className="w-full">
                      <thead>
                        <tr className="border-b">
                          <th className="py-3 px-4 text-left font-medium">URL Path</th>
                          <th className="py-3 px-4 text-left font-medium">Visits</th>
                        </tr>
                      </thead>
                      <tbody>
                        {analyticsData?.mostVisitedPages?.map((item, index) => (
                          <tr key={index} className={index !== (analyticsData?.mostVisitedPages?.length || 0) - 1 ? "border-b" : ""}>
                            <td className="py-3 px-4">{item.path}</td>
                            <td className="py-3 px-4">{item.count}</td>
                          </tr>
                        )) || (
                          <tr>
                            <td colSpan={2} className="py-4 text-center text-muted-foreground">No data available</td>
                          </tr>
                        )}
                      </tbody>
                    </table>
                  </div>
                </CardContent>
              </Card>

              <Card>
                <CardHeader>
                  <CardTitle>Popular Courses</CardTitle>
                  <CardDescription>
                    Courses with most views and completions
                  </CardDescription>
                </CardHeader>
                <CardContent>
                  <div className="rounded-md border">
                    <table className="w-full">
                      <thead>
                        <tr className="border-b">
                          <th className="py-3 px-4 text-left font-medium">Course</th>
                          <th className="py-3 px-4 text-left font-medium">Views</th>
                          <th className="py-3 px-4 text-left font-medium">Completions</th>
                        </tr>
                      </thead>
                      <tbody>
                        {analyticsData?.mostViewedCourses?.map((item, index) => (
                          <tr key={index} className={index !== (analyticsData?.mostViewedCourses?.length || 0) - 1 ? "border-b" : ""}>
                            <td className="py-3 px-4">{item.course.title}</td>
                            <td className="py-3 px-4">{item.totalViews}</td>
                            <td className="py-3 px-4">{item.totalCompletions}</td>
                          </tr>
                        )) || (
                          <tr>
                            <td colSpan={3} className="py-4 text-center text-muted-foreground">No data available</td>
                          </tr>
                        )}
                      </tbody>
                    </table>
                  </div>
                </CardContent>
              </Card>
            </div>
          ) : (
            <div className="flex flex-col items-center justify-center p-12 text-center">
              <BarChart3 className="h-16 w-16 text-muted-foreground mb-4" />
              <h2 className="text-2xl font-bold mb-2">Analytics are disabled</h2>
              <p className="text-muted-foreground mb-4">
                Enable analytics in the General settings tab to view usage statistics and reports.
              </p>
              <Button onClick={() => {
                setActiveTab("general");
              }}>
                Go to Settings
              </Button>
            </div>
          )}
        </TabsContent>
      </Tabs>

      {/* Delete Confirmation Dialog */}
      <Dialog open={showDeleteDialog} onOpenChange={setShowDeleteDialog}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Delete Student</DialogTitle>
            <DialogDescription>
              Are you sure you want to delete {studentToDelete?.name}? This action cannot be undone.
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowDeleteDialog(false)}>
              Cancel
            </Button>
            <Button
              variant="destructive"
              onClick={confirmDeleteStudent}
              disabled={deleteStudentMutation.isPending}
            >
              {deleteStudentMutation.isPending ? (
                <><RefreshCw className="h-4 w-4 mr-2 animate-spin" /> Deleting...</>
              ) : (
                <><UserX className="h-4 w-4 mr-2" /> Delete Student</>
              )}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}