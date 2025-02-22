import { useState } from "react";
import { Module } from "@shared/schema";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Card, CardContent } from "@/components/ui/card";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { DndContext, DragEndEvent, MouseSensor, TouchSensor, useSensor, useSensors } from "@dnd-kit/core";
import { SortableContext, arrayMove, sortableKeyboardCoordinates, useSortable, verticalListSortingStrategy } from "@dnd-kit/sortable";
import { CSS } from "@dnd-kit/utilities";
import { Plus, Trash2, GripVertical, Video, FileText } from "lucide-react";
import { nanoid } from "nanoid";

interface CourseEditorProps {
  modules: Module[];
  onChange: (modules: Module[]) => void;
}

function SortableModule({ module, index, onUpdate, onDelete }: {
  module: Module;
  index: number;
  onUpdate: (title: string) => void;
  onDelete: () => void;
}) {
  const { attributes, listeners, setNodeRef, transform, transition } = useSortable({ id: module.id });
  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
  };

  return (
    <div 
      ref={setNodeRef}
      style={style}
      className="flex items-center gap-2 p-2 rounded hover:bg-muted group"
    >
      <button {...attributes} {...listeners} className="cursor-grab">
        <GripVertical className="h-4 w-4 text-muted-foreground" />
      </button>
      <Input
        value={module.title}
        onChange={(e) => onUpdate(e.target.value)}
        className="h-8"
      />
      <Button
        variant="ghost"
        size="sm"
        onClick={onDelete}
        className="opacity-0 group-hover:opacity-100 transition-opacity"
      >
        <Trash2 className="h-4 w-4" />
      </Button>
    </div>
  );
}

function LessonEditor({ lesson, onUpdate, onDelete }: {
  lesson: Module["lessons"][number];
  onUpdate: (updates: Partial<Module["lessons"][number]>) => void;
  onDelete: () => void;
}) {
  return (
    <Card>
      <CardContent className="p-4 space-y-4">
        <div className="flex items-center gap-4">
          <Input
            value={lesson.title}
            onChange={(e) => onUpdate({ title: e.target.value })}
            placeholder="Lesson title"
          />
          <Select
            value={lesson.type}
            onValueChange={(value) => onUpdate({ type: value as "text" | "video" })}
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
            onClick={onDelete}
          >
            <Trash2 className="h-4 w-4" />
          </Button>
        </div>

        {lesson.type === "text" ? (
          <Textarea
            value={lesson.content}
            onChange={(e) => onUpdate({ content: e.target.value })}
            placeholder="Enter your lesson content here..."
            className="min-h-[200px] resize-y"
          />
        ) : (
          <div className="space-y-4">
            <Input
              type="url"
              value={lesson.content}
              onChange={(e) => onUpdate({ content: e.target.value })}
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
  );
}

export default function CourseEditor({ modules, onChange }: CourseEditorProps) {
  const [selectedModuleIndex, setSelectedModuleIndex] = useState(0);
  const sensors = useSensors(
    useSensor(MouseSensor),
    useSensor(TouchSensor)
  );

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

  const handleDragEnd = (event: DragEndEvent) => {
    const { active, over } = event;
    if (!over || active.id === over.id) return;

    const oldIndex = modules.findIndex((m) => m.id === active.id);
    const newIndex = modules.findIndex((m) => m.id === over.id);

    onChange(arrayMove(modules, oldIndex, newIndex));
    setSelectedModuleIndex(newIndex);
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

        <DndContext 
          sensors={sensors}
          onDragEnd={handleDragEnd}
        >
          <SortableContext 
            items={modules.map(m => m.id)}
            strategy={verticalListSortingStrategy}
          >
            <div className="space-y-2">
              {modules.map((module, moduleIndex) => (
                <div
                  key={module.id}
                  className={`cursor-pointer ${
                    moduleIndex === selectedModuleIndex
                      ? "bg-primary text-primary-foreground"
                      : ""
                  }`}
                  onClick={() => setSelectedModuleIndex(moduleIndex)}
                >
                  <SortableModule
                    module={module}
                    index={moduleIndex}
                    onUpdate={(title) => {
                      const newModules = [...modules];
                      newModules[moduleIndex].title = title;
                      onChange(newModules);
                    }}
                    onDelete={() => deleteModule(moduleIndex)}
                  />
                </div>
              ))}
            </div>
          </SortableContext>
        </DndContext>
      </div>

      <div className="col-span-9 space-y-4">
        {modules[selectedModuleIndex] && (
          <>
            <div className="flex items-center justify-between">
              <h3 className="font-medium">
                Lessons for {modules[selectedModuleIndex].title}
              </h3>
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
                <LessonEditor
                  key={lesson.id}
                  lesson={lesson}
                  onUpdate={(updates) =>
                    updateLesson(selectedModuleIndex, lessonIndex, updates)
                  }
                  onDelete={() => deleteLesson(selectedModuleIndex, lessonIndex)}
                />
              ))}
            </div>
          </>
        )}
      </div>
    </div>
  );
}