import { useState, useEffect } from "react";
import { X } from "lucide-react";
import { useQuery } from "@tanstack/react-query";
import { Announcement } from "@shared/schema";
import { Button } from "./ui/button";
import { Card } from "./ui/card";

export function AnnouncementBanner() {
  const [dismissedAnnouncements, setDismissedAnnouncements] = useState<number[]>([]);
  const [currentAnnouncementIndex, setCurrentAnnouncementIndex] = useState(0);

  // Fetch active announcements
  const { data: announcements = [] } = useQuery<Announcement[]>({
    queryKey: ["/api/announcements/active"],
    queryFn: async () => {
      const response = await fetch("/api/announcements/active");
      if (!response.ok) {
        throw new Error("Failed to fetch announcements");
      }
      return response.json();
    },
    // Refresh every 5 minutes to get new announcements
    refetchInterval: 5 * 60 * 1000,
  });

  // Filter out dismissed announcements
  const activeAnnouncements = announcements.filter(
    (announcement) => !dismissedAnnouncements.includes(announcement.id)
  );

  // Reset the current index if we run out of announcements
  useEffect(() => {
    if (currentAnnouncementIndex >= activeAnnouncements.length && activeAnnouncements.length > 0) {
      setCurrentAnnouncementIndex(0);
    }
  }, [activeAnnouncements.length, currentAnnouncementIndex]);

  const dismissAnnouncement = (id: number) => {
    setDismissedAnnouncements((prev) => [...prev, id]);
    
    // If there are more announcements, show the next one
    if (currentAnnouncementIndex < activeAnnouncements.length - 1) {
      setCurrentAnnouncementIndex(currentAnnouncementIndex + 1);
    }
    // Otherwise, if we're dismissing the last announcement, reset to 0
    // (the useEffect will handle the case where there are no more announcements)
  };

  // Display nothing if there are no active announcements or all are dismissed
  if (activeAnnouncements.length === 0) {
    return null;
  }

  const currentAnnouncement = activeAnnouncements[currentAnnouncementIndex];

  return (
    <Card className="bg-primary/10 border-primary/30 mb-4 p-3 relative">
      <div className="flex items-start justify-between">
        <div className="flex-1">
          <h3 className="font-semibold">{currentAnnouncement.title}</h3>
          <p className="text-sm mt-1">{currentAnnouncement.content}</p>
        </div>
        <Button
          variant="ghost"
          size="icon"
          className="h-6 w-6"
          onClick={() => dismissAnnouncement(currentAnnouncement.id)}
        >
          <X className="h-4 w-4" />
        </Button>
      </div>
      {activeAnnouncements.length > 1 && (
        <div className="flex justify-center mt-2 gap-1">
          {activeAnnouncements.map((_, i) => (
            <span
              key={i}
              className={`h-1.5 w-1.5 rounded-full ${
                i === currentAnnouncementIndex
                  ? "bg-primary"
                  : "bg-primary/30"
              }`}
              onClick={() => setCurrentAnnouncementIndex(i)}
              style={{ cursor: "pointer" }}
            />
          ))}
        </div>
      )}
    </Card>
  );
}
