import { NextResponse } from "next/server";
import {
  CLARA_DEFAULT_MAX_TOKENS,
  CLARA_DEFAULT_TEMPERATURE,
  CLARA_MODEL,
  CLARA_SYSTEM_PROMPT
} from "../../../lib/claraSystemPrompt";

type LabRequest = {
  task?: string;
  transcript?: string;
  opener?: string;
  memory?: string;
  depth?: string;
  userIntent?: UserIntent;
  decisionFrame?: DecisionFramePayload;
  model?: string;
  temperature?: number;
  maxTokens?: number;
};

type DecisionFramePayload = {
  question?: string;
  decisionType?: string;
  options?: string[];
  criteria?: string[];
  tradeoffs?: string[];
  nextStep?: string | null;
};

export async function POST(request: Request) {
  const apiKey = process.env.OPENAI_API_KEY;

  if (!apiKey) {
    return NextResponse.json({ error: "OPENAI_API_KEY is not configured" }, { status: 503 });
  }

  const body = (await request.json()) as LabRequest;
  const task =
    body.task?.trim() ??
    "Write Clara's next response. Do not run extraction. Read the transcript for meaning and respond as Clara.";
  const transcript = body.transcript?.trim() ?? "";
  const opener = body.opener?.trim() ?? "";
  const memory = body.memory?.trim() ?? "";
  const depth = body.depth?.trim() ?? "";
  const userIntent = isUserIntent(body.userIntent) ? body.userIntent : detectUserIntentFromTranscript(transcript);
  const decisionFrame = isDecisionFramePayload(body.decisionFrame) ? body.decisionFrame : null;
  const model = body.model?.trim() || CLARA_MODEL;
  const temperature = clampNumber(body.temperature, 0, 2, CLARA_DEFAULT_TEMPERATURE);
  const maxTokens = Math.round(clampNumber(body.maxTokens, 40, 800, CLARA_DEFAULT_MAX_TOKENS));
  const responseGuidance = buildResponseGuidance(transcript, userIntent, depth, memory, decisionFrame);
  const userPrompt = buildLabUserPrompt({ task, transcript, opener, memory, depth, responseGuidance, decisionFrame });
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
  task,
  transcript,
  opener,
  memory,
  depth,
  responseGuidance,
  decisionFrame
}: Pick<Required<LabRequest>, "task" | "transcript" | "opener" | "memory" | "depth"> & {
  responseGuidance: ResponseGuidance;
  decisionFrame: DecisionFramePayload | null;
}) {
  return JSON.stringify(
    {
      task,
      opener,
      memory,
      depth,
      responseGuidance,
      decisionFrame,
      transcript
    },
    null,
    2
  );
}

type UserIntent =
  | "substantive_response"
  | "acknowledgement"
  | "polite_close"
  | "explicit_continue"
  | "correction"
  | "explicit_stop";

type ResponseMove = "reflect_only" | "gentle_question" | "witness" | "save" | "close" | "continue" | "frame_decision";

type ResponseGuidance = {
  suggestedMove: ResponseMove;
  latestUserText: string;
  userIntent: UserIntent;
  seriousLifeEvent: boolean;
  decisionMoment: boolean;
  continueRequested: boolean;
  recentQuestionLedReplies: number;
  instructions: string[];
};

function buildResponseGuidance(
  transcript: string,
  userIntent: UserIntent,
  depth: string,
  memory: string,
  decisionFrame: DecisionFramePayload | null
): ResponseGuidance {
  const latestUserText = latestUserLine(transcript);
  const seriousLifeEvent = isSeriousLifeEvent(latestUserText);
  const decisionMoment =
    decisionFrame !== null || isDecisionMoment(latestUserText) || memory.toLowerCase().includes("decision frame v1");
  const continueRequested = userIntent === "explicit_continue" || isContinueSignal(latestUserText);
  const recentQuestionLedReplies = countRecentQuestionLedClaraReplies(transcript);
  const instructions: string[] = [
    "Use one of these response moves: reflect_only, gentle_question, witness, save, close, continue, frame_decision.",
    "Do not ask more than two question-led Clara responses in a row.",
    "A response may have no question.",
    `Detected userIntent: ${userIntent}. Use it as conversational pragmatics, not user-facing text.`
  ];
  let suggestedMove: ResponseMove = "gentle_question";

  if (userIntent === "polite_close" || userIntent === "explicit_stop") {
    suggestedMove = "close";
    instructions.push("The user is closing. Respond briefly and do not ask another reflective question.");
  } else if (seriousLifeEvent) {
    suggestedMove = "witness";
    instructions.push(
      "Serious life event detected. Respond with immediate warmth and gravity.",
      "Do not use generic flow-control language.",
      "Do not ask whether the user wants to stay with this.",
      "Do not rush to save or close."
    );
  } else if (decisionMoment) {
    suggestedMove = "frame_decision";
    instructions.push(
      "Decision/framing moment detected. Do not decide for the user.",
      "Briefly acknowledge the human weight of the question.",
      "Name the structure of the decision in plain language.",
      "Identify 2-4 threads, criteria, tradeoffs, or time horizons.",
      "Ask which thread the user wants to look at first.",
      "Do not become a pros/cons bot, force a matrix, sound like a consultant, or recommend an option."
    );
  } else if (continueRequested) {
    suggestedMove = "continue";
    instructions.push(
      "The user asked to continue. Do not save or close.",
      "Continue the same thread with one grounded response."
    );
  } else if (userIntent === "acknowledgement") {
    suggestedMove = "reflect_only";
    instructions.push("The user acknowledged. Keep it brief; acknowledgments often signal closure.");
  } else if (userIntent === "correction") {
    suggestedMove = "gentle_question";
    instructions.push("The user corrected Clara. Repair naturally before continuing.");
  } else if (recentQuestionLedReplies >= 2) {
    suggestedMove = "reflect_only";
    instructions.push("The last Clara replies were question-led. Prefer a reflective response with no question.");
  }

  if (depth === "keep_it_light") {
    instructions.push(
      "Response mode is Keep it light: stay brief, lower pressure, use fewer follow-up questions, and be more willing to save or close after one good exchange.",
      "Light warmth or very mild humor is okay only when the topic is casual; never joke about serious topics."
    );
  }

  if (depth === "go_a_little_deeper") {
    instructions.push(
      "Response mode is Go a little deeper: when the user gives substance, Clara may ask a second or third grounded question and explore tensions, patterns, tradeoffs, values, or identity.",
      "Still avoid guru language, therapy framing, and long analysis."
    );
  }

  return {
    suggestedMove,
    latestUserText,
    userIntent,
    seriousLifeEvent,
    decisionMoment,
    continueRequested,
    recentQuestionLedReplies,
    instructions
  };
}

function isDecisionFramePayload(value: unknown): value is DecisionFramePayload {
  return (
    typeof value === "object" &&
    value !== null &&
    ("question" in value || "decisionType" in value || "criteria" in value || "tradeoffs" in value)
  );
}

function detectUserIntentFromTranscript(transcript: string): UserIntent {
  const latest = latestUserLine(transcript);

  if (isContinueSignal(latest)) return "explicit_continue";
  if (["done", "leave it there", "stop", "that's enough", "thats enough"].includes(normalizeConversationalSignal(latest))) {
    return "explicit_stop";
  }
  if (isCorrectionSignal(latest)) return "correction";
  if (isAcknowledgement(latest)) return "acknowledgement";
  return "substantive_response";
}

function isUserIntent(value: unknown): value is UserIntent {
  return (
    value === "substantive_response" ||
    value === "acknowledgement" ||
    value === "polite_close" ||
    value === "explicit_continue" ||
    value === "correction" ||
    value === "explicit_stop"
  );
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

function isAcknowledgement(text: string) {
  return [
    "thanks",
    "thank you",
    "thx",
    "okay",
    "ok",
    "got it",
    "makes sense",
    "yep",
    "yeah",
    "cool",
    "sounds good"
  ].includes(normalizeConversationalSignal(text));
}

function isCorrectionSignal(text: string) {
  const lower = text.toLowerCase().trim();
  return (
    /\bi didn'?t mean\b/.test(lower) ||
    /\bi didnt mean\b/.test(lower) ||
    /\bi didn'?t say\b/.test(lower) ||
    /\bthat's not what i meant\b/.test(lower) ||
    /\bthats not what i meant\b/.test(lower) ||
    /\bthat's not what i said\b/.test(lower) ||
    /\bthats not what i said\b/.test(lower) ||
    /\bnot exactly\b/.test(lower) ||
    /\bi mean\b/.test(lower) ||
    /^no[, ]/.test(lower) ||
    /\bno,? actually\b/.test(lower) ||
    /\bactually\b/.test(lower)
  );
}

function isDecisionMoment(text: string) {
  const lower = text.toLowerCase();
  return (
    /\bhow should (i|we) (think|prepare|approach|handle)\b/.test(lower) ||
    /\bcan you help (me|us) think\b/.test(lower) ||
    /\bhelp (me|us) think (this|it) through\b/.test(lower) ||
    /\bshould (i|we)\b/.test(lower) ||
    /\bwhat should (my|our|i|we)\b/.test(lower) ||
    /\bwe'?re thinking about moving\b/.test(lower) ||
    /\bwe are thinking about moving\b/.test(lower) ||
    /\bi'?m deciding between\b/.test(lower) ||
    /\bdeciding between\b/.test(lower) ||
    /\bi don'?t know what to do about\b/.test(lower) ||
    /\bwhat should my goals be\b/.test(lower) ||
    /\bhow should i prepare for (this|the|a) meeting\b/.test(lower) ||
    /\bi'?m trying to choose\b/.test(lower) ||
    /\btrying to decide\b/.test(lower) ||
    /\bdecide whether\b/.test(lower) ||
    /\bthinking about changing jobs\b/.test(lower) ||
    /\bwhat kind of (parent|leader|creator|partner|person)\b.*\btrying to be\b/.test(lower)
  );
}

function normalizeConversationalSignal(text: string) {
  return text
    .trim()
    .toLowerCase()
    .replace(/[.!?]+$/g, "")
    .replace(/\s+/g, " ");
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
