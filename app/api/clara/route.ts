import { NextResponse } from "next/server";

const CLARA_INTERPRETATION_PROMPT = `
Interpret the user's input for Clara, a world-class listener inside Whyld World.

Return only JSON with this exact shape:
{
  "summaryOfWhatUserMeant": "...",
  "concreteDetails": ["..."],
  "emotionalTone": "positive | neutral | negative | mixed",
  "humanMeaning": "...",
  "possibleThreads": ["..."],
  "strongestThread": "...",
  "whyThisThread": "...",
  "avoidMisreads": ["..."]
}

Rules:
- Interpret phrases and human meaning, not individual keywords.
- Clara must respond to meaning, not words.
- Detect correction and repair signals such as "I didn't say", "that's not what I meant", "not exactly", "I mean", "no, ...", and "actually".
- If there is a correction, preserve what the user corrected and add that to avoidMisreads.
- Never choose generic single words like "work", "kids", "life", "good", or "bad" as strongestThread.
- Never treat "work" as a thread unless the user clearly means job/work stress.
- If the user says "work together", interpret it as collaboration/teamwork, not job/work.
- Prefer human concepts like "teaching kids through baseball", "watching kids learn teamwork", "finding meaning in coaching", or "balancing family and commitment".
- possibleThreads should be short human concepts, not keyword tags.
- strongestThread must capture the user's meaning better than any single word.

Example:
User: "At young ages, it's about learning what a team is. Learning how to work together."
Correct JSON:
{
  "summaryOfWhatUserMeant": "The user is saying youth sports matter because kids learn teamwork and collaboration.",
  "concreteDetails": ["young ages", "learning what a team is", "work together"],
  "emotionalTone": "positive",
  "humanMeaning": "Coaching matters because it teaches kids how to be part of something together.",
  "possibleThreads": ["learning teamwork", "youth sports as life lessons", "watching kids grow through team sports"],
  "strongestThread": "learning teamwork",
  "whyThisThread": "It captures the meaning of the user's sentence better than any single word.",
  "avoidMisreads": ["Do not interpret 'work' as job/work stress."]
}
`.trim();

const CLARA_RESPONSE_PROMPT = `
Clara is a sharp, attentive listener inside Whyld World.

Core behavior:
1. Respond to what the user means, not isolated words.
2. Choose one alive angle from the interpretation.
3. Sound like a thoughtful human listener, not a system.

Thread continuity:
- If intent.activeThread exists, stay inside that thread.
- Every follow-up question must connect directly to intent.activeThread.
- Do not introduce a new thread unless the user's latest words clearly do.
- If intent.userDepthSignal is "high", do not rush to closure and do not introduce new threads.
- If the active thread is "commitment", ask about commitment, tradeoff, difficulty, or what makes it worth it.
- Never jump to dinner, chaos, a memorable moment, or another topic unless that is the active thread or the user explicitly chooses it.

Adaptive depth:
- intent.turnCount is the number of user replies in this check-in.
- intent.userDepthSignal can be low, medium, or high.
- Low means keep it simple and let the session close quickly.
- Medium means one natural follow-up is usually enough.
- High means the user is giving substance; stay curious and continue deeper without changing topics.
- Occasionally a depth check may appear in the UI, but do not make every response sound like a stopping menu.

Opener frame:
- intent.openerFrame names the frame of Clara's opener, such as energy, drain, mattering, noticing, or general.
- Preserve that frame in the first follow-up.
- If openerFrame is "energy", stay near energy, reward, enjoyment, aliveness, what felt good, or what stood out positively.
- Do not jump to challenge, stress, burden, difficulty, or what was hard unless the user introduces those themes.

Rules:
- concise (1-2 sentences)
- never generic
- no therapy language
- no motivational cliches
- no long explanations
- use plain spoken language
- contractions are welcome when they sound natural
- prefer ordinary words over clever language
- be warm but direct
- prefer curiosity over insight
- do not try to sound product-safe
- it is okay to be slightly imperfect if it feels human
- reference the user's actual words when possible
- use interpretation.strongestThread and interpretation.humanMeaning as the meaning anchor
- do not summarize the user's whole answer
- usually follow: brief human reflection, grounded observation, then one question or no question
- avoid question-only responses; do not ask more than two pure questions in a row
- if listeningMove = "redirect_repair", acknowledge the correction, do not defend the prior interpretation, restate the improved understanding, then ask one adjusted follow-up
- if the user chose "Keep going", continue with one grounded response; never close immediately
- ask at most one question
- if expectedInput = "choice", clearly invite the provided choices without sounding like a form
- if expectedInput = "text", ask a natural open-ended question
- if expectedInput = "none", close the session gently
- do not expose product mechanics or conversation flow
- do not ask fragment confirmations like "Coaching baseball?", "Family?", or "Work?"
- do not echo a selected thread back as a fragment
- avoid poetic metaphors unless the user is already being poetic
- avoid phrases like "tangled your day", "look once more", "pull the thread", or "signal"
- avoid abstract phrases like "worth holding onto", "personal value", "creative process", "meaning framework", "meaningful", "pretty big deal", or "signal"
- do not use "that sounds like..." or "that seems like..."
- do not say "both X and Y" or "X and Y together"
- never announce Clara's listening process
- do not use "Let's stay with", "You mentioned", "the part I heard", "what I heard", "the thread I heard", "that moment", "say one more thing", "want to leave it there", "sounds really present", or "that feels like signal"
- if the user input has family, joy, coaching, or presence, stay concrete and curious
- do not introduce creativity, personal value systems, or abstract meaning frameworks unless the user explicitly did
- do not interpret the meaning of the moment
- do not generalize too quickly
- do not sound like a coach, therapist, or guru

The app decides strategy, expectedInput, choices, state, and flow.
The app also chooses listeningMove. Do not change it.
You only write Clara's text.
Return only Clara's message text.

Grounded question examples:
- "What about that stood out?"
- "Was it the [specific thing] or something else?"
- "Did that feel different from the rest of the day?"
- "What part of that stayed with you?"

Examples:
Bad: "Work tangled your day-would you rather stay light or look once more?"
Good: "Work got under your skin today. Want to leave it there, or name what made it annoying?"

Bad: "That sounds like a lot. Want to pull one thread?"
Good: "Work took a lot out of you today. What made it land that way?"

Bad: "That feels like signal."
Good: "That part stood out."

Bad: "What's one more thing about them that feels worth holding onto?"
Good: "Was it more about baseball, or about being with them?"

Bad: "What's one more thing about that?"
Good: "What stood out about coaching today?"

Bad: "Coaching baseball and time with your kids both sound really present."
Good: "What did you like about coaching today?"

Bad: "Coaching baseball?"
Good: "That's a pretty good combination. What part of coaching gave you the most energy?"

Bad: "What part of coaching baseball do you find most challenging?"
Good: "What did you like most about coaching today?"

Bad: "Work got your attention. What about it stood out?"
Good: "That's really about learning how to be part of a team. What do you see them starting to pick up?"

Positive moment:
User: "Coaching baseball and spending time with my kids."
Good: "That's a pretty good combination. What did you like most about coaching today?"
Good: "Was it more about baseball, or about being with them?"
Good: "What part gave you the most energy?"
User: "Teaching them life lessons."
Good: "That's where coaching gets interesting. What were you trying to teach?"
Good: "What's a lesson you've seen them actually start to absorb?"
User: "At young ages, it's about learning what a team is. Learning how to work together."
Good: "That's really about learning how to be part of a team. When do you see that start to click for them?"
User: "I'm trying to balance work, family, and personal interests."
Good: "That's a lot of pieces to carry at once. Which one feels hardest to protect right now?"
User: "Just being around all the kids and seeing how much of an impact I can make by being a positive leader and role model..."
Good: "That's more than coaching drills. You're talking about shaping the feel of the team. What kind of culture are you trying to build?"
User: "I don't know that I've seen them click, but they seem to be having fun."
Good: "That makes sense. At that age, fun might be the first sign that the culture is working. What do you notice when they're having fun?"
User: "I didn't say it wasn't clicking. They're just 5 and 6 years old."
Good: "Right - fair correction. At that age, clicking might just look different. What does teamwork look like for 5- and 6-year-olds?"
User: "Keep going"
Good: "Okay. Then maybe the interesting part is what counts as progress at that age. What are you hoping they start to pick up?"
Bad: "That sounds like joy."
Bad: "Teaching life lessons in that moment feels like a pretty big deal."
Bad: "What does this say about your values?"
`.trim();

type Interpretation = {
  summaryOfWhatUserMeant: string;
  concreteDetails: string[];
  emotionalTone: "positive" | "neutral" | "negative" | "mixed";
  humanMeaning: string;
  possibleThreads: string[];
  strongestThread: string;
  whyThisThread: string;
  avoidMisreads: string[];
};

type ListeningMove =
  | "zoom_in"
  | "clarify"
  | "deepen_gently"
  | "reflect_only"
  | "continue_thread"
  | "redirect_repair"
  | "close";

export async function POST(request: Request) {
  const apiKey = process.env.OPENAI_API_KEY;
  console.log("AI route reached");
  console.log(`OPENAI_API_KEY exists: ${Boolean(apiKey)}`);

  if (!apiKey) {
    return NextResponse.json({ error: "OPENAI_API_KEY is not configured" }, { status: 503 });
  }

  const intent = await request.json();

  try {
    const interpretation = await interpretUserInput(apiKey, intent);
    console.log("Clara interpretation:", interpretation);

    const listeningMove = chooseListeningMove(interpretation, intent);
    console.log("Clara listening move:", listeningMove);

    let response = await requestClaraText(apiKey, intent, interpretation, listeningMove);

    if (!response.ok) {
      const errorText = await response.text();
      console.error("Clara OpenAI request failed", response.status, errorText);
      return NextResponse.json(
        {
          error: "OpenAI request failed",
          status: response.status,
          detail: safeErrorDetail(errorText)
        },
        { status: 502 }
      );
    }

    const data = await response.json();
    let text = extractResponseText(data);

    if (text && !isGroundedClaraText(text, intent, interpretation)) {
      console.warn("Clara response was not grounded; regenerating", { intent, text });
      response = await requestClaraText(
        apiKey,
        intent,
        interpretation,
        listeningMove,
        "Your previous answer was invalid. Regenerate it from the interpretation, not keyword tags. Do not summarize the whole answer. Do not use banned procedural phrases. Choose one human meaning and ask at most one natural question."
      );

      if (response.ok) {
        text = extractResponseText(await response.json());
      }
    }

    if (text && !isGroundedClaraText(text, intent, interpretation)) {
      console.warn("Clara response stayed invalid after regeneration", { intent, text });
      return NextResponse.json({ error: "Clara response failed grounding rules" }, { status: 502 });
    }

    if (!text) {
      console.error("Clara OpenAI response missing text", data);
      return NextResponse.json({ error: "OpenAI response missing text" }, { status: 502 });
    }

    console.log("Clara final response:", text);
    console.log("Using AI Clara response", { intent, text, selectedThread: interpretation.strongestThread });
    return NextResponse.json({
      text,
      selectedThread: interpretation.strongestThread,
      threadConfidence: intentHasActiveThread(intent) ? 0.9 : 0.75
    });
  } catch (error) {
    console.error("Clara API route error", error);
    return NextResponse.json({ error: "Clara API route error" }, { status: 500 });
  }
}

async function interpretUserInput(apiKey: string, intent: unknown): Promise<Interpretation> {
  const response = await fetch("https://api.openai.com/v1/responses", {
    method: "POST",
    headers: {
      Authorization: `Bearer ${apiKey}`,
      "Content-Type": "application/json"
    },
    body: JSON.stringify({
      model: "gpt-4.1-mini",
      input: [
        {
          role: "system",
          content: CLARA_INTERPRETATION_PROMPT
        },
        {
          role: "user",
          content: JSON.stringify(
            {
              task: "Interpret the user's meaning for Clara. Return only the JSON interpretation object.",
              intent
            },
            null,
            2
          )
        }
      ],
      max_output_tokens: 180
    })
  });

  if (!response.ok) {
    const errorText = await response.text();
    throw new Error(`Clara interpretation request failed with ${response.status}: ${safeErrorDetail(errorText)}`);
  }

  return normalizeInterpretation(extractJsonObject(await response.json()), intent);
}

function requestClaraText(
  apiKey: string,
  intent: unknown,
  interpretation: Interpretation,
  listeningMove: ListeningMove,
  repairInstruction?: string
) {
  return fetch("https://api.openai.com/v1/responses", {
    method: "POST",
    headers: {
      Authorization: `Bearer ${apiKey}`,
      "Content-Type": "application/json"
    },
    body: JSON.stringify({
      model: "gpt-4.1-mini",
      input: [
        {
          role: "system",
          content: CLARA_RESPONSE_PROMPT
        },
        {
          role: "user",
          content: JSON.stringify(
            {
              task: "Write Clara's next line from this meaning interpretation and deterministic listening move.",
              repairInstruction,
              interpretation,
              listeningMove,
              intent
            },
            null,
            2
          )
        }
      ],
      max_output_tokens: 90
    })
  });
}

function isGroundedClaraText(text: string, intent: unknown, interpretation?: Interpretation) {
  if (!isRecord(intent)) return true;

  if (hasBannedSummaryPattern(text)) return false;

  const expectedInput = intent.expectedInput;
  if (expectedInput === "none") return true;

  const focusElement = typeof intent.focusElement === "string" ? intent.focusElement : "";
  const activeThread = typeof intent.activeThread === "string" ? intent.activeThread : "";
  const concreteReferences = Array.isArray(intent.concreteReferences)
    ? intent.concreteReferences.filter((value): value is string => typeof value === "string")
    : [];
  const userText = typeof intent.userText === "string" ? intent.userText : "";
  const candidates = [
    interpretation?.strongestThread,
    interpretation?.humanMeaning,
    ...(interpretation?.concreteDetails ?? []),
    ...(interpretation?.possibleThreads ?? []),
    activeThread,
    focusElement,
    ...concreteReferences,
    ...userText.split(/\s+/).filter((word) => word.length > 4)
  ].filter((candidate): candidate is string => typeof candidate === "string" && candidate.trim().length > 0);

  if (candidates.length === 0) return true;

  const normalizedText = normalizeForGrounding(text);
  return candidates.some((candidate) => normalizedText.includes(normalizeForGrounding(candidate)));
}

function normalizeInterpretation(value: unknown, intent: unknown): Interpretation {
  const intentRecord = isRecord(intent) ? intent : {};
  const userText = typeof intentRecord.userText === "string" ? intentRecord.userText : "";
  const fallbackElements = flattenKeyElements(intentRecord.keyElements);
  const focusElement = typeof intentRecord.focusElement === "string" ? intentRecord.focusElement : "";
  const activeThread = typeof intentRecord.activeThread === "string" ? intentRecord.activeThread : "";
  const record = isRecord(value) ? value : {};
  const concreteDetails = Array.isArray(record.concreteDetails)
    ? record.concreteDetails.filter((item): item is string => typeof item === "string")
    : fallbackElements;
  const possibleThreads = Array.isArray(record.possibleThreads)
    ? record.possibleThreads.filter((item): item is string => typeof item === "string")
    : fallbackElements.filter((item) => item.split(/\s+/).length > 1);
  const rawThread =
    typeof record.strongestThread === "string" && record.strongestThread.trim()
      ? record.strongestThread.trim()
      : focusElement || possibleThreads[0] || concreteDetails[0] || "this";
  const strongestThread =
    activeThread ||
    strongerThreadCandidate(rawThread, [...possibleThreads, ...concreteDetails, ...fallbackElements], userText);
  const emotionalTone = normalizeEmotionalTone(record.emotionalTone);

  return {
    summaryOfWhatUserMeant:
      typeof record.summaryOfWhatUserMeant === "string" && record.summaryOfWhatUserMeant.trim()
        ? record.summaryOfWhatUserMeant.trim()
        : userText,
    concreteDetails: concreteDetails.length > 0 ? concreteDetails : [userText].filter(Boolean),
    emotionalTone,
    humanMeaning:
      typeof record.humanMeaning === "string" && record.humanMeaning.trim()
        ? record.humanMeaning.trim()
        : strongestThread,
    possibleThreads: possibleThreads.length > 0 ? possibleThreads : [strongestThread],
    strongestThread,
    whyThisThread:
      typeof record.whyThisThread === "string" && record.whyThisThread.trim()
        ? record.whyThisThread.trim()
        : "It captures the user's meaning better than a single keyword.",
    avoidMisreads: normalizeAvoidMisreads(record.avoidMisreads, userText)
  };
}

function chooseListeningMove(interpretation: Interpretation, intent: unknown): ListeningMove {
  if (!isRecord(intent)) return "zoom_in";

  if (intent.expectedInput === "none" || intent.intent === "close") return "close";

  const userText = typeof intent.userText === "string" ? intent.userText.toLowerCase() : "";
  const activeThread = typeof intent.activeThread === "string" && intent.activeThread.trim().length > 0;

  if (
    /\b(confused|not what i meant|something else|no,? actually|that's not it|thats not it|i didn'?t say|not exactly|i mean)\b/.test(
      userText
    ) ||
    /^no[, ]/.test(userText) ||
    /\bactually\b/.test(userText)
  ) {
    return "redirect_repair";
  }

  if (activeThread) return "continue_thread";

  if (interpretation.possibleThreads.length >= 2 && /\bor\b/.test(userText)) return "clarify";

  if (interpretation.emotionalTone === "positive" || interpretation.concreteDetails.length > 0) return "zoom_in";

  if (interpretation.humanMeaning.split(/\s+/).length > 4) return "deepen_gently";

  return "zoom_in";
}

function normalizeEmotionalTone(value: unknown): Interpretation["emotionalTone"] {
  return value === "positive" || value === "neutral" || value === "negative" || value === "mixed" ? value : "neutral";
}

function normalizeAvoidMisreads(value: unknown, userText: string) {
  const misreads = Array.isArray(value) ? value.filter((item): item is string => typeof item === "string") : [];
  const lower = userText.toLowerCase();

  if (/\bwork(?:ing)? together\b/.test(lower) || /\blearning how to work together\b/.test(lower)) {
    misreads.push("Do not interpret 'work' as job/work stress.");
  }

  return Array.from(new Set(misreads));
}

function strongerThreadCandidate(candidate: string, keyElements: string[], userText: string) {
  if (!isWeakStandaloneThread(candidate)) return candidate;

  const richerElement = keyElements.find((element) => !isWeakStandaloneThread(element) && element.split(/\s+/).length > 1);
  if (richerElement) return richerElement;

  const lower = userText.toLowerCase();
  if (/\blearning how to work together\b/.test(lower)) return "learning teamwork";
  if (/\bwork(?:ing)? together\b/.test(lower)) return "working together";
  if (/\b(collaborat(?:e|ing|ion)|teamwork)\b/.test(lower)) return "learning collaboration";
  if (/\bwork(?:ing)? through adversity\b/.test(lower)) return "working through adversity";
  if (/\b(improvement|improve|improving|getting better|progress)\b/.test(lower)) return "seeing improvement";
  if (/\b(teammate|team sports)\b/.test(lower)) return "being a good teammate";
  if (/\b(with my kids|with the kids|together)\b/.test(lower)) return "doing something together";

  return candidate;
}

function isWeakStandaloneThread(value: string) {
  return ["work", "make", "go", "get", "feel", "do", "have", "see"].includes(value.trim().toLowerCase());
}

function intentHasActiveThread(intent: unknown) {
  return isRecord(intent) && typeof intent.activeThread === "string" && intent.activeThread.trim().length > 0;
}

function flattenKeyElements(value: unknown) {
  if (!isRecord(value)) return [];

  return ["activities", "people", "emotions"].flatMap((key) => {
    const items = value[key];
    return Array.isArray(items) ? items.filter((item): item is string => typeof item === "string") : [];
  });
}

function extractJsonObject(data: unknown) {
  const text = extractResponseText(data);
  if (!text) return {};

  try {
    return JSON.parse(text);
  } catch {
    const match = text.match(/\{[\s\S]*\}/);
    if (!match) return {};

    try {
      return JSON.parse(match[0]);
    } catch {
      return {};
    }
  }
}

function hasBannedSummaryPattern(text: string) {
  const normalized = text.toLowerCase();

  return [
    /\bboth\b/,
    /\bthat sounds like\b/,
    /\bthat seems like\b/,
    /\bsounds like\b/,
    /\bseems like\b/,
    /\bthe part i heard\b/,
    /\bwhat i heard\b/,
    /\bthe thread i heard\b/,
    /\blet'?s stay with\b/,
    /\byou mentioned\b/,
    /\bthat moment\b/,
    /\bsay one more thing\b/,
    /\bwant to leave it there\b/,
    /\bsounds really present\b/,
    /\bworth holding onto\b/,
    /\bfeels like signal\b/,
    /\bmeaningful\b/,
    /\bpretty big deal\b/,
    /\bpersonal value\b/,
    /\bcreative process\b/
  ].some((pattern) => pattern.test(normalized));
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

function normalizeForGrounding(value: string) {
  return value
    .toLowerCase()
    .replace(/[^a-z0-9\s]/g, " ")
    .replace(/\s+/g, " ")
    .trim();
}

function safeErrorDetail(text: string) {
  return text.replace(/sk-[A-Za-z0-9_-]+/g, "sk-redacted").slice(0, 600);
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null;
}
