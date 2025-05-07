import { GoogleGenerativeAI, HarmCategory, HarmBlockThreshold } from '@google/generative-ai';

// Initialize the Google Generative AI with your API key
const getGeminiAPI = () => {
  const apiKey = process.env.NEXT_PUBLIC_GEMINI_API_KEY;
  
  if (!apiKey) {
    throw new Error('NEXT_PUBLIC_GEMINI_API_KEY is not defined');
  }
  
  return new GoogleGenerativeAI(apiKey);
};

// Model names can be overridden via env; default to Gemini 2 family
const MODEL_OVERVIEW =
  process.env.NEXT_PUBLIC_GEMINI_MODEL_OVERVIEW || 'gemini-2.0-flash';

const MODEL_DEEPDIVE =
  process.env.NEXT_PUBLIC_GEMINI_MODEL_DEEPDIVE || 'gemini-2.5-pro-preview-05-06';

// Helper to get a GenerativeModel instance for an arbitrary model name
const getGeminiModel = (model: string) => {
  const genAI = getGeminiAPI();
  return genAI.getGenerativeModel({
    model,
    safetySettings: [
      {
        category: HarmCategory.HARM_CATEGORY_HARASSMENT,
        threshold: HarmBlockThreshold.BLOCK_MEDIUM_AND_ABOVE,
      },
      {
        category: HarmCategory.HARM_CATEGORY_HATE_SPEECH,
        threshold: HarmBlockThreshold.BLOCK_MEDIUM_AND_ABOVE,
      },
    ],
  });
};

// ────────────────────────────────────────────────────────────
// Timestamped transcript utilities
// ────────────────────────────────────────────────────────────
export type Segment = { ts: string; text: string };

// 1️⃣ Parse .srt / markdown transcripts that contain lines
// like "00:00:00,000 --> 00:00:07,680" followed by text.
export function parseTimestampedTranscript(raw: string): Segment[] {
  const segs: Segment[] = [];
  const pattern = /(\d{2}:\d{2}:\d{2},\d{3})\s+-->\s+\d{2}:\d{2}:\d{2},\d{3}\s*\n([\s\S]*?)(?=\n\d+\n\d{2}:\d{2}:\d{2},\d{3}|$)/g;
  for (const match of raw.matchAll(pattern)) {
    const [_, ts, block] = match;
    const text = block.trim().replace(/\n+/g, ' ');
    segs.push({ ts, text });
  }
  // Fallback: if regex missed, return entire raw as single segment
  if (segs.length === 0) {
    segs.push({ ts: '00:00', text: raw });
  }
  return segs;
}

// 2️⃣ Strip timestamps → plain narrative for LLM
const stripTimestamps = (segs: Segment[]) => segs.map((s) => s.text).join(' ');

// ⏲️ Get the timestamp of the *last* segment in MM:SS form
const finalTimestamp = (segs: Segment[]) => segs[segs.length - 1].ts.slice(3, 8);

// 3️⃣ Find timestamp for the first sentence of a chapter
function lookupTimestamp(sentence: string, segs: Segment[]): string {
  const normalise = (str: string) => str.toLowerCase().replace(/[^a-z0-9 ]/g, ' ');
  const key = normalise(sentence).slice(0, 60);
  for (const seg of segs) {
    if (normalise(seg.text).includes(key)) {
      // Return MM:SS from HH:MM:SS,mmm
      return seg.ts.slice(3, 8);
    }
  }
  return '??:??';
}

// ────────────────────────────────────────────────────────────
// Prompt helpers
// ────────────────────────────────────────────────────────────

const generateOverviewPrompt = (plain: string, endTime: string) => `You are an elite podcast show-note writer for \"Crazy Wisdom\".

TASK: Break the ENTIRE conversation (from 00:00 **through ${endTime}**) into 8-12 chronological chapters.
• The first chapter must start at or very near 00:00.
• The LAST chapter must start **within the final 5 minutes** (≥ ${endTime} − 05:00).
Return ONLY valid JSON in the exact form:
[
  { "title": "<chapter name>", "first": "<first sentence of that chapter>" },
  ...
]
Do NOT wrap in Markdown fences, no other keys, no commentary.

Transcript:
${plain}`;

const generateDeepDivePrompt = (
  transcript: string,
  chapters: { title: string; start: string }[],
) => {
  const chapterList = chapters.map((c) => `${c.start} ${c.title}`).join('\n');
  return `You are an elite podcast show-note writer for \"Crazy Wisdom\".

STYLE & TONE
-------------
Follow the style and tone of the example below.  
• Write in the first-person voice of the host, Stewart Alsop (\"I, Stewart Alsop, ...\").  
• Mention the guest(s) and the show name in the very first sentence.  
• Do NOT add a separate H1 title; start directly with the intro sentence.  
• Use simple section names (\"Timestamps\", \"Key Insights\", \"Contact Information\") with no \"Introduction\" header.  

RESOURCES
---------
The conversation has been auto-segmented into chapters with real start times:
${chapterList}

WHAT TO DELIVER
---------------
1. Intro paragraph — 2–3 sentences in the same first-person style.
2. Section: \"Timestamps\"  
   • 6–10 entries formatted as \"MM:SS Description ...\" (no bullets).  
   • Use the provided start times; refine descriptions if needed.
3. Section: \"Key Insights\"  
   • 5–8 insights. Start each insight with a **bolded** short heading followed by a 2–4 sentence explanation.
4. Section: \"Contact Information\"  
   • Bullet list of any handles, links, or company names mentioned.  
   • If none found, write \"Not provided in transcript.\"

Markdown is allowed, but keep it lightweight (plain lines for timestamps; bullets only in Contact Information).  
Do NOT add any additional commentary before or after the show notes.

TRANSCRIPT
----------
${transcript}`;
};

// ────────────────────────────────────────────────────────────
// Main entry – Two-pass show-note generation
// ────────────────────────────────────────────────────────────

export async function generateShowNotes(rawTranscript: string): Promise<string> {
  try {
    // Basic diagnostics
    console.log('[ShowNotes] Raw transcript length:', rawTranscript.length, 'chars');

    // Parse & strip timestamps once
    const segments = parseTimestampedTranscript(rawTranscript);
    const plainText = stripTimestamps(segments);

    // ── PASS 1 : Fast overview with Flash ──
    const overviewModel = getGeminiModel(MODEL_OVERVIEW);
    const overviewPrompt = generateOverviewPrompt(plainText, finalTimestamp(segments));
    console.time('[ShowNotes] Pass-1 (overview)');
    const overviewRes = await overviewModel.generateContent(overviewPrompt);
    console.timeEnd('[ShowNotes] Pass-1 (overview)');

    let overviewText = overviewRes.response.text().trim();
    // Try to extract JSON if wrapped in code fences
    if (overviewText.startsWith('```')) {
      overviewText = overviewText.replace(/```[a-zA-Z]*\n?|```/g, '').trim();
    }

    let chapters: { title: string; first: string }[] = [];
    try {
      chapters = JSON.parse(overviewText);
    } catch (err) {
      console.error('[ShowNotes] Failed to parse overview JSON', err, overviewText);
      throw new Error('Gemini overview pass did not return valid JSON');
    }

    // Map first sentences → timestamps
    const enriched = chapters.map((c) => ({
      title: c.title,
      start: lookupTimestamp(c.first, segments),
    }));

    // Guarantee a chapter close to the real end of the episode
    const realEnd = finalTimestamp(segments);
    const lastMapped = enriched[enriched.length - 1]?.start ?? '00:00';

    const minutes = (mmss: string) => {
      const [m, s] = mmss.split(':').map(Number);
      return m + s / 60;
    };
    if (minutes(realEnd) - minutes(lastMapped) > 5) {
      enriched.push({ title: 'Closing Thoughts', start: realEnd });
    }

    console.log('[ShowNotes] Enriched chapters with timestamps:', enriched);

    // ── PASS 2 : Deep dive with Pro 2.5 ──
    const deepModel = getGeminiModel(MODEL_DEEPDIVE);
    const deepPrompt = generateDeepDivePrompt(plainText, enriched);
    console.time('[ShowNotes] Pass-2 (deep dive)');
    const deepRes = await deepModel.generateContent(deepPrompt);
    console.timeEnd('[ShowNotes] Pass-2 (deep dive)');

    const finalText = deepRes.response.text();
    return finalText;
  } catch (error) {
    console.error('Error generating show notes:', error);
    throw new Error(`Failed to generate show notes: ${error instanceof Error ? error.message : 'Unknown error'}`);
  }
}