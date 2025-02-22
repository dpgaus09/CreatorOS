import { useState } from "react";
import { Module } from "@shared/schema";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Card, CardContent } from "@/components/ui/card";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Plus, Trash2, GripVertical } from "lucide-react";
import { nanoid } from "nanoid";

interface CourseEditorProps {
  modules: Module[];
  onChange: (modules: Module[]) => void;
}

export default function CourseEditor({ modules, onChange }: CourseEditorProps) {
  const [selectedModuleIndex, setSelectedModuleIndex] = useState(0);

  const addModule = () => {
    onChange([
      ...modules,
      {
        id: nanoid(),
        title: `Module ${modules.length + 1}`,
        lessons: [],
      },
    ]);
    setSelectedModuleIndex(modules.length);
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
    newModules.splice(moduleIndex, 1);
    onChange(newModules);
    setSelectedModuleIndex(Math.max(0, moduleIndex - 1));
  };

  if (modules.length === 0) {
    return (
      <div className="text-center py-12">
        <h3 className="text-xl font-medium mb-4">Start creating your course</h3>
        <Button onClick={addModule}>
          <Plus className="mr-2 h-4 w-4" />
          Add First Module
        </Button>
      </div>
    );
  }

  return (
    <div className="grid grid-cols-12 gap-6">
      <div className="col-span-3 space-y-4">
        <div className="flex items-center justify-between">
          <h3 className="font-medium">Modules</h3>
          <Button variant="outline" size="sm" onClick={addModule}>
            <Plus className="h-4 w-4" />
          </Button>
        </div>
        <div className="space-y-2">
          {modules.map((module, moduleIndex) => (
            <div
              key={module.id}
              className={`flex items-center gap-2 p-2 rounded cursor-pointer ${
                moduleIndex === selectedModuleIndex
                  ? "bg-primary text-primary-foreground"
                  : "hover:bg-muted"
              }`}
              onClick={() => setSelectedModuleIndex(moduleIndex)}
            >
              <GripVertical className="h-4 w-4" />
              <Input
                value={module.title}
                onChange={(e) => {
                  const newModules = [...modules];
                  newModules[moduleIndex].title = e.target.value;
                  onChange(newModules);
                }}
                className="h-8"
                onClick={(e) => e.stopPropagation()}
              />
              <Button
                variant="ghost"
                size="sm"
                onClick={(e) => {
                  e.stopPropagation();
                  deleteModule(moduleIndex);
                }}
              >
                <Trash2 className="h-4 w-4" />
              </Button>
            </div>
          ))}
        </div>
      </div>

      <div className="col-span-9 space-y-4">
        {modules[selectedModuleIndex] && (
          <>
            <div className="flex items-center justify-between">
              <h3 className="font-medium">Lessons</h3>
              <Button
                variant="outline"
                size="sm"
                onClick={() => addLesson(selectedModuleIndex)}
              >
                <Plus className="mr-2 h-4 w-4" />
                Add Lesson
              </Button>
            </div>
            <div className="space-y-4">
              {modules[selectedModuleIndex].lessons.map((lesson, lessonIndex) => (
                <Card key={lesson.id}>
                  <CardContent className="p-4 space-y-4">
                    <div className="flex items-center gap-4">
                      <Input
                        value={lesson.title}
                        onChange={(e) =>
                          updateLesson(selectedModuleIndex, lessonIndex, {
                            title: e.target.value,
                          })
                        }
                        placeholder="Lesson title"
                      />
                      <Select
                        value={lesson.type}
                        onValueChange={(value) =>
                          updateLesson(selectedModuleIndex, lessonIndex, {
                            type: value as "text" | "video",
                          })
                        }
                      >
                        <SelectTrigger className="w-32">
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="text">Text</SelectItem>
                          <SelectItem value="video">Video</SelectItem>
                        </SelectContent>
                      </Select>
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => deleteLesson(selectedModuleIndex, lessonIndex)}
                      >
                        <Trash2 className="h-4 w-4" />
                      </Button>
                    </div>
                    {lesson.type === "text" ? (
                      <Textarea
                        value={lesson.content}
                        onChange={(e) =>
                          updateLesson(selectedModuleIndex, lessonIndex, {
                            content: e.target.value,
                          })
                        }
                        placeholder="Lesson content"
                        className="min-h-[200px]"
                      />
                    ) : (
                      <Input
                        type="url"
                        value={lesson.content}
                        onChange={(e) =>
                          updateLesson(selectedModuleIndex, lessonIndex, {
                            content: e.target.value,
                          })
                        }
                        placeholder="Video URL"
                      />
                    )}
                  </CardContent>
                </Card>
              ))}
            </div>
          </>
        )}
      </div>
    </div>
  );
}
