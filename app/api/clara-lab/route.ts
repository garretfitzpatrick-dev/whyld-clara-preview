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
  const responseGuidance = buildResponseGuidance(transcript);
  const userPrompt = buildLabUserPrompt({ transcript, opener, memory, depth, responseGuidance });
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
  depth,
  responseGuidance
}: Pick<Required<LabRequest>, "transcript" | "opener" | "memory" | "depth"> & {
  responseGuidance: ResponseGuidance;
}) {
  return JSON.stringify(
    {
      task: "Write Clara's next response. Do not run extraction. Read the transcript for meaning and respond as Clara.",
      opener,
      memory,
      depth,
      responseGuidance,
      transcript
    },
    null,
    2
  );
}

type ResponseMove = "reflect_only" | "gentle_question" | "witness" | "save" | "close" | "continue";

type ResponseGuidance = {
  suggestedMove: ResponseMove;
  latestUserText: string;
  seriousLifeEvent: boolean;
  continueRequested: boolean;
  recentQuestionLedReplies: number;
  instructions: string[];
};

function buildResponseGuidance(transcript: string): ResponseGuidance {
  const latestUserText = latestUserLine(transcript);
  const seriousLifeEvent = isSeriousLifeEvent(latestUserText);
  const continueRequested = isContinueSignal(latestUserText);
  const recentQuestionLedReplies = countRecentQuestionLedClaraReplies(transcript);
  const instructions: string[] = [
    "Use one of these response moves: reflect_only, gentle_question, witness, save, close, continue.",
    "Do not ask more than two question-led Clara responses in a row.",
    "A response may have no question."
  ];
  let suggestedMove: ResponseMove = "gentle_question";

  if (seriousLifeEvent) {
    suggestedMove = "witness";
    instructions.push(
      "Serious life event detected. Respond with immediate warmth and gravity.",
      "Do not use generic flow-control language.",
      "Do not ask whether the user wants to stay with this.",
      "Do not rush to save or close."
    );
  } else if (continueRequested) {
    suggestedMove = "continue";
    instructions.push(
      "The user asked to continue. Do not save or close.",
      "Continue the same thread with one grounded response."
    );
  } else if (recentQuestionLedReplies >= 2) {
    suggestedMove = "reflect_only";
    instructions.push("The last Clara replies were question-led. Prefer a reflective response with no question.");
  }

  return {
    suggestedMove,
    latestUserText,
    seriousLifeEvent,
    continueRequested,
    recentQuestionLedReplies,
    instructions
  };
}

function latestUserLine(transcript: string) {
  const line = transcript
    .split("\n")
    .reverse()
    .find((item) => item.trim().toLowerCase().startsWith("user:"));

  return line?.replace(/^user:\s*/i, "").trim() ?? "";
}

function countRecentQuestionLedClaraReplies(transcript: string) {
  const claraLines = transcript
    .split("\n")
    .map((line) => line.trim())
    .filter((line) => line.toLowerCase().startsWith("clara:"))
    .map((line) => line.replace(/^clara:\s*/i, "").trim());

  let count = 0;

  for (const line of claraLines.reverse()) {
    if (line.endsWith("?")) {
      count += 1;
      continue;
    }

    break;
  }

  return count;
}

function isContinueSignal(text: string) {
  return ["keep going", "continue", "say more", "go deeper"].includes(text.trim().toLowerCase());
}

function isSeriousLifeEvent(text: string) {
  const lower = text.toLowerCase();
  return (
    /\b(dying|died|death|dead|grief|grieving|funeral|hospice|terminal)\b/.test(lower) ||
    /\b(cancer|stroke|heart attack|very sick|seriously ill|terrible news)\b/.test(lower) ||
    /\b(father-in-law|mother-in-law|dad|mom|father|mother|parent|spouse|partner|child|friend)\b.*\b(dying|cancer|very sick|terminal|hospice)\b/.test(
      lower
    ) ||
    /\b(dying|cancer|very sick|terminal|hospice)\b.*\b(father-in-law|mother-in-law|dad|mom|father|mother|parent|spouse|partner|child|friend)\b/.test(
      lower
    )
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
