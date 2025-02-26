import { useQuery } from "@tanstack/react-query";
import { useLocation } from "wouter";
import { format } from "date-fns";
import { ArrowLeft } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Course, Enrollment } from "@shared/schema";

type Student = {
  id: number;
  name: string;
  email: string;
  username: string;
  createdAt: string;
  enrollments: (Enrollment & { course?: Course })[];
};

export default function StudentsList() {
  const [, setLocation] = useLocation();

  const { data: students, isLoading } = useQuery<Student[]>({
    queryKey: ["/api/students"],
  });

  return (
    <div className="container max-w-5xl mx-auto py-8 space-y-6">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-4">
          <Button variant="ghost" size="icon" onClick={() => setLocation("/")}>
            <ArrowLeft className="h-4 w-4" />
          </Button>
          <h1 className="text-3xl font-bold">Students List</h1>
        </div>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Registered Students</CardTitle>
        </CardHeader>
        <CardContent>
          {isLoading ? (
            <div className="text-center py-4">Loading students...</div>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Student Name</TableHead>
                  <TableHead>Email</TableHead>
                  <TableHead>Username</TableHead>
                  <TableHead>Registration Date</TableHead>
                  <TableHead>Enrolled Courses</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {students?.map((student) => (
                  <TableRow key={student.id}>
                    <TableCell className="font-medium">{student.name}</TableCell>
                    <TableCell>{student.email}</TableCell>
                    <TableCell>{student.username}</TableCell>
                    <TableCell>
                      {format(new Date(student.createdAt), "PPpp")}
                    </TableCell>
                    <TableCell>
                      {student.enrollments.length > 0 ? (
                        <ul className="list-disc list-inside">
                          {student.enrollments.map((enrollment) => (
                            <li key={enrollment.id}>
                              {enrollment.course?.title || "Unknown Course"}
                            </li>
                          ))}
                        </ul>
                      ) : (
                        <span className="text-gray-500">No courses enrolled</span>
                      )}
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>
    </div>
  );
}