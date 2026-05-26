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
  routeClassification?: RouteClassificationPayload;
  decisionFrame?: DecisionFramePayload;
  decisionFrameUpdate?: DecisionFrameUpdatePayload;
  model?: string;
  temperature?: number;
  maxTokens?: number;
};

type RouteClassificationPayload = {
  route?: string;
  confidence?: number;
  reason?: string;
  suggestedArtifactType?: string | null;
  suggestedMode?: string;
};

type DecisionFramePayload = {
  question?: string;
  decisionType?: string;
  status?: string;
  stage?: string;
  currentDecisionMode?: string;
  frameSummary?: string;
  threads?: string[];
  criteria?: string[];
  tradeoffs?: string[];
  knowns?: string[];
  unknowns?: string[];
  possiblePaths?: string[];
  optionNotes?: string[];
  comparisonNotes?: string[];
  researchQuestions?: string[];
  researchTasks?: ResearchTaskPayload[];
  currentFocus?: string | null;
  nextStep?: string | null;
};

type ResearchTaskPayload = {
  id?: string;
  question?: string;
  status?: string;
  notes?: string;
};

type DecisionFrameUpdatePayload = {
  threads?: string[];
  criteria?: string[];
  tradeoffs?: string[];
  knowns?: string[];
  unknowns?: string[];
  possiblePaths?: string[];
  optionNotes?: string[];
  comparisonNotes?: string[];
  researchQuestions?: string[];
  researchTasks?: ResearchTaskPayload[];
  currentFocus?: string | null;
  nextStep?: string | null;
  frameSummary?: string | null;
  stage?: string | null;
  currentDecisionMode?: string | null;
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
  const routeClassification = isRouteClassificationPayload(body.routeClassification) ? body.routeClassification : null;
  const decisionFrame = isDecisionFramePayload(body.decisionFrame) ? body.decisionFrame : null;
  const decisionFrameUpdate = isDecisionFrameUpdatePayload(body.decisionFrameUpdate) ? body.decisionFrameUpdate : null;
  const model = body.model?.trim() || CLARA_MODEL;
  const temperature = clampNumber(body.temperature, 0, 2, CLARA_DEFAULT_TEMPERATURE);
  const maxTokens = Math.round(clampNumber(body.maxTokens, 40, 800, CLARA_DEFAULT_MAX_TOKENS));
  const responseGuidance = buildResponseGuidance(transcript, userIntent, depth, memory, decisionFrame, routeClassification);
  const userPrompt = buildLabUserPrompt({
    task,
    transcript,
    opener,
    memory,
    depth,
    responseGuidance,
    routeClassification,
    decisionFrame,
    decisionFrameUpdate
  });
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
  routeClassification,
  decisionFrame,
  decisionFrameUpdate
}: Pick<Required<LabRequest>, "task" | "transcript" | "opener" | "memory" | "depth"> & {
  responseGuidance: ResponseGuidance;
  routeClassification: RouteClassificationPayload | null;
  decisionFrame: DecisionFramePayload | null;
  decisionFrameUpdate: DecisionFrameUpdatePayload | null;
}) {
  return JSON.stringify(
    {
      task,
      opener,
      memory,
      depth,
      responseGuidance,
      routeClassification,
      decisionFrame,
      decisionFrameUpdate,
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
  | "explicit_stop"
  | "confirm"
  | "save"
  | "ambiguous_response";

type ResponseMove =
  | "reflect_only"
  | "gentle_question"
  | "witness"
  | "save"
  | "close"
  | "continue"
  | "frame_decision"
  | "action_plan";

type ResponseGuidance = {
  suggestedMove: ResponseMove;
  latestUserText: string;
  userIntent: UserIntent;
  seriousLifeEvent: boolean;
  decisionMoment: boolean;
  route?: string;
  continueRequested: boolean;
  recentQuestionLedReplies: number;
  instructions: string[];
};

function buildResponseGuidance(
  transcript: string,
  userIntent: UserIntent,
  depth: string,
  memory: string,
  decisionFrame: DecisionFramePayload | null,
  routeClassification: RouteClassificationPayload | null
): ResponseGuidance {
  const latestUserText = latestUserLine(transcript);
  const seriousLifeEvent = isSeriousLifeEvent(latestUserText);
  const route = routeClassification?.route;
  const decisionMoment =
    route === "decision_frame" ||
    decisionFrame !== null ||
    isDecisionMoment(latestUserText) ||
    memory.toLowerCase().includes("decision frame v1");
  const decisionMode = decisionFrame?.currentDecisionMode;
  const continueRequested = userIntent === "explicit_continue" || isContinueSignal(latestUserText);
  const responsibilityActionRequested =
    route === "responsibility_safety" &&
    (isResponsibilityActionRequest(latestUserText) ||
      routeClassification?.suggestedMode === "action_plan" ||
      memory.toLowerCase().includes("responsibility plan in progress"));
  const recentQuestionLedReplies = countRecentQuestionLedClaraReplies(transcript);
  const instructions: string[] = [
    "Use one of these response moves: reflect_only, gentle_question, witness, save, close, continue, frame_decision, action_plan.",
    "Do not ask more than two question-led Clara responses in a row.",
    "A response may have no question.",
    `Detected userIntent: ${userIntent}. Use it as conversational pragmatics, not user-facing text.`
  ];
  let suggestedMove: ResponseMove = "gentle_question";

  if (userIntent === "polite_close" || userIntent === "explicit_stop") {
    suggestedMove = "close";
    instructions.push("The user is closing. Respond briefly and do not ask another reflective question.");
  } else if (userIntent === "save") {
    suggestedMove = "save";
    instructions.push("The user confirmed saving. Acknowledge briefly and do not add a new reflective question.");
  } else if (userIntent === "ambiguous_response") {
    suggestedMove = "gentle_question";
    instructions.push("The user gave an ambiguous yes/no answer to a choice. Clarify the choice plainly.");
  } else if (route === "support_witness" || seriousLifeEvent) {
    suggestedMove = "witness";
    instructions.push(
      "Serious life event detected. Respond with immediate warmth and gravity.",
      "Do not use generic flow-control language.",
      "Do not ask whether the user wants to stay with this.",
      "Do not rush to save or close."
    );
  } else if (route === "responsibility_safety") {
    suggestedMove = responsibilityActionRequested ? "action_plan" : "gentle_question";
    instructions.push(
      "High-level route: responsibility_safety.",
      "The user likely needs to act responsibly around safety, duty-of-care, misconduct, bullying, harassment, or wellbeing.",
      "Be calm and concrete. Prioritize immediate safety, documentation, policy review, appropriate escalation, and not handling serious issues alone.",
      "Do not turn this into a meaning reflection.",
      "Ask at most one clarifying question before giving a next-step plan unless truly critical facts are missing.",
      responsibilityActionRequested
        ? "Use action-plan mode now: do not ask another reflective question first. Give a short concrete sequence, then stop with one practical offer such as drafting the message, making a checklist, or saving the plan."
        : "If there is enough context to act responsibly, move to a short next-step sequence instead of another subjective question.",
      "Good offers after the plan: 'Want help drafting the message?', 'Want to turn this into a checklist?', or 'Want to save this as the plan?'",
      "Avoid questions like 'What feels heaviest?', 'What are you hoping for?', 'Would that put you in a tough spot?', or 'Are you hoping for guidance?'",
      "Include concise boundaries when relevant: follow the organization policy, do not investigate alone if serious harm/threats/abuse/ongoing danger are involved, involve appropriate leadership/safeguarding/authorities if risk is immediate or severe, and Clara is not a lawyer or investigator."
    );
  } else if (route === "orientation") {
    suggestedMove = "gentle_question";
    instructions.push(
      "High-level route: orientation.",
      "The user likely needs to orient before entering something.",
      "Help clarify purpose, role, tone, and one thing to protect. Keep it brief and practical."
    );
  } else if (route === "quest_goal") {
    suggestedMove = "gentle_question";
    instructions.push(
      "High-level route: quest_goal.",
      "The user likely wants to turn meaning into practice, a habit, or a growth thread.",
      "Help make the aspiration concrete without overbuilding a full plan."
    );
  } else if (route === "unclear") {
    suggestedMove = "gentle_question";
    instructions.push(
      "High-level route: unclear.",
      "Ask one simple routing question: whether they want to reflect, think it through, or figure out what to do next."
    );
  } else if (decisionMoment) {
    suggestedMove = "frame_decision";
    instructions.push(
      ...[
      "Decision/framing moment detected. Do not decide for the user.",
      "Briefly acknowledge the human weight of the question.",
      "Name the structure of the decision in plain language.",
      "Identify 2-4 pieces of what's involved, what matters, tensions, unknowns, or time horizons.",
      "Make the response feel like the shared frame is being assembled.",
      "If the latest reply added to the frame, acknowledge where it belongs: what's involved, tensions, what matters, what seems clear, what is still unknown, or next honest step.",
      "Use this rhythm: say what the user added to the frame, briefly say why it matters, then ask the next useful question or offer to pause.",
      "Use progress feedback such as 'I'd put that under what matters,' 'That seems like one of the big tensions,' or 'That gives the frame a clearer shape.'",
      "If the frame is in next_step stage, help name one small next honest step instead of asking more broad questions.",
      "Decision-thinking modes are available: reflect clarifies what matters; map names possible paths; research names facts and unknowns; compare puts paths against criteria; act identifies one next honest step.",
      decisionMode ? `Current decision-thinking mode: ${decisionMode}. Use that kind of thinking for this response.` : "",
      decisionMode === "map"
        ? "Map mode: help name possible paths or options. If the user asks for ideas, offer a bounded set as possibilities, not advice."
        : "",
      decisionMode === "research"
        ? "Research mode: focus on factual unknowns, research questions, sources to check, and a short research checklist. Do not ask subjective reflection questions unless needed."
        : "",
      decisionMode === "compare"
        ? "Compare mode: compare paths against what matters. Do not score, rank, or recommend."
        : "",
      decisionMode === "act" ? "Act mode: help name one small next honest step that creates more clarity." : "",
      asksForDecisionIdeas(latestUserText)
        ? "The user is asking for ideas/options/research. Shift toward Map or Research, not another feelings-based question."
        : "",
      asksForResearchHelp(latestUserText)
        ? "The user is asking whether Clara can research or what facts are needed. Clara cannot do live web research yet; help prepare the research list and suggest sources or questions to check."
        : "",
      "Progress feedback should be concrete: 'I'm adding that under What we still don't know,' 'That belongs under Tensions,' 'That gives us a possible path,' 'That sounds like a research question,' or 'This may need facts, not more reflection.'",
      "Ask which thread the user wants to look at first.",
      "Tie the question to one visible part of the frame.",
      "Do not become a pros/cons bot, force a matrix, sound like a consultant, or recommend an option.",
      "Avoid phrases like decision analysis, optimization, weighted criteria, matrix, or score."
      ].filter(Boolean)
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
  } else if (userIntent === "confirm") {
    suggestedMove = decisionMoment ? "frame_decision" : "continue";
    instructions.push("The user confirmed Clara's framing. Continue from that frame instead of closing.");
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
    route,
    continueRequested,
    recentQuestionLedReplies,
    instructions
  };
}

function isDecisionFramePayload(value: unknown): value is DecisionFramePayload {
  return (
    typeof value === "object" &&
    value !== null &&
    ("question" in value ||
      "decisionType" in value ||
      "stage" in value ||
      "currentDecisionMode" in value ||
      "frameSummary" in value ||
      "threads" in value ||
      "criteria" in value ||
      "tradeoffs" in value ||
      "possiblePaths" in value ||
      "optionNotes" in value ||
      "comparisonNotes" in value ||
      "researchQuestions" in value ||
      "researchTasks" in value)
  );
}

function isRouteClassificationPayload(value: unknown): value is RouteClassificationPayload {
  return typeof value === "object" && value !== null && "route" in value;
}

function isDecisionFrameUpdatePayload(value: unknown): value is DecisionFrameUpdatePayload {
  return (
    typeof value === "object" &&
    value !== null &&
    ("threads" in value ||
      "criteria" in value ||
      "tradeoffs" in value ||
      "knowns" in value ||
      "unknowns" in value ||
      "possiblePaths" in value ||
      "optionNotes" in value ||
      "comparisonNotes" in value ||
      "researchQuestions" in value ||
      "researchTasks" in value ||
      "currentFocus" in value ||
      "nextStep" in value ||
      "frameSummary" in value ||
      "stage" in value ||
      "currentDecisionMode" in value)
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
    value === "explicit_stop" ||
    value === "confirm" ||
    value === "save" ||
    value === "ambiguous_response"
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
  return ["keep going", "continue", "say more", "go deeper", "keep working it"].includes(text.trim().toLowerCase());
}

function asksForDecisionIdeas(text: string) {
  const lower = text.toLowerCase();

  return (
    /\bi don'?t know\b/.test(lower) ||
    /\bdo you have any ideas\b/.test(lower) ||
    /\bwhat are my options\b/.test(lower) ||
    /\bhow would i figure this out\b/.test(lower) ||
    /\bwhat should i research\b/.test(lower) ||
    /\bwhat do i need to find out\b/.test(lower)
  );
}

function asksForResearchHelp(text: string) {
  const lower = text.toLowerCase();

  return (
    /\bcan you research\b/.test(lower) ||
    /\bcan you do the research\b/.test(lower) ||
    /\bwhat should i research\b/.test(lower) ||
    /\bhow do i find out\b/.test(lower) ||
    /\bi don'?t know enough\b/.test(lower) ||
    /\bwe need more information\b/.test(lower) ||
    /\bwhat facts do we need\b/.test(lower)
  );
}

function isResponsibilityActionRequest(text: string) {
  const lower = text.toLowerCase();

  return (
    /\bwhat should (i|we) do\b/.test(lower) ||
    /\bwhat should (i|we) do first\b/.test(lower) ||
    /\bwhat do (i|we) do (first|next|now)\b/.test(lower) ||
    /\bi just want to know what (i|we) should do next\b/.test(lower) ||
    /\bdo you have advice\b/.test(lower) ||
    /\bany advice\b/.test(lower) ||
    /\bi need (advice|guidance|to handle this|to deal with this)\b/.test(lower) ||
    /\bi need to (talk to|contact|call|email|message|loop in)\b.*\b(president|director|principal|coach|parent|guardian|hr|admin|leader|supervisor)\b/.test(
      lower
    )
  );
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
