import { useState, useEffect } from "react";
import { X } from "lucide-react";
import { useQuery } from "@tanstack/react-query";
import { Announcement } from "@shared/schema";
import { Button } from "./ui/button";
import { Card } from "./ui/card";

export function AnnouncementBanner() {
  const [dismissed, setDismissed] = useState(false);

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

  // Get the first active announcement
  const activeAnnouncement = announcements.length > 0 ? announcements[0] : null;

  // Display nothing if there are no active announcements or it's dismissed
  if (!activeAnnouncement || dismissed) {
    return null;
  }

  return (
    <Card className="bg-primary/10 border-primary/30 mb-4 p-3 relative">
      <div className="flex items-start justify-between">
        <div className="flex-1">
          <h3 className="font-semibold">{activeAnnouncement.title}</h3>
          <p className="text-sm mt-1">{activeAnnouncement.content}</p>
        </div>
        <Button
          variant="ghost"
          size="icon"
          className="h-6 w-6"
          onClick={() => setDismissed(true)}
        >
          <X className="h-4 w-4" />
        </Button>
      </div>
    </Card>
  );
}