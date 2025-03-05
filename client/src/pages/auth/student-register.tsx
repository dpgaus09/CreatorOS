import { useAuth } from "@/hooks/use-auth";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Eye, EyeOff } from "lucide-react";
import { useState } from "react";
import { useLocation, useRoute } from "wouter";
import { useQuery } from "@tanstack/react-query";

const studentSchema = z.object({
  name: z.string().min(1, "Name is required"),
  email: z.string().email("Invalid email"),
  username: z.string().min(3, "Username must be at least 3 characters"),
  password: z.string().min(6, "Password must be at least 6 characters"),
  confirmPassword: z.string(),
  instructorId: z.number().optional()
}).refine(data => data.password === data.confirmPassword, {
  message: "Passwords don't match",
  path: ["confirmPassword"],
});

type StudentFormData = z.infer<typeof studentSchema>;
type Instructor = { id: number, name: string, username: string };

export default function StudentRegister() {
  const { user, registerMutation } = useAuth();
  const [, setLocation] = useLocation();
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const [match, params] = useRoute("/auth/register/student/:instructorId");
  const instructorId = match ? parseInt(params.instructorId, 10) : undefined;
  
  // Define setting type
  type Setting = { id?: number; name?: string; value: string };

  const { data: settings } = useQuery<Setting>({
    queryKey: ["/api/settings/lms-name"],
    placeholderData: { value: "CreatorOS" } as Setting,
  });

  // Fetch instructor info if instructorId is provided
  const { data: instructor } = useQuery<Instructor>({
    queryKey: ["/api/users/instructor", instructorId],
    enabled: !!instructorId,
  });

  const lmsName = settings?.value || "CreatorOS";
  const instructorName = instructor?.name;

  // Redirect if already logged in
  if (user) {
    setLocation("/");
    return null;
  }

  const form = useForm<StudentFormData>({
    resolver: zodResolver(studentSchema),
    defaultValues: {
      name: "",
      email: "",
      username: "",
      password: "",
      confirmPassword: "",
      instructorId: instructorId
    }
  });

  const onSubmit = (data: StudentFormData) => {
    registerMutation.mutate({
      ...data,
      role: "student",
      instructorId: instructorId
    });
  };

  return (
    <div className="min-h-screen flex items-center justify-center p-4">
      <Card className="w-full max-w-4xl mx-auto grid md:grid-cols-2 gap-6 p-6">
        <div className="space-y-6">
          <CardHeader className="p-0">
            <CardTitle className="text-2xl font-bold">Student Registration</CardTitle>
          </CardHeader>
          <div className="prose dark:prose-invert">
            {instructorName ? (
              <p>Create your student account for {instructorName}'s courses on {lmsName}.</p>
            ) : (
              <p>Create your student account for {lmsName} and start learning.</p>
            )}
            {instructorId && instructorName && (
              <div className="mt-2 p-2 bg-muted rounded-md text-sm">
                <p className="font-medium">You're registering as a student of {instructorName}</p>
              </div>
            )}
          </div>
          <Form {...form}>
            <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
              <FormField
                control={form.control}
                name="name"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Full Name</FormLabel>
                    <FormControl>
                      <Input {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <FormField
                control={form.control}
                name="email"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Email</FormLabel>
                    <FormControl>
                      <Input type="email" {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <FormField
                control={form.control}
                name="username"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Username</FormLabel>
                    <FormControl>
                      <Input {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <FormField
                control={form.control}
                name="password"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Password</FormLabel>
                    <FormControl>
                      <div className="relative">
                        <Input
                          type={showPassword ? "text" : "password"}
                          {...field}
                        />
                        <Button
                          type="button"
                          variant="ghost"
                          size="icon"
                          className="absolute right-0 top-0"
                          onClick={() => setShowPassword(!showPassword)}
                        >
                          {showPassword ? (
                            <EyeOff className="h-4 w-4" />
                          ) : (
                            <Eye className="h-4 w-4" />
                          )}
                        </Button>
                      </div>
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <FormField
                control={form.control}
                name="confirmPassword"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Confirm Password</FormLabel>
                    <FormControl>
                      <div className="relative">
                        <Input
                          type={showConfirmPassword ? "text" : "password"}
                          {...field}
                        />
                        <Button
                          type="button"
                          variant="ghost"
                          size="icon"
                          className="absolute right-0 top-0"
                          onClick={() => setShowConfirmPassword(!showConfirmPassword)}
                        >
                          {showConfirmPassword ? (
                            <EyeOff className="h-4 w-4" />
                          ) : (
                            <Eye className="h-4 w-4" />
                          )}
                        </Button>
                      </div>
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <Button
                type="submit"
                className="w-full"
                disabled={registerMutation.isPending}
              >
                Register
              </Button>
              <div className="text-center">
                <Button
                  variant="link"
                  className="text-sm"
                  onClick={() => setLocation("/auth/login")}
                >
                  Already have an account? Login
                </Button>
              </div>
            </form>
          </Form>
        </div>
        <div className="hidden md:block">
          <CardContent className="h-full flex items-center justify-center">
            <div className="text-center space-y-4">
              <h2 className="text-2xl font-bold">Welcome to {lmsName}</h2>
              <p className="text-muted-foreground">
                Access your courses, track your progress, and achieve your learning goals.
              </p>
            </div>
          </CardContent>
        </div>
      </Card>
    </div>
  );
}
