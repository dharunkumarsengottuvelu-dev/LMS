/**
 * Meeting Link & Invite Text Auto-Parser Utility for FALCON LMS
 * Extracts platform, clean URL, scheduled date, start time, and end time
 * from raw meeting URLs, query parameters, or full calendar invite texts.
 */

export interface ParsedMeetingData {
  cleanUrl: string;
  platform: "falcon_webrtc" | "google_meet" | "zoom" | "teams" | "other";
  scheduledDate?: string; // YYYY-MM-DD
  startTime?: string;     // HH:MM (24h)
  endTime?: string;       // HH:MM (24h)
  title?: string;
  extractedText?: string;
}

export function parseMeetingLinkOrInvite(rawInput: string): ParsedMeetingData {
  const text = (rawInput || "").trim();
  if (!text) {
    return { cleanUrl: "", platform: "other" };
  }

  // 1. Extract URL (Look for http/https link)
  const urlRegex = /(https?:\/\/[^\s<>"']+)/i;
  const urlMatch = text.match(urlRegex);
  const cleanUrl = urlMatch ? urlMatch[0].replace(/[.,;)]+$/, "") : (text.startsWith("http") ? text : "");

  // 2. Detect Platform
  let platform: "falcon_webrtc" | "google_meet" | "zoom" | "teams" | "other" = "other";
  const urlLower = (cleanUrl || text).toLowerCase();

  if (urlLower.includes("meet.google.com")) {
    platform = "google_meet";
  } else if (urlLower.includes("zoom.us") || urlLower.includes("zoomgov.com")) {
    platform = "zoom";
  } else if (urlLower.includes("teams.microsoft.com") || urlLower.includes("teams.live.com")) {
    platform = "teams";
  } else if (cleanUrl) {
    platform = "other";
  }

  let scheduledDate: string | undefined;
  let startTime: string | undefined;
  let endTime: string | undefined;
  let title: string | undefined;

  // 3. Extract Time from Google Calendar / URL Query Params (e.g. dates=20260902T103000Z/20260902T113000Z)
  const gcalDatesMatch = text.match(/dates=(\d{4})(\d{2})(\d{2})T(\d{2})(\d{2})\d{2}Z?\/(\d{4})(\d{2})(\d{2})T(\d{2})(\d{2})\d{2}Z?/i);
  if (gcalDatesMatch && gcalDatesMatch[1] && gcalDatesMatch[2] && gcalDatesMatch[3] && gcalDatesMatch[4] && gcalDatesMatch[5] && gcalDatesMatch[9] && gcalDatesMatch[10]) {
    scheduledDate = `${gcalDatesMatch[1]}-${gcalDatesMatch[2]}-${gcalDatesMatch[3]}`;
    startTime = `${gcalDatesMatch[4]}:${gcalDatesMatch[5]}`;
    endTime = `${gcalDatesMatch[9]}:${gcalDatesMatch[10]}`;
  }

  // 4. Extract Times from Invite Text
  // Matches patterns like: "10:00 AM - 11:30 AM", "10:00am to 11:00am", "10:30 – 11:30am", "14:00 - 15:30"
  if (!startTime) {
    const timeRangeRegex = /(\b\d{1,2}:\d{2}\s*(?:AM|PM|am|pm)?)\s*(?:-|–|to|until)\s*(\b\d{1,2}:\d{2}\s*(?:AM|PM|am|pm)?)/i;
    const timeRangeMatch = text.match(timeRangeRegex);

    if (timeRangeMatch && timeRangeMatch[1] && timeRangeMatch[2]) {
      const rawStart = timeRangeMatch[1].trim();
      const rawEnd = timeRangeMatch[2].trim();

      startTime = convertTo24Hour(rawStart);
      endTime = convertTo24Hour(rawEnd);
    } else {
      // Single time pattern: "Time: 10:00 AM" or "at 3:30 PM"
      const singleTimeMatch = text.match(/(?:Time|at|starts?|from):\s*(\d{1,2}:\d{2}\s*(?:AM|PM|am|pm)?)/i) ||
                              text.match(/\b(\d{1,2}:\d{2}\s*(?:AM|PM|am|pm))\b/i);
      if (singleTimeMatch && singleTimeMatch[1]) {
        startTime = convertTo24Hour(singleTimeMatch[1].trim());
        // Default end time +1 hour
        if (startTime) {
          const parts = startTime.split(":");
          const h = Number(parts[0]) || 0;
          const m = parts[1] || "00";
          const endHour = (h + 1) % 24;
          endTime = `${String(endHour).padStart(2, "0")}:${m}`;
        }
      }
    }
  }

  // 5. Extract Date from Invite Text
  // e.g. "September 2, 2026", "Sep 2, 2026", "2026-09-02", "02/09/2026"
  if (!scheduledDate) {
    const isoDateMatch = text.match(/\b(\d{4})-(\d{2})-(\d{2})\b/);
    if (isoDateMatch && isoDateMatch[1] && isoDateMatch[2] && isoDateMatch[3]) {
      scheduledDate = `${isoDateMatch[1]}-${isoDateMatch[2]}-${isoDateMatch[3]}`;
    } else {
      const naturalDateMatch = text.match(/\b(Jan(?:uary)?|Feb(?:ruary)?|Mar(?:ch)?|Apr(?:il)?|May|Jun(?:e)?|Jul(?:y)?|Aug(?:ust)?|Sep(?:tember)?|Oct(?:ober)?|Nov(?:ember)?|Dec(?:ember)?)\s+(\d{1,2})(?:st|nd|rd|th)?,?\s*(\d{4})?\b/i);
      if (naturalDateMatch && naturalDateMatch[1] && naturalDateMatch[2]) {
        const monthNames = ["jan", "feb", "mar", "apr", "may", "jun", "jul", "aug", "sep", "oct", "nov", "dec"];
        const monthStr = naturalDateMatch[1].toLowerCase();
        const monthIndex = monthNames.findIndex((m) => monthStr.startsWith(m));
        const day = String(Number(naturalDateMatch[2])).padStart(2, "0");
        const year = naturalDateMatch[3] || new Date().getFullYear().toString();
        if (monthIndex !== -1) {
          scheduledDate = `${year}-${String(monthIndex + 1).padStart(2, "0")}-${day}`;
        }
      }
    }
  }

  // 6. Extract Topic / Title
  const topicMatch = text.match(/(?:Topic|Title|Subject|Class):\s*([^\n\r]+)/i);
  if (topicMatch && topicMatch[1]) {
    title = topicMatch[1].trim();
  }

  return {
    cleanUrl: cleanUrl || text,
    platform,
    scheduledDate,
    startTime,
    endTime,
    title,
  };
}

function convertTo24Hour(timeStr: string): string | undefined {
  const match = timeStr.match(/^(\d{1,2}):(\d{2})\s*(AM|PM|am|pm)?$/i);
  if (!match || !match[1] || !match[2]) return undefined;

  let hour = parseInt(match[1], 10);
  const minute = match[2];
  const period = match[3]?.toUpperCase();

  if (period === "PM" && hour < 12) {
    hour += 12;
  } else if (period === "AM" && hour === 12) {
    hour = 0;
  }

  return `${String(hour).padStart(2, "0")}:${minute}`;
}
