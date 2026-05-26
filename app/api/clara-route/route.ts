import { NextResponse } from "next/server";
import { CLARA_MODEL } from "../../../lib/claraSystemPrompt";

type ClaraRoute =
  | "meaning_moment"
  | "decision_frame"
  | "responsibility_safety"
  | "orientation"
  | "quest_goal"
  | "support_witness"
  | "unclear";

type ArtifactType =
  | "meaning_note"
  | "decision_frame"
  | "responsibility_frame"
  | "responsibility_plan"
  | "action_checklist"
  | "orientation_note"
  | "quest"
  | "goal_thread"
  | "support_note"
  | null;

type RouteRequest = {
  userText?: string;
  transcript?: string;
  opener?: string;
  memory?: string;
  currentRoute?: string;
};

type RouteClassification = {
  route: ClaraRoute;
  confidence: number;
  reason: string;
  suggestedArtifactType: ArtifactType;
  suggestedMode: string;
};

const ROUTE_SYSTEM_PROMPT = `
You classify what kind of help Clara should offer next.

Return only JSON:
{
  "route": "meaning_moment" | "decision_frame" | "responsibility_safety" | "orientation" | "quest_goal" | "support_witness" | "unclear",
  "confidence": 0.0-1.0,
  "reason": "brief internal reason",
  "suggestedArtifactType": "meaning_note" | "decision_frame" | "responsibility_frame" | "responsibility_plan" | "action_checklist" | "orientation_note" | "quest" | "goal_thread" | "support_note" | null,
  "suggestedMode": "plain behavior mode"
}

Routes:
- meaning_moment: ordinary experiences, reflections, positive/negative moments, daily check-ins. User need: notice what mattered. Artifact: meaning_note.
- decision_frame: messy choices, tradeoffs, should I/we, how should I think about this, moving/job/school/goals decisions. User need: frame the question. Artifact: decision_frame.
- responsibility_safety: safety, bullying, harassment, duty-of-care, misconduct, child/player/student/employee wellbeing, immediate action responsibility. User need: act responsibly. Artifact: responsibility_plan.
- orientation: preparing for something: meeting, practice, hard conversation, day, transition. User need: orient before entering. Artifact: orientation_note.
- quest_goal: aspirations, goals, habits, becoming, growth challenges. User need: turn meaning into practice. Artifact: quest or goal_thread.
- support_witness: grief, illness, overwhelm, sadness, bad news, emotional heaviness. User need: be met with presence, not pushed into solving. Artifact: usually null.
- unclear: ambiguous. Clara should ask a routing question.

Rules:
- Classify the user need, not just keywords.
- If safety/duty-of-care/wellbeing responsibility is present, prefer responsibility_safety over meaning_moment.
- If the user asks what to do, asks for advice/guidance, or needs a concrete next step in a responsibility_safety situation, use suggestedMode "action_plan".
- If grief, illness, loss, bad news, or emotional heaviness is central, prefer support_witness unless the user clearly asks for action.
- If there is a messy choice or tradeoff about what to do, prefer decision_frame.
- If the user is preparing to enter a situation, prefer orientation.
- If the user is trying to build a practice, habit, or longer growth path, prefer quest_goal.
`.trim();

export async function POST(request: Request) {
  const body = (await request.json()) as RouteRequest;
  const apiKey = process.env.OPENAI_API_KEY;
  const userText = body.userText?.trim() ?? "";
  const fallback = fallbackRoute(userText);

  if (!apiKey) {
    return NextResponse.json({ ...fallback, fallbackUsed: true });
  }

  const prompt = JSON.stringify(
    {
      userText,
      opener: body.opener?.trim() ?? "",
      currentRoute: body.currentRoute?.trim() ?? "",
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
            content: ROUTE_SYSTEM_PROMPT
          },
          {
            role: "user",
            content: prompt
          }
        ],
        temperature: 0.1,
        max_output_tokens: 260
      })
    });

    if (!response.ok) {
      return NextResponse.json({ ...fallback, fallbackUsed: true }, { status: 200 });
    }

    const data = await response.json();
    const parsed = parseRouteClassification(extractResponseText(data));
    return NextResponse.json(parsed ? { ...parsed, fallbackUsed: false } : { ...fallback, fallbackUsed: true });
  } catch {
    return NextResponse.json({ ...fallback, fallbackUsed: true });
  }
}

function parseRouteClassification(text: string): RouteClassification | null {
  try {
    const parsed = JSON.parse(extractJsonObject(text)) as Partial<RouteClassification>;
    if (!isRoute(parsed.route)) return null;
    const metadata = routeMetadata(parsed.route);

    return {
      route: parsed.route,
      confidence: typeof parsed.confidence === "number" ? Math.min(1, Math.max(0, parsed.confidence)) : 0.7,
      reason: typeof parsed.reason === "string" ? parsed.reason : "Model route classification.",
      suggestedArtifactType: isArtifactType(parsed.suggestedArtifactType)
        ? parsed.suggestedArtifactType
        : metadata.suggestedArtifactType,
      suggestedMode: typeof parsed.suggestedMode === "string" ? parsed.suggestedMode : metadata.suggestedMode
    };
  } catch {
    return null;
  }
}

function extractJsonObject(text: string) {
  const trimmed = text.trim();
  if (trimmed.startsWith("{")) return trimmed;

  const start = trimmed.indexOf("{");
  const end = trimmed.lastIndexOf("}");
  return start >= 0 && end > start ? trimmed.slice(start, end + 1) : trimmed;
}

function fallbackRoute(text: string): RouteClassification {
  const lower = text.toLowerCase();

  if (
    /\b(bullying|harassment|abuse|misconduct|unsafe|safety|threat|duty of care|report)\b/.test(lower) ||
    (isResponsibilityActionRequest(text) &&
      /\b(league|president|coach|player|parent|guardian|school|student|principal|hr|employee|policy|safeguarding)\b/.test(lower))
  ) {
    return {
      route: "responsibility_safety",
      confidence: 0.66,
      reason: "Safety or duty-of-care language.",
      ...routeMetadata("responsibility_safety", isResponsibilityActionRequest(text))
    };
  }

  if (/\b(dying|death|grief|cancer|very sick|terrible news|overwhelmed|devastated)\b/.test(lower)) {
    return { route: "support_witness", confidence: 0.66, reason: "Heavy emotional or support-seeking content.", ...routeMetadata("support_witness") };
  }

  if (/\b(should i|should we|deciding|decision|move|moving|change jobs|tradeoff|how should i think)\b/.test(lower)) {
    return { route: "decision_frame", confidence: 0.64, reason: "Decision or tradeoff language.", ...routeMetadata("decision_frame") };
  }

  if (/\b(prepare|before|about to|meeting|practice|hard conversation|show up)\b/.test(lower)) {
    return { route: "orientation", confidence: 0.58, reason: "Preparation or orientation language.", ...routeMetadata("orientation") };
  }

  if (/\b(goal|habit|aspiration|becoming|practice|growth challenge)\b/.test(lower)) {
    return { route: "quest_goal", confidence: 0.58, reason: "Goal or practice language.", ...routeMetadata("quest_goal") };
  }

  if (/\b(not sure what i need|what kind of help|where does this fit)\b/.test(lower)) {
    return { route: "unclear", confidence: 0.5, reason: "Ambiguous user need.", ...routeMetadata("unclear") };
  }

  return { route: "meaning_moment", confidence: 0.6, reason: "Ordinary moment or reflection.", ...routeMetadata("meaning_moment") };
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

function routeMetadata(route: ClaraRoute, actionPlan = false): Pick<RouteClassification, "suggestedArtifactType" | "suggestedMode"> {
  const metadata: Record<ClaraRoute, Pick<RouteClassification, "suggestedArtifactType" | "suggestedMode">> = {
    meaning_moment: { suggestedArtifactType: "meaning_note", suggestedMode: "notice_what_mattered" },
    decision_frame: { suggestedArtifactType: "decision_frame", suggestedMode: "frame_decision" },
    responsibility_safety: { suggestedArtifactType: "responsibility_plan", suggestedMode: actionPlan ? "action_plan" : "responsible_action" },
    orientation: { suggestedArtifactType: "orientation_note", suggestedMode: "orient_before_entering" },
    quest_goal: { suggestedArtifactType: "goal_thread", suggestedMode: "turn_into_practice" },
    support_witness: { suggestedArtifactType: null, suggestedMode: "witness" },
    unclear: { suggestedArtifactType: null, suggestedMode: "clarify_route" }
  };

  return metadata[route];
}

function isRoute(value: unknown): value is ClaraRoute {
  return (
    value === "meaning_moment" ||
    value === "decision_frame" ||
    value === "responsibility_safety" ||
    value === "orientation" ||
    value === "quest_goal" ||
    value === "support_witness" ||
    value === "unclear"
  );
}

function isArtifactType(value: unknown): value is ArtifactType {
  return (
    value === null ||
    value === "meaning_note" ||
    value === "decision_frame" ||
    value === "responsibility_frame" ||
    value === "responsibility_plan" ||
    value === "action_checklist" ||
    value === "orientation_note" ||
    value === "quest" ||
    value === "goal_thread" ||
    value === "support_note"
  );
}

function extractResponseText(data: unknown) {
  if (!isRecord(data)) return "";

  if (typeof data.output_text === "string") return data.output_text.trim();

  const output = Array.isArray(data.output) ? data.output : [];
  return output
    .flatMap((item) => (isRecord(item) && Array.isArray(item.content) ? item.content : []))
    .map((content) => {
      if (!isRecord(content)) return "";
      if (typeof content.text === "string") return content.text;
      if (typeof content.output_text === "string") return content.output_text;
      return "";
    })
    .join("")
    .trim();
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null;
}
