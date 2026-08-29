import { NextRequest, NextResponse } from "next/server";
import { YoutubeTranscript } from "youtube-transcript";

export interface CaptionCue {
  start: number;
  end: number;
  text: string;
}

function splitLongCueIntoLivePhrases(cue: CaptionCue): CaptionCue[] {
  const words = cue.text.split(/\s+/).filter(Boolean);
  if (words.length <= 5 || cue.end - cue.start <= 2.8) {
    return [cue];
  }

  const chunks: CaptionCue[] = [];
  const targetWordsPerChunk = 4;
  const totalChars = words.reduce((acc, w) => acc + w.length, 0);
  const totalDuration = cue.end - cue.start;

  let currentChunkWords: string[] = [];
  let currentChunkChars = 0;
  let elapsedChars = 0;

  for (let i = 0; i < words.length; i++) {
    const word = words[i];
    if (!word) continue;
    currentChunkWords.push(word);
    currentChunkChars += word.length;

    const hasPunctuation = /[.,!?;:]$/.test(word);
    const isChunkFull = currentChunkWords.length >= targetWordsPerChunk;
    const isLastWord = i === words.length - 1;

    if (isLastWord || hasPunctuation || isChunkFull) {
      const chunkStart = cue.start + (elapsedChars / Math.max(1, totalChars)) * totalDuration;
      elapsedChars += currentChunkChars;
      const chunkEnd = cue.start + (elapsedChars / Math.max(1, totalChars)) * totalDuration;

      chunks.push({
        start: parseFloat(chunkStart.toFixed(3)),
        end: parseFloat(chunkEnd.toFixed(3)),
        text: currentChunkWords.join(" "),
      });

      currentChunkWords = [];
      currentChunkChars = 0;
    }
  }

  return chunks.length > 0 ? chunks : [cue];
}

export async function GET(request: NextRequest) {
  const searchParams = request.nextUrl.searchParams;
  const videoId = searchParams.get("videoId")?.trim();

  if (!videoId) {
    return NextResponse.json({ error: "Missing videoId parameter", cues: [] }, { status: 400 });
  }

  try {
    const rawTranscript = await YoutubeTranscript.fetchTranscript(videoId);

    if (Array.isArray(rawTranscript) && rawTranscript.length > 0) {
      const parsedCues: CaptionCue[] = [];

      for (const item of rawTranscript) {
        // item.offset and item.duration from youtube-transcript are in milliseconds
        const startSec =
          typeof item.offset === "number"
            ? item.offset / 1000
            : parseFloat(item.offset || "0") / 1000;
        const durSec =
          typeof item.duration === "number"
            ? item.duration / 1000
            : parseFloat(item.duration || "0") / 1000;

        const cleanText = (item.text || "")
          .replace(/&amp;/g, "&")
          .replace(/&#39;/g, "'")
          .replace(/&quot;/g, '"')
          .replace(/&lt;/g, "<")
          .replace(/&gt;/g, ">")
          .replace(/\n/g, " ")
          .replace(/\s+/g, " ")
          .trim();

        if (cleanText && durSec > 0) {
          const rawCue: CaptionCue = {
            start: parseFloat(startSec.toFixed(3)),
            end: parseFloat((startSec + durSec).toFixed(3)),
            text: cleanText,
          };

          // Split into natural cadence speech phrases
          const liveChunks = splitLongCueIntoLivePhrases(rawCue);
          parsedCues.push(...liveChunks);
        }
      }

      // Sort segments strictly by start timestamp
      parsedCues.sort((a, b) => a.start - b.start);

      return NextResponse.json({
        videoId,
        available: true,
        count: parsedCues.length,
        source: "youtube_transcript",
        cues: parsedCues,
      });
    }

    return NextResponse.json({
      videoId,
      available: false,
      source: "none",
      cues: [],
    });
  } catch (err: any) {
    console.warn(`[Captions] YouTube transcript unavailable for ${videoId}:`, err?.message || err);
    return NextResponse.json({
      videoId,
      available: false,
      source: "none",
      cues: [],
    });
  }
}
