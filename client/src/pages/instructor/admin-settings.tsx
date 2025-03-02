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

export default function AdminSettings() {
  const [, setLocation] = useLocation();
  const { toast } = useToast();
  const { user } = useAuth();
  const [lmsName, setLmsName] = useState("LearnBruh");
  const [enrollmentUrl, setEnrollmentUrl] = useState("/auth/login"); 
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

  // Analytics settings query
  const { data: analyticsEnabledSetting } = useQuery({
    queryKey: ["/api/analytics/settings"],
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
    handleToggleAnalytics(enabled);
    updateAnalyticsEnabledMutation.mutate(enabled);
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
    views: item.pageViews,
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
            <div className="space-y-6">
              {/* Stats summary cards */}
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
                <Card>
                  <CardContent className="pt-6">
                    <div className="text-sm text-muted-foreground mb-1">Total Users</div>
                    <div className="flex items-end justify-between">
                      <div className="text-3xl font-bold">{analyticsData?.summary?.userCount || 0}</div>
                    </div>
                  </CardContent>
                </Card>
                <Card>
                  <CardContent className="pt-6">
                    <div className="text-sm text-muted-foreground mb-1">Active Courses</div>
                    <div className="flex items-end justify-between">
                      <div className="text-3xl font-bold">{analyticsData?.mostViewedCourses?.length || 0}</div>
                    </div>
                  </CardContent>
                </Card>
                <Card>
                  <CardContent className="pt-6">
                    <div className="text-sm text-muted-foreground mb-1">Avg. Completion Rate</div>
                    <div className="flex items-end justify-between">
                      <div className="text-3xl font-bold">{analyticsData?.summary?.completionRate || 0}%</div>
                    </div>
                  </CardContent>
                </Card>
                <Card>
                  <CardContent className="pt-6">
                    <div className="text-sm text-muted-foreground mb-1">Total Page Views</div>
                    <div className="flex items-end justify-between">
                      <div className="text-3xl font-bold">{analyticsData?.summary?.totalPageViews || 0}</div>
                    </div>
                  </CardContent>
                </Card>
              </div>

              {/* User activity chart */}
              <Card>
                <CardHeader>
                  <CardTitle>User Activity</CardTitle>
                  <CardDescription>
                    Daily page views and unique users
                  </CardDescription>
                </CardHeader>
                <CardContent>
                  <div className="h-80">
                    <ResponsiveContainer width="100%" height="100%">
                      <BarChart
                        data={formattedUserActivity}
                        margin={{ top: 20, right: 30, left: 20, bottom: 5 }}
                      >
                        <CartesianGrid strokeDasharray="3 3" />
                        <XAxis dataKey="date" />
                        <YAxis />
                        <Tooltip />
                        <Legend />
                        <Bar dataKey="views" name="Page Views" fill="#3b82f6" />
                        <Bar dataKey="uniqueUsers" name="Unique Users" fill="#10b981" />
                      </BarChart>
                    </ResponsiveContainer>
                  </div>
                </CardContent>
              </Card>

              {/* Course completion and device usage side by side */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                {/* Course completion pie chart */}
                <Card>
                  <CardHeader>
                    <CardTitle>Course Completion</CardTitle>
                    <CardDescription>
                      Overall course completion statistics
                    </CardDescription>
                  </CardHeader>
                  <CardContent>
                    <div className="h-64 flex justify-center">
                      <ResponsiveContainer width="100%" height="100%">
                        <PieChart>
                          <Pie
                            data={courseCompletionData}
                            cx="50%"
                            cy="50%"
                            labelLine={false}
                            label={({ name, percent }) => `${name}: ${(percent * 100).toFixed(0)}%`}
                            outerRadius={80}
                            fill="#8884d8"
                            dataKey="value"
                          >
                            {courseCompletionData.map((entry, index) => (
                              <Cell key={`cell-${index}`} fill={entry.color} />
                            ))}
                          </Pie>
                          <Tooltip formatter={(value) => [`${value}%`, 'Percentage']} />
                        </PieChart>
                      </ResponsiveContainer>
                    </div>
                  </CardContent>
                </Card>

                {/* Device usage pie chart */}
                <Card>
                  <CardHeader>
                    <CardTitle>Device Usage</CardTitle>
                    <CardDescription>
                      Platform access by device type
                    </CardDescription>
                  </CardHeader>
                  <CardContent>
                    <div className="h-64 flex justify-center">
                      <ResponsiveContainer width="100%" height="100%">
                        <PieChart>
                          <Pie
                            data={deviceUsageData}
                            cx="50%"
                            cy="50%"
                            labelLine={false}
                            label={({ name, percent }) => `${name}: ${(percent * 100).toFixed(0)}%`}
                            outerRadius={80}
                            fill="#8884d8"
                            dataKey="value"
                          >
                            {deviceUsageData.map((entry, index) => (
                              <Cell key={`cell-${index}`} fill={entry.color} />
                            ))}
                          </Pie>
                          <Tooltip formatter={(value) => [`${value}`, 'Users']} />
                        </PieChart>
                      </ResponsiveContainer>
                    </div>
                  </CardContent>
                </Card>
              </div>

              {/* Popular Pages */}
              <Card>
                <CardHeader>
                  <CardTitle>Popular Pages</CardTitle>
                  <CardDescription>
                    Most frequently visited pages
                  </CardDescription>
                </CardHeader>
                <CardContent>
                  <div className="overflow-x-auto">
                    <table className="w-full">
                      <thead>
                        <tr className="border-b">
                          <th className="text-left py-3 px-4 font-medium">Page</th>
                          <th className="text-left py-3 px-4 font-medium">Views</th>
                        </tr>
                      </thead>
                      <tbody>
                        {analyticsData?.popularPages?.map((item, index) => (
                          <tr key={index} className={index !== (analyticsData?.popularPages?.length || 0) - 1 ? "border-b" : ""}>
                            <td className="py-3 px-4">{item.path}</td>
                            <td className="py-3 px-4">{item.count}</td>
                          </tr>
                        )) || (
                          <tr>
                            <td className="py-3 px-4" colSpan={2}>No data available</td>
                          </tr>
                        )}
                      </tbody>
                    </table>
                  </div>
                </CardContent>
              </Card>

              {/* Popular Courses */}
              <Card>
                <CardHeader>
                  <CardTitle>Most Viewed Courses</CardTitle>
                  <CardDescription>
                    Courses with highest engagement
                  </CardDescription>
                </CardHeader>
                <CardContent>
                  <div className="overflow-x-auto">
                    <table className="w-full">
                      <thead>
                        <tr className="border-b">
                          <th className="text-left py-3 px-4 font-medium">Course</th>
                          <th className="text-left py-3 px-4 font-medium">Views</th>
                          <th className="text-left py-3 px-4 font-medium">Completions</th>
                        </tr>
                      </thead>
                      <tbody>
                        {analyticsData?.mostViewedCourses?.map((item, index) => (
                          <tr key={index} className={index !== (analyticsData?.mostViewedCourses?.length || 0) - 1 ? "border-b" : ""}>
                            <td className="py-3 px-4">{item.course?.title || 'Unknown'}</td>
                            <td className="py-3 px-4">{item.totalViews}</td>
                            <td className="py-3 px-4">{item.totalCompletions}</td>
                          </tr>
                        )) || (
                          <tr>
                            <td className="py-3 px-4" colSpan={3}>No data available</td>
                          </tr>
                        )}
                      </tbody>
                    </table>
                  </div>
                </CardContent>
              </Card>

              {/* Export & Reporting */}
              <Card>
                <CardHeader>
                  <CardTitle>Analytics Reports</CardTitle>
                  <CardDescription>
                    Export or schedule analytics reports
                  </CardDescription>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="flex flex-col sm:flex-row gap-4">
                    <div className="flex-1 space-y-2">
                      <Label>Report Type</Label>
                      <Select defaultValue="user-activity">
                        <SelectTrigger>
                          <SelectValue placeholder="Select report type" />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="user-activity">User Activity Report</SelectItem>
                          <SelectItem value="course-completion">Course Completion Report</SelectItem>
                          <SelectItem value="content-engagement">Content Engagement Report</SelectItem>
                          <SelectItem value="revenue">Revenue Report</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>
                    <div className="flex-1 space-y-2">
                      <Label>Time Range</Label>
                      <Select defaultValue="last-month">
                        <SelectTrigger>
                          <SelectValue placeholder="Select time range" />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="last-week">Last 7 Days</SelectItem>
                          <SelectItem value="last-month">Last 30 Days</SelectItem>
                          <SelectItem value="last-quarter">Last 90 Days</SelectItem>
                          <SelectItem value="last-year">Last 365 Days</SelectItem>
                          <SelectItem value="custom">Custom Range</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>
                    <div className="flex-1 space-y-2">
                      <Label>Format</Label>
                      <Select defaultValue="csv">
                        <SelectTrigger>
                          <SelectValue placeholder="Select format" />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="csv">CSV</SelectItem>
                          <SelectItem value="xlsx">Excel</SelectItem>
                          <SelectItem value="pdf">PDF</SelectItem>
                          <SelectItem value="json">JSON</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>
                  </div>
                  <div className="flex justify-end">
                    <Button className="w-full sm:w-auto">Generate Report</Button>
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