import { useState, useEffect } from "react";
import { useLocation } from "wouter";
import { useMutation, useQuery } from "@tanstack/react-query";
import { apiRequest, queryClient } from "@/lib/queryClient";
import { useAuth } from "@/hooks/use-auth";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { useToast } from "@/hooks/use-toast";
import { ArrowLeft, Save, RefreshCw, Palette, Bell, Users, BookOpen, Settings, BarChart3 } from "lucide-react";
import { 
  Select, 
  SelectContent, 
  SelectItem, 
  SelectTrigger, 
  SelectValue 
} from "@/components/ui/select";
import { Switch } from "@/components/ui/switch";
import { Label } from "@/components/ui/label";

export default function AdminSettings() {
  const [, setLocation] = useLocation();
  const { toast } = useToast();
  const { user } = useAuth();
  const [lmsName, setLmsName] = useState("LearnBruh");
  const [enrollmentUrl, setEnrollmentUrl] = useState("/auth/login"); // Default to login page
  const [activeTab, setActiveTab] = useState("general");
  const [analyticsEnabled, setAnalyticsEnabled] = useState(true);

  // Settings query
  const { data: settings, isLoading } = useQuery({
    queryKey: ["/api/settings/lms-name"],
  });

  // Enrollment URL query
  const { data: enrollmentUrlSetting } = useQuery({
    queryKey: ["/api/settings/enrollment-url"],
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
        <TabsList className="grid grid-cols-6 mb-8">
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
                      defaultChecked={analyticsEnabled} 
                      onCheckedChange={setAnalyticsEnabled}
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
            <CardContent className="space-y-4">

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

              <div className="space-y-2">
                <Label>Logo</Label>
                <div className="border border-input rounded-md p-4 flex items-center justify-center">
                  <Button variant="outline">Upload Logo</Button>
                </div>
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
                    <SelectItem value="instructor">Instructor</SelectItem>
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

        {/* Notifications Settings */}
        <TabsContent value="notifications">
          <Card>
            <CardHeader>
              <CardTitle>Notification Settings</CardTitle>
              <CardDescription>
                Configure system notifications
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="flex items-center justify-between">
                <div>
                   <Label htmlFor="announcements">System Announcements</Label>
                   <p className="text-sm text-muted-foreground">
                     Notify all users about system changes
                   </p>
                </div>
                <Switch id="announcements" defaultChecked />
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        {/* Analytics Tab */}
        <TabsContent value="analytics">
          {analyticsEnabled ? (
            <div className="grid gap-6">
              <Card>
                <CardHeader>
                  <CardTitle>User Engagement Analytics</CardTitle>
                  <CardDescription>
                    Configure and view analytics for user engagement
                  </CardDescription>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="flex items-center justify-between">
                    <div>
                      <Label htmlFor="track-clicks">Track Page & Button Clicks</Label>
                      <p className="text-sm text-muted-foreground">
                        Record user interactions with pages and UI elements
                      </p>
                    </div>
                    <Switch id="track-clicks" defaultChecked />
                  </div>

                  <div className="flex items-center justify-between">
                    <div>
                      <Label htmlFor="track-time">Session Duration Tracking</Label>
                      <p className="text-sm text-muted-foreground">
                        Measure how long users spend on different pages
                      </p>
                    </div>
                    <Switch id="track-time" defaultChecked />
                  </div>

                  <div className="flex items-center justify-between">
                    <div>
                      <Label htmlFor="track-path">User Journey Analysis</Label>
                      <p className="text-sm text-muted-foreground">
                        Track the path users take through your platform
                      </p>
                    </div>
                    <Switch id="track-path" defaultChecked />
                  </div>
                </CardContent>
              </Card>

              <Card>
                <CardHeader>
                  <CardTitle>Course Completion Analytics</CardTitle>
                  <CardDescription>
                    Track and analyze course completion rates
                  </CardDescription>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="flex items-center justify-between">
                    <div>
                      <Label htmlFor="course-progress">Course Progress Tracking</Label>
                      <p className="text-sm text-muted-foreground">
                        Track detailed user progress through course content
                      </p>
                    </div>
                    <Switch id="course-progress" defaultChecked />
                  </div>

                  <div className="flex items-center justify-between">
                    <div>
                      <Label htmlFor="completion-rates">Completion Rate Analytics</Label>
                      <p className="text-sm text-muted-foreground">
                        Generate reports on course completion rates
                      </p>
                    </div>
                    <Switch id="completion-rates" defaultChecked />
                  </div>

                  <div className="flex items-center justify-between">
                    <div>
                      <Label htmlFor="drop-off">Drop-off Point Analysis</Label>
                      <p className="text-sm text-muted-foreground">
                        Identify where students typically abandon courses
                      </p>
                    </div>
                    <Switch id="drop-off" defaultChecked />
                  </div>
                </CardContent>
              </Card>

              <Card>
                <CardHeader>
                  <CardTitle>Content Effectiveness Analytics</CardTitle>
                  <CardDescription>
                    Measure and analyze content effectiveness
                  </CardDescription>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="flex items-center justify-between">
                    <div>
                      <Label htmlFor="content-engagement">Content Engagement Metrics</Label>
                      <p className="text-sm text-muted-foreground">
                        Track which content receives the most engagement
                      </p>
                    </div>
                    <Switch id="content-engagement" defaultChecked />
                  </div>

                  <div className="flex items-center justify-between">
                    <div>
                      <Label htmlFor="quiz-analytics">Quiz Performance Analytics</Label>
                      <p className="text-sm text-muted-foreground">
                        Analyze student performance on quizzes and assessments
                      </p>
                    </div>
                    <Switch id="quiz-analytics" defaultChecked />
                  </div>

                  <div className="flex items-center justify-between">
                    <div>
                      <Label htmlFor="heatmaps">Interactive Content Heatmaps</Label>
                      <p className="text-sm text-muted-foreground">
                        Visual representation of user interactions with content
                      </p>
                    </div>
                    <Switch id="heatmaps" defaultChecked />
                  </div>
                </CardContent>
              </Card>

              <Card>
                <CardHeader>
                  <CardTitle>Data Export & Integration</CardTitle>
                  <CardDescription>
                    Configure data export options and third-party integrations
                  </CardDescription>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="flex items-center justify-between">
                    <div>
                      <Label htmlFor="scheduled-reports">Scheduled Analytics Reports</Label>
                      <p className="text-sm text-muted-foreground">
                        Automatically generate and email periodic reports
                      </p>
                    </div>
                    <Switch id="scheduled-reports" defaultChecked />
                  </div>

                  <div className="flex items-center justify-between">
                    <div>
                      <Label htmlFor="data-export">Custom Data Export</Label>
                      <p className="text-sm text-muted-foreground">
                        Export analytics data in various formats (CSV, JSON)
                      </p>
                    </div>
                    <Switch id="data-export" defaultChecked />
                  </div>

                  <div className="flex items-center justify-between">
                    <div>
                      <Label htmlFor="ga-integration">Google Analytics Integration</Label>
                      <p className="text-sm text-muted-foreground">
                        Send data to Google Analytics for advanced reporting
                      </p>
                    </div>
                    <Switch id="ga-integration" />
                  </div>
                </CardContent>
              </Card>
            </div>
          ) : (
            <div className="flex flex-col items-center justify-center p-12 text-center">
              <BarChart3 className="h-16 w-16 text-muted-foreground mb-4" />
              <h2 className="text-2xl font-bold mb-2">Analytics are disabled</h2>
              <p className="text-muted-foreground mb-4">
                Enable analytics in the General settings tab to configure and view analytics features.
              </p>
              <Button onClick={() => {
                setActiveTab("general");
                setAnalyticsEnabled(true);
              }}>
                Enable Analytics
              </Button>
            </div>
          )}
        </TabsContent>
      </Tabs>
    </div>
  );
}