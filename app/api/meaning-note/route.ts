import { NextResponse } from "next/server";
import { CLARA_DEFAULT_MAX_TOKENS, CLARA_MODEL } from "../../../lib/claraSystemPrompt";

type MeaningNoteRequest = {
  transcript?: string;
  opener?: string;
  touchpointType?: string;
  memory?: string;
  sourceLabel?: string;
};

type MeaningNoteResponse = {
  meaningNote: string;
  lenses: string[];
  themes: string[];
  confidence: "low" | "medium" | "high";
};

const MEANING_NOTE_SYSTEM_PROMPT = `
You generate Meaning Notes for Whyld World.

This is separate from Clara's live conversation. Do not continue the conversation.
Read the conversation and extract one small piece of saved meaning.

Return only JSON with this exact shape:
{
  "meaningNote": "...",
  "lenses": ["..."],
  "themes": ["..."],
  "confidence": "low | medium | high"
}

Rules:
- meaningNote should be plain, human, and specific
- do not sound like therapy or coaching
- do not overstate
- use "seems" or "might" when uncertain
- do not mention "the user"
- do not summarize everything
- choose one useful note that could help form a map over time
- lenses are broad human lenses like family, work, service, leadership, energy, creativity, belonging, grief, presence, boundaries, growth
- themes are concrete recurring subjects from the conversation
- confidence should be low if the conversation is short or ambiguous

Good examples:
{
  "meaningNote": "Coaching seems to be one of the places where you serve, lead, and connect with your kids.",
  "lenses": ["service", "leadership", "family"],
  "themes": ["coaching", "kids", "team culture"],
  "confidence": "high"
}

{
  "meaningNote": "Work keeps showing up as something that drains energy and asks for clearer boundaries.",
  "lenses": ["work", "energy", "boundaries"],
  "themes": ["work stress", "drained energy"],
  "confidence": "medium"
}

{
  "meaningNote": "Family time seems to give you a kind of energy that lasts beyond the moment.",
  "lenses": ["family", "energy", "presence"],
  "themes": ["family time", "lasting energy"],
  "confidence": "medium"
}
`.trim();

export async function POST(request: Request) {
  const apiKey = process.env.OPENAI_API_KEY;

  if (!apiKey) {
    return NextResponse.json({ error: "OPENAI_API_KEY is not configured" }, { status: 503 });
  }

  const body = (await request.json()) as MeaningNoteRequest;
  const userPrompt = JSON.stringify(
    {
      task: "Generate one Meaning Note from this completed Clara conversation.",
      opener: body.opener?.trim() ?? "",
      touchpointType: body.touchpointType?.trim() ?? "daily_check_in",
      sourceLabel: body.sourceLabel?.trim() ?? "",
      memory: body.memory?.trim() ?? "",
      transcript: body.transcript?.trim() ?? ""
    },
    null,
    2
  );

  try {
    const response = await fetch("https://api.openai.com/v1/responses", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${apiKey}`,
        "Content-Type": "application/json"
      },
      body: JSON.stringify({
        model: CLARA_MODEL,
        input: [
          {
            role: "system",
            content: MEANING_NOTE_SYSTEM_PROMPT
          },
          {
            role: "user",
            content: userPrompt
          }
        ],
        temperature: 0.35,
        max_output_tokens: Math.max(240, CLARA_DEFAULT_MAX_TOKENS)
      })
    });

    if (!response.ok) {
      const errorText = await response.text();
      return NextResponse.json(
        {
          error: "OpenAI request failed",
          detail: safeErrorDetail(errorText)
        },
        { status: 502 }
      );
    }

    const data = await response.json();
    const parsed = parseMeaningNote(extractResponseText(data));

    if (!parsed) {
      return NextResponse.json({ error: "Meaning Note response was not valid JSON" }, { status: 502 });
    }

    return NextResponse.json(parsed);
  } catch (error) {
    return NextResponse.json(
      {
        error: "Meaning Note route error",
        detail: error instanceof Error ? error.message : "Unknown error"
      },
      { status: 500 }
    );
  }
}

function parseMeaningNote(text: string): MeaningNoteResponse | null {
  const cleaned = text
    .trim()
    .replace(/^```json\s*/i, "")
    .replace(/^```\s*/i, "")
    .replace(/```$/i, "")
    .trim();

  try {
    const parsed = JSON.parse(cleaned) as unknown;

    if (!isRecord(parsed) || typeof parsed.meaningNote !== "string") return null;

    return {
      meaningNote: parsed.meaningNote.trim(),
      lenses: cleanStringList(parsed.lenses).slice(0, 4),
      themes: cleanStringList(parsed.themes).slice(0, 5),
      confidence:
        parsed.confidence === "low" || parsed.confidence === "medium" || parsed.confidence === "high"
          ? parsed.confidence
          : "medium"
    };
  } catch {
    return null;
  }
}

function extractResponseText(data: unknown) {
  if (!isRecord(data)) return "";

  if (typeof data.output_text === "string") {
    return data.output_text;
  }

  const output = data.output;
  if (!Array.isArray(output)) return "";

  for (const item of output) {
    if (!isRecord(item) || !Array.isArray(item.content)) continue;

    for (const content of item.content) {
      if (isRecord(content) && typeof content.text === "string") {
        return content.text;
      }
    }
  }

  return "";
}

function cleanStringList(value: unknown) {
  return Array.isArray(value)
    ? Array.from(new Set(value.filter((item): item is string => typeof item === "string").map((item) => item.trim()).filter(Boolean)))
    : [];
}

function safeErrorDetail(text: string) {
  return text.replace(/sk-[A-Za-z0-9_-]+/g, "sk-redacted").slice(0, 700);
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null;
}
