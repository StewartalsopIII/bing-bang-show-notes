import { GoogleGenerativeAI, HarmCategory, HarmBlockThreshold } from '@google/generative-ai';

// Initialize the Google Generative AI with your API key
const getGeminiAPI = () => {
  const apiKey = process.env.NEXT_PUBLIC_GEMINI_API_KEY;
  
  if (!apiKey) {
    throw new Error('NEXT_PUBLIC_GEMINI_API_KEY is not defined');
  }
  
  return new GoogleGenerativeAI(apiKey);
};

// Define the prompt for generating show notes
const generateShowNotesPrompt = (transcript: string) => {
  return `
You are an elite podcast show-note writer for "Crazy Wisdom".

STYLE & TONE
-------------
Follow the style and tone of the example below.  
• Write in the first-person voice of the host, Stewart Alsop ("I, Stewart Alsop, ...").  
• Mention the guest(s) and the show name in the very first sentence.  
• After the introduction, include the call-to-action line:  
  "Check out this GPT we trained on the conversation!"  
• Do NOT add a separate H1 title; start directly with the intro sentence.  
• Use simple section names ("Timestamps", "Key Insights", "Contact Information") with no "Introduction" header.  

<<<EXAMPLE (do NOT copy; imitate style)>>>
On this episode of Crazy Wisdom, I, Stewart Alsop, spoke with Neil Davies, creator of the Extelligencer project, about survival strategies in what he calls the "Dark Forest" of modern civilization — a world shaped by cryptographic trust, intelligence-immune system fusion, and the crumbling authority of legacy institutions. Listeners can find Neil on Twitter as @sigilante and explore more about his work in the Extelligencer substack.

Timestamps
00:00 Introduction of Neil Davies and the Extelligencer project, setting the stage with Dark Forest theory and operational survival concepts.
05:00 Expansion on Dark Forest as a metaphor for Internet-age exposure, with examples like scam evolution, parasites, and the vulnerability of modern systems.
10:00 Discussion of immune-intelligence fusion ...
... (example truncated) ...

Key Insights
The "Dark Forest" is not just a cosmological metaphor, but a description of modern civilization's hidden dangers. ...
Immune function and intelligence have fused ...
... (example truncated) ...

Contact Information
• Neil Davies – Twitter @sigilante
• Extelligencer Substack – https://extelligencer.substack.com
<<<END EXAMPLE>>>

WHAT TO DELIVER
---------------
1. Intro paragraph — 2–3 sentences in the same first-person style.
2. The exact CTA line: "Check out this GPT we trained on the conversation!"
3. Section: "Timestamps"  
   • 6–10 entries formatted as "MM:SS Description ..." (no bullets).  
   • Use real timestamps if present; otherwise make reasonable estimates.
4. Section: "Key Insights"  
   • 5–8 insights. Start each insight with a bolded short heading followed by a 2–4 sentence explanation.
5. Section: "Contact Information"  
   • Bullet list of any handles, links, or company names mentioned.  
   • If none found, write "Not provided in transcript."

Markdown is allowed, but keep it lightweight (plain lines for timestamps; bullets only in Contact Information).  
Do NOT add any additional commentary before or after the show notes.

TRANSCRIPT
----------
${transcript}
`;
};

// Generate show notes using Gemini API
export async function generateShowNotes(transcript: string): Promise<string> {
  try {
    // 1. Basic size metrics
    console.log('[ShowNotes] Transcript length:', transcript.length, 'chars');
    const approxTokens = Math.ceil(transcript.length / 4);
    console.log('[ShowNotes] Approx token count:', approxTokens);
    
    // 2. SRT format detection
    const srtPattern = /\d+\n(\d{2}:\d{2}:\d{2},\d{3}) --> (\d{2}:\d{2}:\d{2},\d{3})/g;
    const srtMatches = [...transcript.matchAll(srtPattern)];
    console.log('[ShowNotes] SRT timestamps found:', srtMatches.length);
    
    // 3. Sample actual timestamps (first 3 and last 3)
    if (srtMatches.length > 0) {
      const firstThree = srtMatches.slice(0, 3).map(m => m[1]);
      const lastThree = srtMatches.slice(-3).map(m => m[1]);
      console.log('[ShowNotes] First timestamps:', firstThree);
      console.log('[ShowNotes] Last timestamps:', lastThree);
    }
    
    // 4. Check if we're sending the full transcript 
    // (show first 100 chars and last 100 chars)
    console.log('[ShowNotes] Start of transcript:\n', transcript.slice(0, 100));
    console.log('[ShowNotes] End of transcript:\n', transcript.slice(-100));
    
    // Original processing continues...
    const genAI = getGeminiAPI();
    const model = genAI.getGenerativeModel({
      model: "gemini-1.5-pro",
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
    
    // 5. Log the actual prompt we're sending
    const prompt = generateShowNotesPrompt(transcript);
    console.log('[ShowNotes] Prompt instructions (first 300 chars):\n', prompt.slice(0, 300));
    
    // 6. Time the API call
    console.time('[ShowNotes] Gemini API call');
    const result = await model.generateContent(prompt);
    console.timeEnd('[ShowNotes] Gemini API call');
    
    const text = result.response.text();
    
    // 7. Log the generated timestamp section for direct examination
    const timestampSection = text.match(/## TIMESTAMPS\s+([\s\S]+?)(?=##|$)/)?.[1]?.trim();
    console.log('[ShowNotes] Generated TIMESTAMPS section:\n', timestampSection || '<<not found>>');
    
    return text;
  } catch (error) {
    console.error('Error generating show notes:', error);
    throw new Error(`Failed to generate show notes: ${error instanceof Error ? error.message : 'Unknown error'}`);
  }
}