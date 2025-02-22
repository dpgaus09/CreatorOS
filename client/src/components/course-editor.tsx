import { useState } from "react";
import { Module } from "@shared/schema";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Card, CardContent } from "@/components/ui/card";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Plus, Trash2, Video, FileText, ChevronDown, ChevronUp } from "lucide-react";
import { nanoid } from "nanoid";

interface CourseEditorProps {
  modules: Module[];
  onChange: (modules: Module[]) => void;
}

export default function CourseEditor({ modules, onChange }: CourseEditorProps) {
  const [expandedModules, setExpandedModules] = useState<Set<string>>(new Set());

  const toggleModule = (moduleId: string) => {
    const newExpanded = new Set(expandedModules);
    if (newExpanded.has(moduleId)) {
      newExpanded.delete(moduleId);
    } else {
      newExpanded.add(moduleId);
    }
    setExpandedModules(newExpanded);
  };

  const addModule = () => {
    const newModule = {
      id: nanoid(),
      title: `Module ${modules.length + 1}`,
      lessons: [],
    };
    onChange([...modules, newModule]);
    setExpandedModules(new Set([...expandedModules, newModule.id]));
  };

  const addLesson = (moduleIndex: number) => {
    const newModules = [...modules];
    newModules[moduleIndex].lessons.push({
      id: nanoid(),
      title: `Lesson ${newModules[moduleIndex].lessons.length + 1}`,
      type: "text",
      content: "",
    });
    onChange(newModules);
  };

  const updateLesson = (
    moduleIndex: number,
    lessonIndex: number,
    updates: Partial<Module["lessons"][number]>,
  ) => {
    const newModules = [...modules];
    newModules[moduleIndex].lessons[lessonIndex] = {
      ...newModules[moduleIndex].lessons[lessonIndex],
      ...updates,
    };
    onChange(newModules);
  };

  const deleteLesson = (moduleIndex: number, lessonIndex: number) => {
    const newModules = [...modules];
    newModules[moduleIndex].lessons.splice(lessonIndex, 1);
    onChange(newModules);
  };

  const deleteModule = (moduleIndex: number) => {
    const newModules = [...modules];
    const moduleId = newModules[moduleIndex].id;
    newModules.splice(moduleIndex, 1);
    onChange(newModules);
    const newExpanded = new Set(expandedModules);
    newExpanded.delete(moduleId);
    setExpandedModules(newExpanded);
  };

  if (modules.length === 0) {
    return (
      <Card className="border-2 border-dashed">
        <CardContent className="flex flex-col items-center justify-center py-12 text-center">
          <h3 className="text-xl font-medium mb-2 text-muted-foreground">
            Start building your course
          </h3>
          <p className="text-sm text-muted-foreground mb-6">
            Add your first module to begin organizing your course content
          </p>
          <Button onClick={addModule}>
            <Plus className="mr-2 h-4 w-4" />
            Add First Module
          </Button>
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="space-y-4">
      {modules.map((module, moduleIndex) => (
        <Card key={module.id} className="border-2">
          <div className="p-4 flex items-center justify-between border-b">
            <Input
              value={module.title}
              onChange={(e) => {
                const newModules = [...modules];
                newModules[moduleIndex].title = e.target.value;
                onChange(newModules);
              }}
              placeholder="Module title"
              className="text-lg font-medium border-none px-0 max-w-md"
            />
            <div className="flex items-center gap-2">
              <Button
                variant="ghost"
                size="sm"
                onClick={() => toggleModule(module.id)}
              >
                {expandedModules.has(module.id) ? (
                  <ChevronUp className="h-4 w-4" />
                ) : (
                  <ChevronDown className="h-4 w-4" />
                )}
              </Button>
              <Button
                variant="ghost"
                size="sm"
                onClick={() => deleteModule(moduleIndex)}
              >
                <Trash2 className="h-4 w-4" />
              </Button>
            </div>
          </div>

          {expandedModules.has(module.id) && (
            <CardContent className="p-4 space-y-4">
              {module.lessons.map((lesson, lessonIndex) => (
                <Card key={lesson.id} className="border">
                  <CardContent className="p-4 space-y-4">
                    <div className="flex items-center gap-4">
                      <Input
                        value={lesson.title}
                        onChange={(e) => 
                          updateLesson(moduleIndex, lessonIndex, {
                            title: e.target.value,
                          })
                        }
                        placeholder="Lesson title"
                      />
                      <Select
                        value={lesson.type}
                        onValueChange={(value) => 
                          updateLesson(moduleIndex, lessonIndex, {
                            type: value as "text" | "video",
                          })
                        }
                      >
                        <SelectTrigger className="w-32">
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="text">
                            <div className="flex items-center gap-2">
                              <FileText className="h-4 w-4" />
                              <span>Text</span>
                            </div>
                          </SelectItem>
                          <SelectItem value="video">
                            <div className="flex items-center gap-2">
                              <Video className="h-4 w-4" />
                              <span>Video</span>
                            </div>
                          </SelectItem>
                        </SelectContent>
                      </Select>
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => deleteLesson(moduleIndex, lessonIndex)}
                      >
                        <Trash2 className="h-4 w-4" />
                      </Button>
                    </div>

                    {lesson.type === "text" ? (
                      <Textarea
                        value={lesson.content}
                        onChange={(e) =>
                          updateLesson(moduleIndex, lessonIndex, {
                            content: e.target.value,
                          })
                        }
                        placeholder="Enter your lesson content here..."
                        className="min-h-[200px] resize-none"
                      />
                    ) : (
                      <div className="space-y-4">
                        <Input
                          type="url"
                          value={lesson.content}
                          onChange={(e) =>
                            updateLesson(moduleIndex, lessonIndex, {
                              content: e.target.value,
                            })
                          }
                          placeholder="Enter video URL (YouTube, Vimeo, etc.)"
                        />
                        {lesson.content && (
                          <div className="aspect-video rounded-lg overflow-hidden bg-muted">
                            <iframe
                              src={lesson.content}
                              className="w-full h-full"
                              allowFullScreen
                            />
                          </div>
                        )}
                      </div>
                    )}
                  </CardContent>
                </Card>
              ))}

              <Button
                variant="outline"
                className="w-full"
                onClick={() => addLesson(moduleIndex)}
              >
                <Plus className="mr-2 h-4 w-4" />
                Add Lesson
              </Button>
            </CardContent>
          )}
        </Card>
      ))}

      <Button
        variant="outline"
        className="w-full"
        onClick={addModule}
      >
        <Plus className="mr-2 h-4 w-4" />
        Add Module
      </Button>
    </div>
  );
}