import { NextResponse } from "next/server";
import {
  CLARA_DEFAULT_MAX_TOKENS,
  CLARA_DEFAULT_TEMPERATURE,
  CLARA_MODEL,
  CLARA_SYSTEM_PROMPT
} from "../../../lib/claraSystemPrompt";

type LabRequest = {
  transcript?: string;
  opener?: string;
  memory?: string;
  depth?: string;
  model?: string;
  temperature?: number;
  maxTokens?: number;
};

export async function POST(request: Request) {
  const apiKey = process.env.OPENAI_API_KEY;

  if (!apiKey) {
    return NextResponse.json({ error: "OPENAI_API_KEY is not configured" }, { status: 503 });
  }

  const body = (await request.json()) as LabRequest;
  const transcript = body.transcript?.trim() ?? "";
  const opener = body.opener?.trim() ?? "";
  const memory = body.memory?.trim() ?? "";
  const depth = body.depth?.trim() ?? "";
  const model = body.model?.trim() || CLARA_MODEL;
  const temperature = clampNumber(body.temperature, 0, 2, CLARA_DEFAULT_TEMPERATURE);
  const maxTokens = Math.round(clampNumber(body.maxTokens, 40, 800, CLARA_DEFAULT_MAX_TOKENS));
  const userPrompt = buildLabUserPrompt({ transcript, opener, memory, depth });
  const debugPrompt = {
    model,
    temperature,
    maxTokens,
    system: CLARA_SYSTEM_PROMPT,
    user: userPrompt
  };

  try {
    const response = await fetch("https://api.openai.com/v1/responses", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${apiKey}`,
        "Content-Type": "application/json"
      },
      body: JSON.stringify({
        model,
        input: [
          {
            role: "system",
            content: CLARA_SYSTEM_PROMPT
          },
          {
            role: "user",
            content: userPrompt
          }
        ],
        temperature,
        max_output_tokens: maxTokens
      })
    });

    if (!response.ok) {
      const errorText = await response.text();
      return NextResponse.json(
        {
          error: "OpenAI request failed",
          detail: safeErrorDetail(errorText),
          debugPrompt,
          responseReceived: null,
          modelUsed: model,
          fallbackUsed: false
        },
        { status: 502 }
      );
    }

    const data = await response.json();
    const text = extractResponseText(data);
    return NextResponse.json({
      text,
      debugPrompt,
      responseReceived: data,
      modelUsed: model,
      fallbackUsed: false
    });
  } catch (error) {
    return NextResponse.json(
      {
        error: "Clara lab route error",
        detail: error instanceof Error ? error.message : "Unknown error",
        debugPrompt,
        responseReceived: null,
        modelUsed: model,
        fallbackUsed: false
      },
      { status: 500 }
    );
  }
}

function clampNumber(value: unknown, min: number, max: number, fallback: number) {
  return typeof value === "number" && Number.isFinite(value) ? Math.min(max, Math.max(min, value)) : fallback;
}

function buildLabUserPrompt({
  transcript,
  opener,
  memory,
  depth
}: Pick<Required<LabRequest>, "transcript" | "opener" | "memory" | "depth">) {
  return JSON.stringify(
    {
      task: "Write Clara's next response. Do not run extraction. Read the transcript for meaning and respond as Clara.",
      opener,
      memory,
      depth,
      transcript
    },
    null,
    2
  );
}

function extractResponseText(data: unknown) {
  if (!isRecord(data)) return "";

  if (typeof data.output_text === "string") {
    return cleanClaraText(data.output_text);
  }

  const output = data.output;
  if (!Array.isArray(output)) return "";

  for (const item of output) {
    if (!isRecord(item) || !Array.isArray(item.content)) continue;

    for (const content of item.content) {
      if (isRecord(content) && typeof content.text === "string") {
        return cleanClaraText(content.text);
      }
    }
  }

  return "";
}

function cleanClaraText(text: string) {
  return text.trim().replace(/^["']|["']$/g, "");
}

function safeErrorDetail(text: string) {
  return text.replace(/sk-[A-Za-z0-9_-]+/g, "sk-redacted").slice(0, 700);
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null;
}
