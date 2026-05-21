"use client";

import { FormEvent, useEffect, useMemo, useRef, useState } from "react";

type Depth = "keep_it_light" | "go_a_little_deeper";
type DepthLabel = "Keep it light" | "Go a little deeper";
type HeaderDepthLabel = "Light" | "Deep";
type EngineDepth = Depth;
type StoredDepth = Depth | DepthLabel | "Light" | "Thoughtful" | "Deep" | "light" | "thoughtful" | "deep";
type Tab = "Today" | "Moments" | "Meaning" | "Frames" | "History" | "Recap" | "Settings";
type LengthBucket = "short" | "medium" | "long";
type Sentiment = "positive" | "neutral" | "negative";
type MessageRole = "clara" | "user";
type SessionStatus = "active" | "closed";
type ExpectedInput = "choice" | "text" | "none";
type ThreadSource = "clara" | "user";
type UserDepthSignal = "low" | "medium" | "high";
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
type TouchpointType =
  | "daily_check_in"
  | "morning_orientation"
  | "evening_reflection"
  | "marked_moment"
  | "before_event"
  | "after_event";
type MomentKind = "Before something" | "After something" | "Just noticed something";
type MeaningNoteConfidence = "low" | "medium" | "high";
type MeaningNoteMode = "review" | "edit";
type DecisionFrameType = "life" | "work" | "family" | "goals" | "meeting" | "other";
type DecisionFrameStatus = "open" | "closed";
type ResponseStrategy =
  | "acknowledge"
  | "reflect"
  | "ask_followup"
  | "offer_depth_choice"
  | "pattern_notice"
  | "save_bright_spot"
  | "downshift";
type ResponseIntentName = "acknowledge" | "choice" | "followup" | "save" | "close" | "pattern_notice";
type ThemeTag =
  | "stress"
  | "work"
  | "family"
  | "joy"
  | "growth"
  | "creativity"
  | "service"
  | "belonging"
  | "presence"
  | "mastery";

type Profile = {
  wantsMore: string;
  drainsEnergy: string;
  depth: Depth;
};

type BaseMessage = {
  text: string;
  timestamp: string;
};

type ClaraMessage = BaseMessage & {
  role: "clara";
  expectedInput: ExpectedInput;
  choices?: string[];
};

type UserMessage = BaseMessage & {
  role: "user";
};

type ConversationMessage = ClaraMessage | UserMessage;

type CurrentSession = {
  sessionId: string;
  startedAt: string;
  messages: ConversationMessage[];
  currentDepth: EngineDepth;
  status: SessionStatus;
  activeThread: string | null;
  threadSource: ThreadSource;
  threadConfidence: number;
  awaitingThreadRedirect: boolean;
  threadCorrectionOffered: boolean;
  turnCount: number;
  userDepthSignal: UserDepthSignal;
  touchpointType?: TouchpointType;
  momentKind?: MomentKind;
  eventType?: string;
};

type CompletedSession = CurrentSession & {
  endedAt: string;
  tags: ThemeTag[];
  summary: string;
};

type MeaningNote = {
  id: string;
  createdAt: string;
  sourceSessionId: string;
  sourceStartedAt: string;
  sourceTouchpointType: TouchpointType;
  sourceLabel: string;
  meaningNote: string;
  lenses: string[];
  themes: string[];
  confidence: MeaningNoteConfidence;
};

type DecisionFrame = {
  id: string;
  createdAt: string;
  updatedAt: string;
  question: string;
  decisionType: DecisionFrameType;
  status: DecisionFrameStatus;
  threads: string[];
  criteria: string[];
  tradeoffs: string[];
  knowns: string[];
  unknowns: string[];
  currentFocus: string | null;
  nextStep: string | null;
  sourceSessionId: string | null;
};

type DecisionFrameUpdate = {
  threads: string[];
  criteria: string[];
  tradeoffs: string[];
  knowns: string[];
  unknowns: string[];
  currentFocus: string | null;
  nextStep: string | null;
};

type LegacyEntry = {
  id: string;
  createdAt: string;
  question: string;
  response: string;
  tags: ThemeTag[];
  depth: StoredDepth;
  clara: string;
};

type EntryClassification = {
  lengthBucket: LengthBucket;
  sentiment: Sentiment;
  themes: ThemeTag[];
  hasPattern: boolean;
  repeatedThemes: ThemeTag[];
  suggestedDepth: EngineDepth;
};

type ClaraTemplateContext = {
  entry: string;
  classification: EntryClassification;
  selectedDepth: EngineDepth;
  session: CurrentSession;
};

type ClaraTemplate = (context: ClaraTemplateContext) => string;

type ClaraTurn = {
  text: string;
  expectedInput: ExpectedInput;
  choices?: string[];
  selectedThread?: string | null;
  threadConfidence?: number;
};

type ClaraTextResult = {
  text: string;
  selectedThread?: string | null;
  threadConfidence?: number;
};

type ClaraLabResponse = {
  text?: string;
  error?: string;
  detail?: string;
  fallbackUsed?: boolean;
};

type UserIntentContext = {
  userIntent: UserIntent;
  decisionFrame?: DecisionFrame | null;
  decisionFrameUpdate?: DecisionFrameUpdate | null;
};

type MeaningNoteResponse = {
  meaningNote?: string;
  lenses?: string[];
  themes?: string[];
  confidence?: MeaningNoteConfidence;
  error?: string;
  detail?: string;
};

type ResponseIntent = {
  intent: ResponseIntentName;
  strategy: ResponseStrategy | ResponseIntentName;
  userText: string;
  themes: string[];
  sentiment: string;
  depth: EngineDepth;
  repeatedThemes: string[];
  keyElements: {
    activities: string[];
    people: string[];
    emotions: string[];
  };
  focusElement: string;
  concreteReferences: string[];
  memoryContext: string[];
  activeThread: string | null;
  threadSource: ThreadSource;
  threadConfidence: number;
  turnCount: number;
  userDepthSignal: UserDepthSignal;
  openerFrame: string;
  expectedInput: ExpectedInput;
  choices?: string[];
};

const STORAGE_KEYS = {
  profile: "whyld-world-clara-profile",
  currentSession: "whyld-world-clara-current-session",
  sessions: "whyld-world-clara-sessions",
  legacyEntries: "whyld-world-clara-entries",
  meaningNotes: "whyld-world-clara-meaning-notes",
  decisionFrames: "whyld-world-clara-decision-frames"
};

const APP_STORAGE_PREFIXES = ["whyld-world-", "whyld-", "clara-"];

const timeAwareOpeners = {
  morning: "What's on your mind this morning?",
  midday: "How is today going so far?",
  afternoon: "What's been taking your attention today?",
  evening: "How was your day?",
  night: "Anything from today still with you?"
};

const morningOrientationPrompt = "What's one thing you want to protect today?";
const eveningReflectionPrompt = "Anything from today worth remembering?";
const markMomentPrompt = "What happened?";
const momentKindChoices: MomentKind[] = ["Before something", "After something", "Just noticed something"];
const momentKindPrompts: Record<MomentKind, string> = {
  "Before something": "What are you about to enter?",
  "After something": "What's still with you from it?",
  "Just noticed something": "What did you notice?"
};

const tagLexicon: Record<ThemeTag, string[]> = {
  stress: [
    "stress",
    "chaos",
    "chaotic",
    "tired",
    "anxious",
    "overwhelmed",
    "pressure",
    "drained",
    "burnout",
    "worried",
    "hard",
    "heavy",
    "exhausted",
    "sad",
    "angry",
    "annoying",
    "annoyed",
    "irritating",
    "frustrating"
  ],
  work: ["work", "job", "meeting", "client", "boss", "project", "deadline", "email", "career"],
  family: ["family", "mom", "dad", "parent", "kid", "kids", "child", "partner", "sister", "brother", "home", "dinner"],
  joy: ["joy", "happy", "laughed", "fun", "delight", "grateful", "beautiful", "good", "love", "bright"],
  growth: ["learn", "growth", "change", "practice", "progress", "stretch", "becoming"],
  creativity: ["create", "write", "paint", "music", "idea", "design", "make", "art", "imagine"],
  service: ["help", "support", "serve", "care", "volunteer", "kind", "gave", "listened"],
  belonging: ["friend", "community", "together", "seen", "belong", "lonely", "connected", "conversation"],
  presence: ["walk", "quiet", "breath", "still", "present", "outside", "nature", "noticed", "slow"],
  mastery: ["skill", "focus", "discipline", "trained", "improved", "finished", "built", "solved", "craft"]
};

const positiveWords = [
  "good",
  "great",
  "happy",
  "joy",
  "love",
  "grateful",
  "calm",
  "proud",
  "better",
  "beautiful",
  "fun",
  "light",
  "relieved",
  "connected",
  "hopeful",
  "present"
];

const negativeWords = [
  "bad",
  "hard",
  "sad",
  "angry",
  "stress",
  "chaos",
  "chaotic",
  "tired",
  "drained",
  "anxious",
  "overwhelmed",
  "lonely",
  "heavy",
  "worried",
  "exhausted",
  "stuck",
  "hurt",
  "annoying",
  "annoyed",
  "irritating",
  "frustrating"
];

const templateOrder: Record<LengthBucket, Record<Sentiment, string>> = {
  short: {
    positive: "short_positive",
    neutral: "short_neutral",
    negative: "short_negative"
  },
  medium: {
    positive: "medium_positive",
    neutral: "medium_neutral",
    negative: "medium_negative"
  },
  long: {
    positive: "long_positive",
    neutral: "long_neutral",
    negative: "long_negative"
  }
};

const strategyTemplate: Partial<Record<ResponseStrategy, string>> = {
  pattern_notice: "repeated_stress_pattern",
  save_bright_spot: "repeated_family_joy_bright_spot",
  offer_depth_choice: "deep_mode_opt_in"
};

const claraTemplates: Record<string, ClaraTemplate[]> = {
  short_positive: [
    () => "That feels like the part worth noticing. Want to save this?",
    () => "There is a small brightness here. Want to keep it light or name what made it matter?",
    () => "This seems worth keeping. Want to save it as a bright spot?"
  ],
  short_neutral: [
    () => "There is something there. What made it stand out?",
    () => "That may be enough for today. Want to save it without making it bigger?",
    () => "That seems worth noticing. What made it stand out?"
  ],
  short_negative: [
    () => "That was a lot. What made it hit hardest?",
    () => "This feels heavy enough to notice gently. Want to stay light?",
    () => "We can keep this simple. Want to save it and not sort it yet?"
  ],
  medium_positive: [
    () => "That has real warmth in it. Want to save the part that gave you energy?",
    () => "Something in this seemed to meet you well. Want to mark that?",
    () => "One part of this mattered in a good way. Want to keep it close?"
  ],
  medium_neutral: [
    () => "This has a few threads, but one feels central. Want to choose the one that matters?",
    () => "One piece of this feels closer. Which one has your attention?",
    () => "There is something ordinary here that still seems worth noticing. Want to save it?"
  ],
  medium_negative: [
    () => "One part of that took something from you. Want a pause, or one clear next thought?",
    () => "There is strain in this. Want to keep it light or name the hardest part?",
    () => "This does not need to become a lesson. Want to save what happened?"
  ],
  long_positive: [
    () => "A lot is here, and the bright part still comes through. Want to save the strongest piece?",
    () => "This feels full, but not scattered. Want to name what gave it life?",
    () => "There is more than one thread here. Want to keep the one that gave you energy?"
  ],
  long_neutral: [
    () => "There are several layers here. Which one feels closest?",
    () => "This feels like a fuller day than it first appears. What stayed with you?",
    () => "I can hold this lightly. Want to save it, or look for the pattern?"
  ],
  long_negative: [
    () => "That is a lot to carry in one entry. What felt heaviest?",
    () => "This sounds heavy and layered. Want to downshift before looking at it?",
    () => "We do not have to make this profound. Want to save it and stop here?"
  ],
  repeated_stress_pattern: [
    () => "You have said something like this before. Want to look at the pattern, or just save today?",
    () => "Stress is showing up again. Want to notice the pattern without solving it?",
    () => "This has returned more than once. Want clarity, comfort, or a pause?"
  ],
  repeated_family_joy_bright_spot: [
    () => "This kind of warmth has appeared before. Want to save it as a bright spot?",
    () => "Family keeps showing up here. What did they give back today?",
    () => "There is a familiar brightness here. Want to save it?"
  ],
  deep_mode_opt_in: [
    () => "There is something there. What made it stand out?",
    () => "There is more there. What feels closest?",
    () => "This could open further. Want depth, or should we just save it?"
  ],
  contrast: [
    () => "There is a real contrast here. Which side stayed with you?",
    () => "One part of that wants attention. What keeps coming back?",
    () => "There is a clear thread here. What feels closest?"
  ],
  follow_dinner: [
    () => "What made that feel different from the rest of the day?",
    () => "What was present there that was missing earlier?",
    () => "What part of dinner do you want to remember?"
  ],
  follow_chaos: [
    () => "What part of the chaos took the most from you?",
    () => "Where did the day start asking too much?",
    () => "What would have made the chaos easier to carry?"
  ],
  save_confirmation: [() => "Saved. That's a good place to stop for today."],
  leave_closed: [() => "Saved for today. I'll keep an eye on what keeps showing up."]
};

const tagQuestions: Record<ThemeTag, string> = {
  stress: "What would feel lighter if you did not have to carry all of it today?",
  work: "What did work ask from you today?",
  family: "What kind of presence did family ask from you?",
  joy: "Where did joy arrive without needing to be forced?",
  growth: "What part of you is quietly changing shape?",
  creativity: "What wants a little more room to be made?",
  service: "Where did care move through you today?",
  belonging: "Who or what helped you feel less separate?",
  presence: "What did you notice when life got quiet enough to hear?",
  mastery: "What skill or rhythm is beginning to trust you back?"
};

const starterProfile: Profile = {
  wantsMore: "",
  drainsEnergy: "",
  depth: "go_a_little_deeper"
};

function todayOpener() {
  const hour = new Date().getHours();

  if (hour >= 5 && hour < 11) return timeAwareOpeners.morning;
  if (hour >= 11 && hour < 14) return timeAwareOpeners.midday;
  if (hour >= 14 && hour < 17) return timeAwareOpeners.afternoon;
  if (hour >= 17 && hour < 22) return timeAwareOpeners.evening;
  return timeAwareOpeners.night;
}

function makeUserMessage(text: string): UserMessage {
  return {
    role: "user",
    text,
    timestamp: new Date().toISOString()
  };
}

function makeClaraMessage(turn: ClaraTurn): ClaraMessage {
  return {
    role: "clara",
    text: turn.text,
    timestamp: new Date().toISOString(),
    expectedInput: turn.expectedInput,
    choices: turn.choices
  };
}

function createSession(
  depth: EngineDepth,
  options: {
    opener?: string;
    touchpointType?: TouchpointType;
    momentKind?: MomentKind;
    choices?: string[];
  } = {}
): CurrentSession {
  return {
    sessionId: crypto.randomUUID(),
    startedAt: new Date().toISOString(),
    messages: [
      makeClaraMessage({
        text: options.opener ?? todayOpener(),
        expectedInput: "text",
        choices: options.choices
      })
    ],
    currentDepth: depth,
    status: "active",
    activeThread: null,
    threadSource: "clara",
    threadConfidence: 0,
    awaitingThreadRedirect: false,
    threadCorrectionOffered: false,
    turnCount: 0,
    userDepthSignal: "low",
    touchpointType: options.touchpointType ?? "daily_check_in",
    momentKind: options.momentKind
  };
}

function inferTags(text: string): ThemeTag[] {
  const lower = text.toLowerCase();
  const tags = (Object.entries(tagLexicon) as [ThemeTag, string[]][])
    .filter(([, words]) => words.some((word) => lower.includes(word)))
    .map(([tag]) => tag);

  return tags.length > 0 ? tags : ["presence"];
}

function classifyEntry(text: string, previousSessions: CompletedSession[]): EntryClassification {
  const words = text.trim().split(/\s+/).filter(Boolean);
  const lengthBucket: LengthBucket = words.length < 8 ? "short" : words.length < 35 ? "medium" : "long";
  const sentiment = classifySentiment(text);
  const themes = inferTags(text);
  const previousCounts = sessionTagCounts(previousSessions);
  const repeatedThemes = themes.filter((theme) => (previousCounts[theme] ?? 0) > 0);
  const hasPattern = repeatedThemes.length > 0;
  const suggestedDepth = chooseSuggestedDepth(lengthBucket, sentiment, hasPattern, repeatedThemes);

  return {
    lengthBucket,
    sentiment,
    themes,
    hasPattern,
    repeatedThemes,
    suggestedDepth
  };
}

function chooseResponseStrategy(classification: EntryClassification, selectedDepth: EngineDepth): ResponseStrategy {
  const repeated = new Set(classification.repeatedThemes);

  if (repeated.has("stress")) return "pattern_notice";
  if (repeated.has("family") && (repeated.has("joy") || classification.themes.includes("joy"))) return "save_bright_spot";
  if (classification.sentiment === "negative" && classification.lengthBucket === "long") return "downshift";
  if (selectedDepth === "go_a_little_deeper" || classification.suggestedDepth === "go_a_little_deeper") {
    return "offer_depth_choice";
  }
  if (classification.sentiment === "positive") return "save_bright_spot";
  if (classification.lengthBucket === "short") return "acknowledge";
  if (classification.sentiment === "negative") return "ask_followup";

  return "reflect";
}

async function generateClaraResponse(
  entry: string,
  classification: EntryClassification,
  strategy: ResponseStrategy,
  selectedDepth: EngineDepth,
  previousSessions: CompletedSession[],
  session: CurrentSession
): Promise<ClaraTurn> {
  const intent = buildResponseIntent(entry, classification, strategy, selectedDepth, previousSessions, session);

  return {
    ...(await generateClaraText(intent)),
    expectedInput: intent.expectedInput,
    choices: intent.choices
  };
}

function buildResponseIntent(
  entry: string,
  classification: EntryClassification,
  strategy: ResponseStrategy,
  selectedDepth: EngineDepth,
  previousSessions: CompletedSession[],
  session: CurrentSession
): ResponseIntent {
  const latestClara = [...session.messages].reverse().find((message) => message.role === "clara")?.text ?? "";
  const lowerEntry = entry.toLowerCase();
  const themes = new Set(classification.themes);
  const keyElements = extractKeyElements(entry, classification.themes);
  const focusElement = chooseFocusElement(keyElements, classification);
  const baseIntent = {
    userText: entry,
    themes: classification.themes,
    sentiment: classification.sentiment,
    depth: selectedDepth,
    repeatedThemes: classification.repeatedThemes,
    keyElements,
    focusElement,
    concreteReferences: extractConcreteReferences(entry, classification.themes),
    memoryContext: buildMemoryContext(classification, previousSessions),
    activeThread: shouldStartNewThread(session, entry, focusElement) ? null : session.activeThread,
    threadSource: session.threadSource,
    threadConfidence: session.threadConfidence,
    turnCount: session.turnCount,
    userDepthSignal: session.userDepthSignal,
    openerFrame: sessionOpenerFrame(session)
  };

  if (isSaveChoice(entry)) {
    return {
      ...baseIntent,
      intent: "save",
      strategy,
      expectedInput: "none"
    };
  }

  if (isAnnoyingWorkResponse(entry, classification)) {
    return {
      ...baseIntent,
      intent: "followup",
      strategy,
      expectedInput: "text"
    };
  }

  if ((themes.has("work") || themes.has("stress")) && (themes.has("family") || themes.has("joy"))) {
    return {
      ...baseIntent,
      intent: "followup",
      strategy,
      expectedInput: "text"
    };
  }

  if (isDinnerChoice(entry) || lowerEntry.includes("dinner") || lowerEntry.includes("bright") || lowerEntry.includes("restored")) {
    return {
      ...baseIntent,
      intent: "followup",
      strategy,
      expectedInput: "text"
    };
  }

  if (isChaosChoice(entry) || lowerEntry.includes("chaos") || lowerEntry.includes("drained")) {
    return {
      ...baseIntent,
      intent: "followup",
      strategy,
      expectedInput: "text"
    };
  }

  if (
    latestClara.includes("dinner feel different") ||
    latestClara.includes("different from the rest") ||
    latestClara.includes("missing earlier")
  ) {
    return {
      ...baseIntent,
      intent: "followup",
      strategy,
      expectedInput: "text"
    };
  }

  if (entry.trim().split(/\s+/).filter(Boolean).length <= 3 && claraFollowupCount(session) >= 2) {
    return {
      ...baseIntent,
      intent: "save",
      strategy,
      expectedInput: "choice",
      choices: ["Keep going", "Save this", "Done for today"]
    };
  }

  const preferredTemplate = strategyTemplate[strategy] ?? templateOrder[classification.lengthBucket][classification.sentiment];
  const text = pickTemplate(preferredTemplate, entry, classification, selectedDepth, session);
  return intentForTemplateText(text, baseIntent, strategy);
}

function pickTemplate(
  templateKey: string,
  entry: string,
  classification: EntryClassification,
  selectedDepth: EngineDepth,
  session: CurrentSession
) {
  const templates = claraTemplates[templateKey];
  const template = templates[stableIndex(`${entry}-${session.messages.length}`, templates.length)];

  return template({
    entry,
    classification,
    selectedDepth,
    session
  });
}

function extractConcreteReferences(text: string, themes: string[]) {
  const lower = text.toLowerCase();
  const references: string[] = extractMeaningfulThreadCandidates(text);

  if (lower.includes("coaching baseball")) references.push("coaching baseball");
  if (lower.includes("baseball")) references.push("baseball");
  if (lower.includes("tee ball")) references.push("tee ball");
  if (lower.includes("kids") || lower.includes("children")) references.push("time with your kids");
  if (lower.includes("dinner")) references.push("dinner");
  if (namesJobWork(lower)) references.push("work");
  if (lower.includes("meeting")) references.push("the meeting");
  if (lower.includes("walk")) references.push("the walk");
  if (lower.includes("family")) references.push("family");

  const activityMatch = lower.match(/\b(coaching|spending time|playing|walking|writing|making|building|cooking)\b[^.!,?]{0,36}/);
  if (activityMatch) {
    references.unshift(cleanReference(activityMatch[0]));
  }

  if (references.length === 0 && themes.includes("family")) references.push("time with your family");
  if (references.length === 0 && themes.includes("work") && namesJobWork(lower)) references.push("work");
  if (references.length === 0 && themes.includes("presence")) references.push("what you noticed");

  return Array.from(new Set(references)).slice(0, 3);
}

function extractKeyElements(text: string, themes: string[]) {
  const lower = text.toLowerCase();
  const activities: string[] = extractMeaningfulThreadCandidates(text);
  const people: string[] = [];
  const emotions: string[] = [];

  if (lower.includes("coaching baseball")) activities.push("coaching baseball");
  else if (lower.includes("baseball")) activities.push("baseball");
  if (lower.includes("tee ball")) activities.push("tee ball");
  if (lower.includes("dinner")) activities.push("dinner");
  if (namesJobWork(lower)) activities.push("work");
  if (lower.includes("meeting")) activities.push("the meeting");
  if (lower.includes("walk")) activities.push("the walk");

  const activityMatch = lower.match(/\b(coaching|spending time|playing|walking|writing|making|building|cooking)\b[^.!,?]{0,36}/);
  if (activityMatch) activities.unshift(cleanReference(activityMatch[0]));

  if (lower.includes("kids") || lower.includes("children")) people.push("your kids");
  if (lower.includes("family")) people.push("family");
  if (lower.includes("mom")) people.push("your mom");
  if (lower.includes("dad")) people.push("your dad");
  if (lower.includes("partner")) people.push("your partner");

  if (lower.includes("loved") || lower.includes("love")) emotions.push("loved");
  if (lower.includes("annoying") || lower.includes("annoyed")) emotions.push("annoying");
  if (lower.includes("nice") || lower.includes("good")) emotions.push("good");
  if (lower.includes("chaotic") || lower.includes("chaos")) emotions.push("chaotic");
  if (lower.includes("present")) emotions.push("present");

  if (activities.length === 0 && themes.includes("work") && namesJobWork(lower)) activities.push("work");
  if (people.length === 0 && themes.includes("family")) people.push("family");

  return {
    activities: Array.from(new Set(activities)).slice(0, 3),
    people: Array.from(new Set(people)).slice(0, 3),
    emotions: Array.from(new Set(emotions)).slice(0, 3)
  };
}

function chooseFocusElement(
  keyElements: ReturnType<typeof extractKeyElements>,
  classification?: Pick<EntryClassification, "sentiment" | "themes">
) {
  if (classification?.themes.includes("work") && keyElements.activities.includes("work")) return "work";
  if (keyElements.activities.length > 0) return keyElements.activities[0];
  if (keyElements.people.length > 0) return keyElements.people[0];
  if (keyElements.emotions.length > 0) return keyElements.emotions[0];
  return "this";
}

function extractMeaningfulThreadCandidates(text: string) {
  const lower = text.toLowerCase();
  const candidates: string[] = [];
  const hasKids = /\b(kids|children|son|daughter|team|players)\b/.test(lower);

  if (/\blearning how to work together\b/.test(lower)) {
    candidates.push("learning teamwork", "working together", "team development");
  }

  if (/\bwork(?:ing)? together\b/.test(lower)) {
    candidates.push("working together");
  }

  if (/\b(collaborat(?:e|ing|ion)|teamwork)\b/.test(lower)) {
    candidates.push("learning collaboration");
  }

  if (hasKids && /\bwork(?:ing)? through adversity\b/.test(lower)) {
    candidates.push("watching my kids work through adversity");
  }

  if (/\bwork(?:ing)? through adversity\b/.test(lower)) {
    candidates.push("working through adversity");
  }

  if (/\b(improvement|improve|improving|getting better|progress)\b/.test(lower)) {
    candidates.push(hasKids ? "seeing improvement" : "seeing progress");
  }

  if (/\b(good teammate|better teammate|being a teammate|teammate)\b/.test(lower)) {
    candidates.push("being a good teammate");
  }

  if (/\b(team sports|sports emotions|competition|competitive)\b/.test(lower)) {
    candidates.push("team sports emotions");
  }

  if (/\b(together|with them|with my kids|with the kids)\b/.test(lower)) {
    candidates.push(hasKids ? "doing something together" : "being together");
  }

  return candidates;
}

function namesJobWork(lowerText: string) {
  if (/\bwork(?:ing)? through\b/.test(lowerText)) return false;
  if (/\bwork(?:ing)? together\b/.test(lowerText)) return false;
  if (/\blearning how to work\b/.test(lowerText)) return false;
  if (/\bwork on\b/.test(lowerText)) return false;
  return /\b(work|job|meeting|client|boss|project|deadline|email|career)\b/.test(lowerText);
}

function cleanReference(value: string) {
  return value
    .replace(/\s+and\s+.*$/g, "")
    .replace(/\b(i|and|but|was|were|today|with)\s*$/g, "")
    .replace(/\s+/g, " ")
    .trim();
}

function buildMemoryContext(classification: EntryClassification, previousSessions: CompletedSession[]) {
  const repeated = new Set(classification.repeatedThemes);
  const contexts: string[] = [];

  if (repeated.has("family") && (repeated.has("joy") || classification.themes.includes("joy"))) {
    contexts.push("Your kids have shown up as a good part of the day before.");
  }

  if (repeated.has("stress") || repeated.has("work")) {
    contexts.push("Work has come up before.");
  }

  previousSessions.slice(0, 2).forEach((session) => {
    if (session.summary) {
      contexts.push(`Recent note: ${session.summary}`);
    }
  });

  return contexts;
}

function createCloseIntent(userText: string, depth: EngineDepth): ResponseIntent {
  const keyElements = extractKeyElements(userText, []);

  return {
    intent: "close",
    strategy: "close",
    userText,
    themes: [],
    sentiment: "neutral",
    depth,
    repeatedThemes: [],
    keyElements,
    focusElement: chooseFocusElement(keyElements),
    concreteReferences: extractConcreteReferences(userText, []),
    memoryContext: [],
    activeThread: null,
    threadSource: "clara",
    threadConfidence: 0,
    turnCount: 0,
    userDepthSignal: "low",
    openerFrame: "general",
    expectedInput: "none"
  };
}

function createSaveIntent(userText: string, session: CurrentSession): ResponseIntent {
  const text = sessionText(session);
  const tags = sessionTags(session);
  const keyElements = extractKeyElements(text, tags);

  return {
    intent: "save",
    strategy: "save",
    userText,
    themes: tags,
    sentiment: classifySentiment(text),
    depth: session.currentDepth,
    repeatedThemes: [],
    keyElements,
    focusElement: chooseFocusElement(keyElements),
    concreteReferences: extractConcreteReferences(text, tags),
    memoryContext: [],
    activeThread: session.activeThread,
    threadSource: session.threadSource,
    threadConfidence: session.threadConfidence,
    turnCount: session.turnCount,
    userDepthSignal: session.userDepthSignal,
    openerFrame: sessionOpenerFrame(session),
    expectedInput: "none"
  };
}

function sessionFocusIntentFields(session: CurrentSession) {
  const text = sessionText(session);
  const tags = sessionTags(session);
  const keyElements = extractKeyElements(text, tags);

  return {
    themes: tags,
    keyElements,
    focusElement: chooseFocusElement(keyElements, {
      sentiment: classifySentiment(text),
      themes: tags
    }),
    concreteReferences: extractConcreteReferences(text, tags)
  };
}

function shouldStartNewThread(session: CurrentSession, userText: string, nextFocus: string) {
  if (!session.activeThread) return true;
  if (!nextFocus || normalizeChoice(nextFocus) === normalizeChoice(session.activeThread)) return false;

  const lower = userText.toLowerCase();
  return ["new topic", "different thing", "something else", "actually", "instead", "another thing"].some((cue) =>
    lower.includes(cue)
  );
}

function applyThreadLock(session: CurrentSession, turn: ClaraTurn, userText: string, focusElement: string): CurrentSession {
  if (session.activeThread && !shouldStartNewThread(session, userText, focusElement)) {
    return session;
  }

  const selectedThread = turn.selectedThread?.trim() || focusElement.trim();
  if (!selectedThread) return session;

  return {
    ...session,
    activeThread: selectedThread,
    threadSource: "clara",
    threadConfidence: turn.threadConfidence ?? 0.75,
    awaitingThreadRedirect: false
  };
}

function maybeOfferThreadCorrection(previousSession: CurrentSession, nextSession: CurrentSession, turn: ClaraTurn) {
  const userText = nextSession.messages.filter((message) => message.role === "user").at(-1)?.text ?? "";
  const correction = threadClarificationFor(userText);

  if (
    previousSession.activeThread ||
    previousSession.threadCorrectionOffered ||
    !nextSession.activeThread ||
    !turn.selectedThread ||
    turn.expectedInput !== "text" ||
    !correction
  ) {
    return nextSession;
  }

  const messages = [...nextSession.messages];
  const lastMessage = messages[messages.length - 1];
  if (!lastMessage || lastMessage.role !== "clara") return nextSession;

  messages[messages.length - 1] = makeClaraMessage({
    text: correction.text,
    expectedInput: "choice",
    choices: correction.choices
  });

  return {
    ...nextSession,
    messages,
    threadCorrectionOffered: true
  };
}

function threadClarificationFor(userText: string) {
  const lower = userText.toLowerCase();
  const namesBaseball = /\b(baseball|tee ball|coaching)\b/.test(lower);
  const namesKids = /\b(kids|children|them|son|daughter)\b/.test(lower);

  if (namesBaseball && namesKids && /\bor\b/.test(lower)) {
    return {
      text: "Was it more the baseball, or being with them?",
      choices: ["The baseball", "Being with them", "Both"]
    };
  }

  return null;
}

function claraFollowupCount(session: CurrentSession) {
  return session.messages.filter(
    (message, index) =>
      message.role === "clara" &&
      index > 0 &&
      message.expectedInput === "text" &&
      message.text.trim().endsWith("?")
  ).length;
}

function inferUserDepthSignal(text: string): UserDepthSignal {
  const words = text.trim().split(/\s+/).filter(Boolean);
  const lower = text.toLowerCase();
  const hasEmotion = [...positiveWords, ...negativeWords, "love", "hope", "wish", "want", "hard", "tradeoff"].some((word) =>
    lower.includes(word)
  );
  const hasReflection = /\b(because|realized|noticed|learned|matters|trying|hoping|means|lesson|adversity|improvement|tension|tradeoff)\b/.test(
    lower
  );

  if (words.length >= 18 || (words.length >= 8 && (hasEmotion || hasReflection))) return "high";
  if (words.length >= 8 || hasEmotion || hasReflection) return "medium";
  return "low";
}

function withDepthState(session: CurrentSession, userText: string): CurrentSession {
  return {
    ...session,
    turnCount: session.turnCount + 1,
    userDepthSignal: inferUserDepthSignal(userText)
  };
}

function isStoppingSignal(text: string) {
  return ["that's it", "thats it", "nothing else", "done", "i'm done", "im done", "all good", "that's enough", "thats enough"].includes(
    normalizeChoice(text)
  );
}

function shouldCloseForDepth(session: CurrentSession, latestReply: string) {
  if (isContinueSignal(latestReply)) return false;
  if (isStoppingSignal(latestReply)) return true;
  return false;
}

function maybeApplyDepthCheck(session: CurrentSession) {
  if (session.userDepthSignal === "low" || session.turnCount < 3) return session;
  const lastUserText = [...session.messages].reverse().find((message) => message.role === "user")?.text ?? "";
  if (isCorrectionSignal(lastUserText) || isContinueSignal(lastUserText) || isSeriousLifeEvent(lastUserText)) return session;

  const shouldCheck =
    (session.userDepthSignal === "medium" && session.turnCount === 4) ||
    (session.userDepthSignal === "high" && session.turnCount > 0 && session.turnCount % 5 === 0);

  if (!shouldCheck) return session;

  const messages = [...session.messages];
  const lastMessage = messages[messages.length - 1];
  if (!lastMessage || lastMessage.role !== "clara" || lastMessage.expectedInput !== "text") return session;

  messages[messages.length - 1] = makeClaraMessage({
    text: "Do you want to keep going, or save this for now?",
    expectedInput: "choice",
    choices: ["Keep going", "Save this", "Done for today"]
  });

  return {
    ...session,
    messages
  };
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

function isContinueSignal(text: string) {
  return ["keep going", "continue", "say more", "go deeper"].includes(normalizeChoice(text));
}

function detectUserIntent(text: string, session: CurrentSession): UserIntent {
  if (isContinueSignal(text)) return "explicit_continue";
  if (isExplicitStopSignal(text) || isCloseChoice(text) || isStoppingSignal(text)) return "explicit_stop";
  if (isCorrectionSignal(text)) return "correction";

  const contextualYesNoIntent = detectContextualYesNoIntent(text, session);
  if (contextualYesNoIntent) return contextualYesNoIntent;

  if (isAcknowledgement(text)) {
    const previousUserMessage = [...session.messages].reverse().find((message) => message.role === "user")?.text ?? "";
    const previousUserIntent = previousUserMessage ? detectUserIntent(previousUserMessage, emptyIntentSession()) : null;

    if (previousUserIntent === "acknowledgement" || previousUserIntent === "polite_close") {
      return "polite_close";
    }

    if (previousClaraRespondedSubstantively(session)) {
      return "polite_close";
    }

    return "acknowledgement";
  }

  return "substantive_response";
}

function detectContextualYesNoIntent(text: string, session: CurrentSession): UserIntent | null {
  if (!isYesSignal(text) && !isNoSignal(text)) return null;

  const latestClaraText = [...session.messages].reverse().find((message) => message.role === "clara")?.text ?? "";
  const lower = latestClaraText.toLowerCase();
  const latestClaraAskedQuestion = lower.includes("?");

  if (!latestClaraAskedQuestion) return null;

  if (isYesSignal(text)) {
    const askedToSave = claraAskedToSave(lower);
    const askedToContinue = claraAskedToContinue(lower);
    if (askedToSave && askedToContinue) return "ambiguous_response";
    if (askedToSave) return "save";
    if (askedToContinue) return "explicit_continue";
    if (claraAskedForConfirmation(lower)) return "confirm";
    if (claraAskedAmbiguousChoice(lower)) return "ambiguous_response";
    return "substantive_response";
  }

  const askedToSave = claraAskedToSave(lower);
  const askedToContinue = claraAskedToContinue(lower);
  if (askedToSave && askedToContinue) return "ambiguous_response";
  if (askedToContinue) return "explicit_stop";
  if (askedToSave) return "explicit_continue";
  if (claraAskedForConfirmation(lower)) return "correction";
  if (claraAskedAmbiguousChoice(lower)) return "ambiguous_response";
  return "substantive_response";
}

function isYesSignal(text: string) {
  return ["yes", "yeah", "yep", "yup", "sure", "right", "correct"].includes(normalizeConversationalSignal(text));
}

function isNoSignal(text: string) {
  return ["no", "nope", "nah", "not really"].includes(normalizeConversationalSignal(text));
}

function claraAskedToSave(text: string) {
  return /\bsave\b/.test(text) || /\bkeep this\b/.test(text);
}

function claraAskedToContinue(text: string) {
  return /\bkeep going\b/.test(text) || /\bcontinue\b/.test(text) || /\bstay with\b/.test(text) || /\bgo deeper\b/.test(text);
}

function claraAskedForConfirmation(text: string) {
  return (
    /\bdoes that feel (right|true)\b/.test(text) ||
    /\bis that (right|true)\b/.test(text) ||
    /\bdid i get that\b/.test(text) ||
    /\bdoes that fit\b/.test(text)
  );
}

function claraAskedAmbiguousChoice(text: string) {
  return (
    /\bor\b/.test(text) &&
    (/\bwhich\b/.test(text) ||
      /\bdo you want to look\b/.test(text) ||
      /\blook next\b/.test(text) ||
      /\bfirst\b/.test(text) ||
      /\bside\b/.test(text))
  );
}

function emptyIntentSession(): CurrentSession {
  return {
    sessionId: "intent",
    startedAt: new Date(0).toISOString(),
    messages: [],
    currentDepth: "keep_it_light",
    status: "active",
    activeThread: null,
    threadSource: "clara",
    threadConfidence: 0,
    awaitingThreadRedirect: false,
    threadCorrectionOffered: false,
    turnCount: 0,
    userDepthSignal: "low",
    touchpointType: "daily_check_in"
  };
}

function previousClaraRespondedSubstantively(session: CurrentSession) {
  const latestClaraIndex = findLastMessageIndex(session.messages, "clara");
  const latestUserIndex = findLastMessageIndex(session.messages, "user");

  return latestClaraIndex > 0 && latestUserIndex >= 0 && latestClaraIndex > latestUserIndex;
}

function findLastMessageIndex(messages: ConversationMessage[], role: MessageRole) {
  for (let index = messages.length - 1; index >= 0; index -= 1) {
    if (messages[index].role === role) return index;
  }

  return -1;
}

function isAcknowledgement(text: string) {
  return [
    "yes",
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

function isExplicitStopSignal(text: string) {
  return ["done", "leave it there", "stop", "that's enough", "thats enough"].includes(normalizeConversationalSignal(text));
}

function normalizeConversationalSignal(text: string) {
  return text
    .trim()
    .toLowerCase()
    .replace(/[.!?]+$/g, "")
    .replace(/\s+/g, " ");
}

function politeCloseText(text: string) {
  const normalized = normalizeConversationalSignal(text);

  if (normalized === "thanks" || normalized === "thank you" || normalized === "thx") {
    return "You're welcome. We can leave it there.";
  }

  if (normalized === "ok" || normalized === "okay" || normalized === "got it") {
    return "Of course. I'll save this for now.";
  }

  return "Glad we touched on it. I'll keep this with today.";
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

function createThreadFollowupIntent(session: CurrentSession, userText: string): ResponseIntent {
  const tags = sessionTags(session);
  const thread = session.activeThread ?? userText;

  return {
    intent: "followup",
    strategy: "followup",
    userText,
    themes: tags,
    sentiment: classifySentiment(sessionText(session)),
    depth: session.currentDepth,
    repeatedThemes: [],
    keyElements: {
      activities: [thread],
      people: [],
      emotions: []
    },
    focusElement: thread,
    concreteReferences: [thread],
    memoryContext: [],
    activeThread: thread,
    threadSource: session.threadSource,
    threadConfidence: session.threadConfidence,
    turnCount: session.turnCount,
    userDepthSignal: session.userDepthSignal,
    openerFrame: sessionOpenerFrame(session),
    expectedInput: "text"
  };
}

function classifySentiment(text: string): Sentiment {
  const lower = text.toLowerCase();
  const positiveScore = positiveWords.filter((word) => lower.includes(word)).length;
  const negativeScore = negativeWords.filter((word) => lower.includes(word)).length;

  if (positiveScore > negativeScore) return "positive";
  if (negativeScore > positiveScore) return "negative";
  return "neutral";
}

function chooseSuggestedDepth(
  lengthBucket: LengthBucket,
  sentiment: Sentiment,
  hasPattern: boolean,
  repeatedThemes: ThemeTag[]
): EngineDepth {
  if (sentiment === "negative" && lengthBucket === "long") return "keep_it_light";
  if (hasPattern && repeatedThemes.includes("stress")) return "go_a_little_deeper";
  if (lengthBucket === "long" || hasPattern) return "go_a_little_deeper";
  if (lengthBucket === "short") return "keep_it_light";
  return "go_a_little_deeper";
}

function intentForTemplateText(
  text: string,
  baseIntent: Omit<ResponseIntent, "intent" | "strategy" | "expectedInput" | "choices">,
  strategy: ResponseStrategy
): ResponseIntent {
  const lower = text.toLowerCase();
  const intent = strategy === "pattern_notice" ? "pattern_notice" : strategy === "save_bright_spot" ? "save" : "choice";

  if (lower.includes("chaos or the dinner")) {
    return {
      ...baseIntent,
      intent: "followup",
      strategy,
      expectedInput: "text"
    };
  }

  if (lower.includes("drained you") || lower.includes("restored you")) {
    return {
      ...baseIntent,
      intent: "followup",
      strategy,
      expectedInput: "text"
    };
  }

  if (lower.includes("comfort, clarity, or a pause")) {
    return {
      ...baseIntent,
      intent: "followup",
      strategy,
      expectedInput: "text"
    };
  }

  if (lower.includes("stay light or pull one thread") || lower.includes("leave it there, or say one more thing")) {
    return {
      ...baseIntent,
      intent: "followup",
      strategy,
      expectedInput: "text"
    };
  }

  if (lower.includes("stay light") && lower.includes("look once more")) {
    return {
      ...baseIntent,
      intent: "followup",
      strategy,
      expectedInput: "text"
    };
  }

  if (lower.includes("save this") || lower.includes("save it") || lower.includes("bright spot")) {
    return {
      ...baseIntent,
      intent: "followup",
      strategy,
      expectedInput: "text"
    };
  }

  if (lower.includes("pattern")) {
    return {
      ...baseIntent,
      intent: "followup",
      strategy,
      expectedInput: "text"
    };
  }

  if (lower.endsWith("?")) {
    return {
      ...baseIntent,
      intent: "followup",
      strategy,
      expectedInput: "text"
    };
  }

  return {
    ...baseIntent,
    intent: intent === "choice" ? "followup" : intent,
    strategy,
    expectedInput: "text"
  };
}

async function generateClaraText(intent: ResponseIntent) {
  try {
    console.log("Calling Clara AI route", { intent });
    const response = await fetch("/api/clara", {
      method: "POST",
      headers: {
        "Content-Type": "application/json"
      },
      body: JSON.stringify({
        intent: intent.intent,
        strategy: intent.strategy,
        userText: intent.userText,
        themes: intent.themes,
        sentiment: intent.sentiment,
        depth: intent.depth,
        repeatedThemes: intent.repeatedThemes,
        keyElements: intent.keyElements,
        focusElement: intent.focusElement,
        concreteReferences: intent.concreteReferences,
        activeThread: intent.activeThread,
        threadSource: intent.threadSource,
        threadConfidence: intent.threadConfidence,
        turnCount: intent.turnCount,
        userDepthSignal: intent.userDepthSignal,
        openerFrame: intent.openerFrame,
        expectedInput: intent.expectedInput,
        choices: intent.choices
      })
    });

    if (!response.ok) {
      const errorText = await response.text();
      throw new Error(`Clara API failed with ${response.status}: ${errorText}`);
    }

    const data = (await response.json()) as ClaraTextResult;
    if (!data.text) {
      throw new Error("Clara API returned no text");
    }

    console.log("Using AI Clara response", { intent, text: data.text });
    return data;
  } catch (error) {
    const fallback = fallbackClaraText(intent);
    console.warn("Using fallback Clara response", { error, intent, text: fallback });
    return {
      text: fallback,
      selectedThread: intent.activeThread ?? intent.focusElement,
      threadConfidence: intent.activeThread ? intent.threadConfidence : 0.65
    };
  }
}

async function generateClaraFromConversation(
  session: CurrentSession,
  profile: Profile | null,
  previousSessions: CompletedSession[],
  intentContext?: UserIntentContext
): Promise<ClaraTextResult> {
  const transcript = sessionTranscript(session, 10);
  const opener = sessionOpener(session);
  const memory = [
    profileMemory(profile, previousSessions),
    sessionTouchpointContext(session),
    intentContext ? `Detected user intent: ${intentContext.userIntent}` : "",
    intentContext?.decisionFrame ? decisionFrameMemory(intentContext.decisionFrame) : "",
    intentContext?.decisionFrameUpdate ? decisionFrameUpdateMemory(intentContext.decisionFrameUpdate) : ""
  ]
    .filter(Boolean)
    .join("\n");

  try {
    console.log("Calling Clara lab-style route", {
      opener,
      transcript,
      memory,
      depth: session.currentDepth,
      userIntent: intentContext?.userIntent,
      decisionFrame: intentContext?.decisionFrame,
      decisionFrameUpdate: intentContext?.decisionFrameUpdate
    });
    const response = await fetch("/api/clara-lab", {
      method: "POST",
      headers: {
        "Content-Type": "application/json"
      },
      body: JSON.stringify({
        opener,
        transcript,
        memory,
        depth: session.currentDepth,
        userIntent: intentContext?.userIntent,
        decisionFrame: intentContext?.decisionFrame,
        decisionFrameUpdate: intentContext?.decisionFrameUpdate
      })
    });

    const data = (await response.json()) as ClaraLabResponse;
    if (!response.ok || !data.text) {
      throw new Error(data.detail || data.error || `Clara lab-style API failed with ${response.status}`);
    }

    console.log("Using lab-style Clara response", { text: data.text, fallbackUsed: data.fallbackUsed });
    return {
      text: data.text
    };
  } catch (error) {
    const fallback = fallbackConversationText(session);
    console.warn("Using fallback Clara conversation response", { error, text: fallback });
    return {
      text: fallback
    };
  }
}

function fallbackConversationText(session: CurrentSession) {
  const latestUser = [...session.messages].reverse().find((message) => message.role === "user")?.text ?? "";
  const lower = latestUser.toLowerCase();

  if (isContinueSignal(latestUser)) {
    return "Okay. What feels worth staying with from here?";
  }

  if (isSeriousLifeEvent(latestUser)) {
    return "I'm really sorry. That's a lot to have close to you. Do you want to say what today has been like with that in the background?";
  }

  if (isCorrectionSignal(latestUser)) {
    return "Right - fair correction. What would be the better way to say it?";
  }

  if (isDecisionMoment(latestUser)) {
    const frame = decisionFrameFromText(latestUser, session);
    const threads = frame.threads.slice(0, 3).join(", ");
    const tradeoff = frame.tradeoffs[0];

    if (tradeoff) {
      return `This sounds like a real ${tradeoff} decision. I'd separate it into ${threads}. Which one feels most important to look at first?`;
    }

    return `This sounds like a decision with a few moving pieces. I'd start with ${threads}. Which one should we look at first?`;
  }

  if (lower.includes("work") && (lower.includes("annoying") || lower.includes("hard"))) {
    return "Work got under your skin today. What made it land that way?";
  }

  return "That makes sense. What part of that feels closest right now?";
}

function fallbackClaraText(intent: ResponseIntent) {
  const themes = new Set(intent.themes);
  const memory = intent.memoryContext[0];
  const choiceText = intent.choices?.join(" or ");
  const lowerUserText = intent.userText.toLowerCase();
  const focus = intent.activeThread || intent.focusElement || intent.concreteReferences[0] || "this";
  const reference = intent.concreteReferences.includes(focus) ? focus : intent.concreteReferences[0] ?? focus;

  if (intent.intent === "close") {
    return "Saved for today. I'll keep an eye on what keeps showing up.";
  }

  if (intent.intent === "save" && intent.expectedInput === "none") {
    return "Saved. That's a good place to leave it for today.";
  }

  if (intent.intent === "save" && intent.expectedInput === "choice") {
    if (themes.has("family") || themes.has("joy") || themes.has("presence")) {
      return `${capitalize(focus)} has some life in it. Keep going, save this, or done for today?`;
    }

    return `${capitalize(focus)} still has a little room. Keep going, save this, or done for today?`;
  }

  if (intent.intent === "pattern_notice") {
    if (themes.has("family") && themes.has("joy")) {
      return memory ?? "Your kids keep showing up as the good part. What did they give back today?";
    }

    return memory ?? `${capitalize(reference)} has come up before. What felt different this time?`;
  }

  if (intent.intent === "choice") {
    if (intent.choices?.includes("Name what made it annoying")) {
      return "Work got under your skin today. What made it annoying?";
    }

    if ((themes.has("work") || themes.has("stress")) && (themes.has("family") || themes.has("joy"))) {
      return `${capitalize(focus)} stands out against the rest of the day. What made it different?`;
    }

    if (choiceText) {
      return `${capitalize(focus)} still has a little room. ${choiceText}?`;
    }
  }

  if (intent.intent === "followup") {
    if (normalizeChoice(intent.userText) === "name what made it annoying") {
      return "Work is the part to name. What made it annoying?";
    }

    if (isDinnerChoice(intent.userText) || lowerUserText.includes("dinner")) {
      return "Dinner felt different. What changed there?";
    }

    if (isChaosChoice(intent.userText) || lowerUserText.includes("chaos")) {
      return "The chaos is the part to name. What took the most from you?";
    }

    if (themes.has("presence")) {
      return `${capitalize(focus)} had your attention. What made it feel different?`;
    }

    if (themes.has("work")) {
      if (focus !== "work") {
        return `${capitalize(focus)} is the real shape of it. What do you see them starting to pick up?`;
      }

      return "Work got your attention. What about it stood out?";
    }

    return `${capitalize(reference)} stands out. What made it stick?`;
  }

  if (intent.sentiment === "negative") {
    return `${capitalize(focus)} took something out of the day. What made it hit hardest?`;
  }

  if (intent.sentiment === "positive") {
    return `${capitalize(focus)} has some energy in it. What did you like about it?`;
  }

  return `${capitalize(focus)} stands out. What made it stick?`;
}

function isSaveChoice(text: string) {
  return ["save this", "save it", "mark that", "keep it close"].includes(normalizeChoice(text));
}

function isCloseChoice(text: string) {
  return ["done for today", "leave it there", "end", "stop here", "a pause"].includes(normalizeChoice(text));
}

function isDinnerChoice(text: string) {
  return ["dinner", "the dinner", "what restored me"].includes(normalizeChoice(text));
}

function isChaosChoice(text: string) {
  return ["chaos", "the chaos", "what drained me"].includes(normalizeChoice(text));
}

function isDepthChoice(text: string) {
  return ["keep going", "go deeper", "say one more thing", "name what made it annoying", "look at the pattern", "clarity"].includes(
    normalizeChoice(text)
  );
}

function isLightChoice(text: string) {
  return ["stay light", "leave it there", "comfort"].includes(normalizeChoice(text));
}

function normalizeChoice(text: string) {
  return text.trim().toLowerCase();
}

function isAnnoyingWorkResponse(text: string, classification: EntryClassification) {
  const lower = text.toLowerCase();
  const namesWork = classification.themes.includes("work") || lower.includes("work");
  const namesAnnoyance = ["annoying", "annoyed", "irritating", "frustrating", "got under my skin"].some((word) =>
    lower.includes(word)
  );

  return namesWork && namesAnnoyance;
}

function stableIndex(text: string, size: number) {
  const total = Array.from(text).reduce((sum, char) => sum + char.charCodeAt(0), 0);
  return total % size;
}

function formatDate(value: string) {
  return new Intl.DateTimeFormat("en", {
    month: "short",
    day: "numeric",
    hour: "numeric",
    minute: "2-digit"
  }).format(new Date(value));
}

function sessionDisplayLabel(session: Pick<CurrentSession, "touchpointType" | "momentKind" | "eventType">) {
  if (session.touchpointType === "morning_orientation") return "Morning Orientation";
  if (session.touchpointType === "evening_reflection") return "Evening Reflection";
  if (session.touchpointType === "marked_moment") return session.momentKind ?? "Marked Moment";
  if (session.touchpointType === "before_event") return `Before ${session.eventType ?? "Event"}`;
  if (session.touchpointType === "after_event") return `After ${session.eventType ?? "Event"}`;
  return "Daily check-in";
}

function weeklyMeaningTranscript(records: CompletedSession[]) {
  const lines = records
    .slice(0, 10)
    .map((session) => {
      const date = formatDate(session.startedAt);
      const label = sessionDisplayLabel(session);
      const context = session.momentKind ? `, context: ${session.momentKind}` : "";
      const userText = sessionText(session) || session.summary;

      return `- ${date} [${label}${context}]: ${userText}`;
    })
    .join("\n");

  return `User: Please review these saved check-ins and lightweight moments from this week.\n${lines}`;
}

function fallbackWeeklyMeaningThread(records: CompletedSession[]) {
  const summaries = records.map((session) => session.summary).filter(Boolean);
  const label = records.find((session) => session.touchpointType && session.touchpointType !== "daily_check_in");
  const anchor = summaries[0] ?? "your recent check-ins";

  return [
    `Observed pattern: ${label ? sessionDisplayLabel(label) : "Your check-ins"} kept showing up this week.`,
    `Meaning thread: ${anchor}`,
    "Question: What feels worth protecting from that next week?"
  ].join("\n");
}

function weeklyMeaningNotesTranscript(notes: MeaningNote[]) {
  const lines = notes
    .slice(0, 12)
    .map((note) => {
      const lenses = note.lenses.length > 0 ? ` lenses: ${note.lenses.join(", ")};` : "";
      const themes = note.themes.length > 0 ? ` themes: ${note.themes.join(", ")};` : "";

      return `- ${formatDate(note.createdAt)} [${note.sourceLabel};${lenses}${themes}] ${note.meaningNote}`;
    })
    .join("\n");

  return `User: Please review these saved Meaning Notes from this week.\n${lines}`;
}

function fallbackWeeklyMeaningFromNotes(notes: MeaningNote[]) {
  const first = notes[0];
  const repeatedLens = mostCommon(notes.flatMap((note) => note.lenses));
  const repeatedTheme = mostCommon(notes.flatMap((note) => note.themes));
  const anchor = repeatedLens || repeatedTheme || "what keeps asking for attention";

  return first
    ? `This week, ${first.sourceLabel.toLowerCase()} and ${anchor} seem to point toward one larger thread: ${first.meaningNote}\n\nDoes that feel true?`
    : "There is not quite enough saved meaning yet. Does that feel true?";
}

function meaningNoteFromResponse(session: CompletedSession, response: MeaningNoteResponse): MeaningNote {
  return {
    id: crypto.randomUUID(),
    createdAt: new Date().toISOString(),
    sourceSessionId: session.sessionId,
    sourceStartedAt: session.startedAt,
    sourceTouchpointType: session.touchpointType ?? "daily_check_in",
    sourceLabel: sessionDisplayLabel(session),
    meaningNote: response.meaningNote?.trim() || fallbackMeaningNoteText(session),
    lenses: cleanStringList(response.lenses).slice(0, 4),
    themes: cleanStringList(response.themes).slice(0, 5),
    confidence: response.confidence ?? "medium"
  };
}

function fallbackMeaningNoteForSession(session: CompletedSession): MeaningNote {
  const tags = sessionTags(session);

  return {
    id: crypto.randomUUID(),
    createdAt: new Date().toISOString(),
    sourceSessionId: session.sessionId,
    sourceStartedAt: session.startedAt,
    sourceTouchpointType: session.touchpointType ?? "daily_check_in",
    sourceLabel: sessionDisplayLabel(session),
    meaningNote: fallbackMeaningNoteText(session),
    lenses: tags.slice(0, 3),
    themes: tags.slice(0, 4),
    confidence: "low"
  };
}

function fallbackMeaningNoteText(session: CompletedSession) {
  const text = session.summary || sessionText(session) || "this moment";
  const label = sessionDisplayLabel(session).toLowerCase();

  return `${text} seems to be something worth remembering from this ${label}.`;
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

function decisionFrameFromText(text: string, session: CurrentSession): DecisionFrame {
  const decisionType = inferDecisionType(text);
  const createdAt = new Date().toISOString();
  const criteria = inferDecisionCriteria(text, decisionType);
  const tradeoffs = inferDecisionTradeoffs(text, decisionType);
  const threads = inferDecisionThreads(text, decisionType, criteria, tradeoffs);
  const knowns = inferDecisionKnowns(text, decisionType);
  const unknowns = inferDecisionUnknowns(text, decisionType);
  const currentFocus = chooseDecisionCurrentFocus({ threads, criteria, tradeoffs, unknowns });

  return {
    id: crypto.randomUUID(),
    createdAt,
    updatedAt: createdAt,
    question: decisionQuestionFromText(text),
    decisionType,
    status: "open",
    threads,
    criteria,
    tradeoffs,
    knowns,
    unknowns,
    currentFocus,
    nextStep: inferDecisionNextStep(text, decisionType, tradeoffs),
    sourceSessionId: session.sessionId
  };
}

function inferDecisionType(text: string): DecisionFrameType {
  const lower = text.toLowerCase();

  if (/\bmeeting\b/.test(lower)) return "meeting";
  if (/\bgoal|goals|what kind of\b/.test(lower)) return "goals";
  if (/\bjob|career|boss|client|work\b/.test(lower)) return "work";
  if (/\bkids?|children|family|parent|school|teacher|program|coaching\b/.test(lower)) return "family";
  if (/\bmove|moving|town|city|home\b/.test(lower)) return "life";
  return "other";
}

function decisionQuestionFromText(text: string) {
  return text.trim().replace(/\s+/g, " ").slice(0, 320);
}

function inferDecisionOptions(text: string, decisionType: DecisionFrameType) {
  const lower = text.toLowerCase();
  const between = text.match(/\bbetween\s+(.+?)\s+(?:and|or|vs\.?|versus)\s+(.+?)(?:[.!?]|$)/i);
  if (between) {
    return cleanStringList([between[1], between[2]]).map(shortenDecisionItem).slice(0, 4);
  }

  const whether = text.match(/\bwhether to\s+([^.!?]+)/i);
  if (whether) {
    const option = shortenDecisionItem(whether[1]);
    return cleanStringList([option, `not ${option}`]).slice(0, 2);
  }

  if (/\bmoving?\b/.test(lower)) return ["stay", "move"];
  if (/\bchange jobs?\b|\bchanging jobs?\b/.test(lower)) return ["stay in the current job", "change jobs"];
  if (decisionType === "meeting") return ["prepare the outcome", "prepare the role", "prepare the tone"];

  return [];
}

function inferDecisionThreads(
  text: string,
  decisionType: DecisionFrameType,
  criteria: string[] = [],
  tradeoffs: string[] = []
) {
  const lower = text.toLowerCase();
  const threads: string[] = [];

  if (/\bkids?|children|school|teacher|program|challeng/.test(lower)) {
    threads.push("kids' happiness now", "academic challenge", "what they may need later");
  }
  if (/\bbudget cuts?|programs? .*\bcut|teachers? .*\bcut\b/.test(lower)) {
    threads.push("future school cuts");
  }
  if (/\bmove|moving|town|home|community|friends?\b/.test(lower)) {
    threads.push("belonging where you are", "cost of moving");
  }
  if (/\bjob|career|work\b/.test(lower)) {
    threads.push("growth", "stability", "energy", "family load");
  }
  if (decisionType === "meeting") {
    threads.push("meeting outcome", "your role", "how you want to show up");
  }
  if (decisionType === "goals") {
    threads.push("what deserves attention", "actual bandwidth", "this season of life");
  }

  return uniqueStrings([...threads, ...tradeoffs, ...criteria]).slice(0, 5);
}

function inferDecisionCriteria(text: string, decisionType: DecisionFrameType) {
  const lower = text.toLowerCase();
  const criteria: string[] = [];

  if (/\bkids?|children|school|teacher|program|challeng/.test(lower)) {
    criteria.push("what the kids need now", "what they may need later", "the family life you want to protect");
  }
  if (/\bhappy|belong|friends?|town|community\b/.test(lower)) {
    criteria.push("belonging");
  }
  if (/\bjob|career|work|money|salary\b/.test(lower)) {
    criteria.push("growth", "stability", "money", "family load");
  }
  if (decisionType === "meeting") {
    criteria.push("outcome", "role", "mindset");
  }
  if (decisionType === "goals") {
    criteria.push("attention", "capacity", "what this season is asking for");
  }

  const fallbackByType: Record<DecisionFrameType, string[]> = {
    life: ["what matters most", "timing", "cost of staying", "cost of changing"],
    work: ["growth", "stability", "energy", "family load"],
    family: ["what the family needs", "belonging", "growth", "stability"],
    goals: ["attention", "capacity", "season of life"],
    meeting: ["outcome", "role", "mindset"],
    other: ["what matters most", "tradeoffs", "timing"]
  };

  return uniqueStrings([...criteria, ...fallbackByType[decisionType]]).slice(0, 4);
}

function inferDecisionTradeoffs(text: string, decisionType: DecisionFrameType) {
  const lower = text.toLowerCase();
  const tradeoffs: string[] = [];

  if (/\bhappy|belong|community|friends?\b/.test(lower) && /\bchalleng|growth|program|teacher|cut\b/.test(lower)) {
    tradeoffs.push("belonging vs growth", "current happiness vs future opportunity");
  }
  if (/\bmove|moving|stay\b/.test(lower)) {
    tradeoffs.push("stability vs change");
  }
  if (/\bjob|career|work\b/.test(lower)) {
    tradeoffs.push("growth vs stability", "money vs energy");
  }
  if (decisionType === "meeting") {
    tradeoffs.push("outcome vs relationship", "preparation vs presence");
  }
  if (decisionType === "goals") {
    tradeoffs.push("ambition vs bandwidth", "focus vs possibility");
  }

  return uniqueStrings(tradeoffs).slice(0, 4);
}

function inferDecisionKnowns(text: string, decisionType: DecisionFrameType) {
  const lower = text.toLowerCase();
  const knowns: string[] = [];

  if (/\bkids?|children\b/.test(lower) && /\bhappy\b/.test(lower)) knowns.push("the kids are happy here");
  if (/\bbudget cuts?\b/.test(lower)) knowns.push("budget cuts are part of the picture");
  if (/\bprograms? .*\bcut|teachers? .*\bcut\b/.test(lower)) knowns.push("programs or teachers may be cut");
  if (/\bnot being challenged|not challenged|aren'?t challenged|arent challenged\b/.test(lower)) {
    knowns.push("the current challenge level is a concern");
  }
  if (/\bbig meeting|meeting coming up\b/.test(lower)) knowns.push("there is a meeting coming up");
  if (/\bdeciding|trying to choose|trying to decide|thinking about\b/.test(lower)) {
    knowns.push("this is still open");
  }
  if (decisionType === "goals" && /\bgoals?\b/.test(lower)) knowns.push("the question is about what to aim at");

  return uniqueStrings(knowns).slice(0, 5);
}

function inferDecisionUnknowns(text: string, decisionType: DecisionFrameType) {
  const lower = text.toLowerCase();
  const unknowns: string[] = [];

  if (/\bchalleng|academic|school\b/.test(lower)) unknowns.push("whether the current environment will stretch them enough");
  if (/\bbudget cuts?|programs? .*\bcut|teachers? .*\bcut\b/.test(lower)) {
    unknowns.push("what the cuts will actually change");
  }
  if (/\bmove|moving|town|home|community|friends?\b/.test(lower)) unknowns.push("what moving would cost socially");
  if (/\bjob|career|work\b/.test(lower)) unknowns.push("what the change would ask from your energy and family life");
  if (decisionType === "meeting") unknowns.push("what outcome would make the meeting worth it");
  if (decisionType === "goals") unknowns.push("what has enough room to matter right now");
  if (/\bi don'?t know|not sure|unclear|wonder|worry\b/.test(lower)) {
    unknowns.push(shortenDecisionItem(text));
  }

  return uniqueStrings(unknowns).slice(0, 5);
}

function chooseDecisionCurrentFocus({
  threads,
  criteria,
  tradeoffs,
  unknowns
}: {
  threads: string[];
  criteria: string[];
  tradeoffs: string[];
  unknowns: string[];
}) {
  return tradeoffs[0] ?? threads[0] ?? criteria[0] ?? unknowns[0] ?? null;
}

function inferDecisionNextStep(text: string, decisionType: DecisionFrameType, tradeoffs: string[] = []) {
  if (decisionType === "meeting") return "Name the outcome that would make the meeting worth the time.";
  if (decisionType === "goals") return "Choose the one area that deserves attention first.";
  if (tradeoffs.length > 0) return "Choose which side of the tradeoff feels heavier right now.";
  if (inferDecisionOptions(text, decisionType).length > 1) return "Name which option feels most alive or most costly right now.";
  return "Choose the thread to explore first.";
}

function shortenDecisionItem(text: string) {
  return text.trim().replace(/\s+/g, " ").replace(/^whether to\s+/i, "").slice(0, 80);
}

function uniqueStrings(values: string[]) {
  return Array.from(new Set(values.map((value) => value.trim()).filter(Boolean)));
}

function inferDecisionFrameUpdate(text: string, frame: DecisionFrame): DecisionFrameUpdate {
  if (isLowSignalFrameReply(text)) {
    return emptyDecisionFrameUpdate(frame.currentFocus);
  }

  const lower = text.toLowerCase();
  const threads: string[] = [];
  const criteria: string[] = [];
  const tradeoffs: string[] = [];
  const knowns: string[] = [];
  const unknowns: string[] = [];
  let nextStep: string | null = null;

  if (/\bhappy\b/.test(lower) && /\bchalleng|growth|academic|school\b/.test(lower)) {
    threads.push("kids' happiness now", "academic growth over time");
    criteria.push("happiness", "academic challenge");
    tradeoffs.push("happiness now vs growth over time");
    knowns.push("the kids are happy here");
    unknowns.push("whether they are being challenged enough");
  }

  if (/\bbudget cuts?|programs? .*\bcut|teachers? .*\bcut\b/.test(lower)) {
    threads.push("future school cuts");
    tradeoffs.push("stability now vs uncertainty ahead");
    knowns.push("cuts are part of the picture");
    unknowns.push("what the cuts will actually change");
  }

  if (/\bmove|moving|town|home|community|friends?\b/.test(lower)) {
    threads.push("belonging where you are", "cost of moving");
    criteria.push("belonging", "stability");
    tradeoffs.push("stability vs change");
    unknowns.push("what moving would cost socially");
  }

  if (/\bjob|career|work\b/.test(lower)) {
    threads.push("growth", "stability", "energy", "family load");
    criteria.push("growth", "stability", "energy");
    tradeoffs.push("growth vs stability");
    unknowns.push("what this would ask from your energy and family life");
  }

  if (/\bmeeting\b/.test(lower)) {
    threads.push("meeting outcome", "your role", "how you want to show up");
    criteria.push("outcome", "role", "mindset");
    unknowns.push("what outcome would make the meeting worth it");
    nextStep = "Name the outcome that would make the meeting worth the time.";
  }

  if (/\bgoal|goals\b/.test(lower)) {
    threads.push("what deserves attention", "actual bandwidth");
    criteria.push("attention", "capacity");
    tradeoffs.push("ambition vs bandwidth");
  }

  if (/\bi know|we know|definitely|for sure|it's clear|its clear\b/.test(lower)) {
    knowns.push(shortenDecisionItem(text));
  }

  if (/\bi don'?t know|we don'?t know|not sure|unclear|wonder|worry|question is\b/.test(lower)) {
    unknowns.push(shortenDecisionItem(text));
  }

  if (/\bnext step|we should|i should|need to|we need to|i need to\b/.test(lower)) {
    nextStep = shortenDecisionItem(text);
  }

  if (threads.length === 0 && criteria.length === 0 && tradeoffs.length === 0 && knowns.length === 0 && unknowns.length === 0) {
    if (text.trim().split(/\s+/).filter(Boolean).length >= 8) {
      knowns.push(shortenDecisionItem(text));
    }
  }

  return {
    threads: uniqueStrings(threads).slice(0, 5),
    criteria: uniqueStrings(criteria).slice(0, 5),
    tradeoffs: uniqueStrings(tradeoffs).slice(0, 5),
    knowns: uniqueStrings(knowns).slice(0, 5),
    unknowns: uniqueStrings(unknowns).slice(0, 5),
    currentFocus: chooseDecisionCurrentFocus({ threads, criteria, tradeoffs, unknowns }) ?? frame.currentFocus,
    nextStep
  };
}

function applyDecisionFrameUpdate(frame: DecisionFrame, update: DecisionFrameUpdate): DecisionFrame {
  return {
    ...frame,
    updatedAt: new Date().toISOString(),
    threads: uniqueStrings([...frame.threads, ...update.threads]).slice(0, 8),
    criteria: uniqueStrings([...frame.criteria, ...update.criteria]).slice(0, 8),
    tradeoffs: uniqueStrings([...frame.tradeoffs, ...update.tradeoffs]).slice(0, 8),
    knowns: uniqueStrings([...frame.knowns, ...update.knowns]).slice(0, 8),
    unknowns: uniqueStrings([...frame.unknowns, ...update.unknowns]).slice(0, 8),
    currentFocus: update.currentFocus ?? frame.currentFocus,
    nextStep: update.nextStep ?? frame.nextStep
  };
}

function emptyDecisionFrameUpdate(currentFocus: string | null): DecisionFrameUpdate {
  return {
    threads: [],
    criteria: [],
    tradeoffs: [],
    knowns: [],
    unknowns: [],
    currentFocus,
    nextStep: null
  };
}

function hasDecisionFrameUpdate(update: DecisionFrameUpdate) {
  return (
    update.threads.length > 0 ||
    update.criteria.length > 0 ||
    update.tradeoffs.length > 0 ||
    update.knowns.length > 0 ||
    update.unknowns.length > 0 ||
    update.nextStep !== null
  );
}

function isLowSignalFrameReply(text: string) {
  return isYesSignal(text) || isNoSignal(text) || isAcknowledgement(text) || isContinueSignal(text);
}

function decisionFrameUpdateMemory(update: DecisionFrameUpdate) {
  if (!hasDecisionFrameUpdate(update)) return "";

  const lines = [
    "Latest user reply added to the frame:",
    update.threads.length > 0 ? `Threads added: ${update.threads.join(", ")}` : "",
    update.criteria.length > 0 ? `Criteria added: ${update.criteria.join(", ")}` : "",
    update.tradeoffs.length > 0 ? `Tradeoffs added: ${update.tradeoffs.join(", ")}` : "",
    update.knowns.length > 0 ? `Knowns added: ${update.knowns.join(", ")}` : "",
    update.unknowns.length > 0 ? `Unknowns added: ${update.unknowns.join(", ")}` : "",
    update.currentFocus ? `Current focus: ${update.currentFocus}` : "",
    update.nextStep ? `Next step added: ${update.nextStep}` : "",
    "Acknowledge the frame update naturally. Say things like 'I'd put that under tradeoffs' or 'That seems like one of the big unknowns.'"
  ];

  return lines.filter(Boolean).join("\n");
}

function decisionFrameMemory(frame: DecisionFrame) {
  const lines = [
    "Decision Frame v1 is active.",
    `Decision question: ${frame.question}`,
    `Decision type: ${frame.decisionType}`,
    `Frame status: ${frame.status}`,
    frame.currentFocus ? `Current focus: ${frame.currentFocus}` : "",
    frame.threads.length > 0 ? `Threads: ${frame.threads.join(", ")}` : "",
    frame.criteria.length > 0 ? `Criteria: ${frame.criteria.join(", ")}` : "",
    frame.tradeoffs.length > 0 ? `Tradeoffs: ${frame.tradeoffs.join(", ")}` : "",
    frame.knowns.length > 0 ? `Knowns: ${frame.knowns.join(", ")}` : "",
    frame.unknowns.length > 0 ? `Unknowns: ${frame.unknowns.join(", ")}` : "",
    frame.nextStep ? `Small next step: ${frame.nextStep}` : "",
    "Use the frame_decision listening move. Do not decide for the user.",
    "Each question should connect to one part of the frame: a thread, tradeoff, criterion, unknown, or next step."
  ];

  return lines.filter(Boolean).join("\n");
}

function sameDecisionFrame(a: DecisionFrame, b: DecisionFrame) {
  return a.sourceSessionId === b.sourceSessionId && normalizeDecisionQuestion(a.question) === normalizeDecisionQuestion(b.question);
}

function activeDecisionFrameForSession(frames: DecisionFrame[], session: CurrentSession | null) {
  if (!session) return null;
  return frames.find((frame) => frame.sourceSessionId === session.sessionId && frame.status === "open") ?? null;
}

function shouldUpdateDecisionFrameFromIntent(intent: UserIntent) {
  return intent === "substantive_response" || intent === "confirm" || intent === "correction";
}

function normalizeDecisionQuestion(text: string) {
  return text.toLowerCase().replace(/[^a-z0-9]+/g, " ").trim();
}

function cleanStringList(value: unknown) {
  return Array.isArray(value)
    ? Array.from(new Set(value.filter((item): item is string => typeof item === "string").map((item) => item.trim()).filter(Boolean)))
    : [];
}

function mostCommon(values: string[]) {
  const counts = values.reduce<Record<string, number>>((current, value) => {
    current[value] = (current[value] ?? 0) + 1;
    return current;
  }, {});

  return Object.entries(counts).sort((a, b) => b[1] - a[1])[0]?.[0] ?? "";
}

function isToday(value: string) {
  return new Date(value).toDateString() === new Date().toDateString();
}

function depthToEngine(depth: StoredDepth): EngineDepth {
  return normalizeEngineDepth(depth);
}

function engineToDepth(depth: EngineDepth): DepthLabel {
  return depth === "keep_it_light" ? "Keep it light" : "Go a little deeper";
}

function headerDepthLabel(depth: EngineDepth): HeaderDepthLabel {
  return depth === "keep_it_light" ? "Light" : "Deep";
}

function depthHelperText(depth: Depth) {
  if (depth === "keep_it_light") {
    return "Brief, low-pressure check-ins. Clara won't dig unless the moment calls for it.";
  }

  return "More willing to explore patterns, tradeoffs, and what matters underneath.";
}

function normalizeEngineDepth(depth: unknown): EngineDepth {
  if (depth === "keep_it_light" || depth === "Keep it light" || depth === "light" || depth === "Light") {
    return "keep_it_light";
  }
  return "go_a_little_deeper";
}

function normalizeDepth(depth: unknown): Depth {
  return normalizeEngineDepth(depth);
}

function sessionText(session: CurrentSession) {
  return session.messages
    .filter((message) => message.role === "user" && !isMomentKind(message.text))
    .map((message) => message.text)
    .join(" ");
}

function sessionTranscript(session: CurrentSession, limit = 10) {
  return session.messages
    .slice(-limit)
    .map((message) => `${message.role === "clara" ? "Clara" : "User"}: ${message.text}`)
    .join("\n");
}

function sessionOpener(session: CurrentSession) {
  return session.messages.find((message) => message.role === "clara")?.text ?? "";
}

function profileMemory(profile: Profile | null, sessions: CompletedSession[]) {
  const lines: string[] = [];

  if (profile) {
    if (profile.wantsMore.trim()) lines.push(`Wants more: ${profile.wantsMore.trim()}`);
    if (profile.drainsEnergy.trim()) lines.push(`Takes energy: ${profile.drainsEnergy.trim()}`);
    lines.push(`Preferred response mode: ${engineToDepth(profile.depth)} (${profile.depth})`);
  }

  sessions
    .slice(0, 3)
    .filter((session) => session.summary)
    .forEach((session) => lines.push(`Recent check-in: ${session.summary}`));

  return lines.join("\n");
}

function sessionTouchpointContext(session: CurrentSession) {
  const lines: string[] = [];
  lines.push(`Current touchpoint type: ${session.touchpointType ?? "daily_check_in"}`);

  if (session.momentKind) {
    lines.push(`Moment context: ${session.momentKind}`);
  }

  return lines.join("\n");
}

function sessionTags(session: CurrentSession): ThemeTag[] {
  return Array.from(new Set(inferTags(sessionText(session))));
}

function sessionOpenerFrame(session: CurrentSession) {
  const opener = session.messages.find((message) => message.role === "clara")?.text.toLowerCase() ?? "";

  if (opener.includes("protect today") || opener.includes("show up today") || opener.includes("attention today")) {
    return "orientation";
  }
  if (opener.includes("worth remembering")) return "evening_reflection";
  if (opener.includes("what happened")) return "marked_moment";
  if (opener.includes("about to enter")) return "before_something";
  if (opener.includes("still with you")) return "after_something";
  if (opener.includes("what did you notice")) return "just_noticed";
  if (opener.includes("get out of this")) return "before_event";
  if (opener.includes("actually happened")) return "after_event";
  if (opener.includes("gave you energy")) return "energy";
  if (opener.includes("took energy")) return "drain";
  if (opener.includes("actually mattered")) return "mattering";
  if (opener.includes("stood out")) return "noticing";
  if (opener.includes("how was your day")) return "general";
  return "general";
}

function sessionTagCounts(sessions: CompletedSession[]) {
  return sessions.reduce<Record<ThemeTag, number>>((counts, session) => {
    session.tags.forEach((tag) => {
      counts[tag] = (counts[tag] ?? 0) + 1;
    });
    return counts;
  }, {} as Record<ThemeTag, number>);
}

function summarizeSession(session: CurrentSession) {
  const firstUserMessage = session.messages.find(
    (message) => message.role === "user" && !isMomentKind(message.text)
  )?.text;
  return firstUserMessage ?? "A quiet check-in.";
}

function parseStoredJson<T>(value: string | null): T | null {
  if (!value) return null;

  try {
    return JSON.parse(value) as T;
  } catch {
    return null;
  }
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null;
}

function isEngineDepth(value: unknown): value is EngineDepth {
  return (
    value === "keep_it_light" ||
    value === "go_a_little_deeper" ||
    value === "light" ||
    value === "thoughtful" ||
    value === "deep"
  );
}

function isSessionStatus(value: unknown): value is SessionStatus {
  return value === "active" || value === "closed";
}

function isExpectedInput(value: unknown): value is ExpectedInput {
  return value === "choice" || value === "text" || value === "none";
}

function isTouchpointType(value: unknown): value is TouchpointType {
  return (
    value === "daily_check_in" ||
    value === "morning_orientation" ||
    value === "evening_reflection" ||
    value === "marked_moment" ||
    value === "before_event" ||
    value === "after_event"
  );
}

function isDecisionFrameType(value: unknown): value is DecisionFrameType {
  return (
    value === "life" ||
    value === "work" ||
    value === "family" ||
    value === "goals" ||
    value === "meeting" ||
    value === "other"
  );
}

function isDecisionFrameStatus(value: unknown): value is DecisionFrameStatus {
  return value === "open" || value === "closed";
}

function isMomentKind(value: unknown): value is MomentKind {
  return value === "Before something" || value === "After something" || value === "Just noticed something";
}

function isConversationMessage(value: unknown): value is ConversationMessage {
  if (!isRecord(value) || typeof value.text !== "string" || typeof value.timestamp !== "string") {
    return false;
  }

  if (value.role === "user") {
    return true;
  }

  if (value.role === "clara") {
    return value.expectedInput === undefined || isExpectedInput(value.expectedInput);
  }

  return false;
}

function isCurrentSession(value: unknown): value is CurrentSession {
  return (
    isRecord(value) &&
    typeof value.sessionId === "string" &&
    typeof value.startedAt === "string" &&
    Array.isArray(value.messages) &&
    value.messages.length > 0 &&
    value.messages.every(isConversationMessage) &&
    isEngineDepth(value.currentDepth) &&
    isSessionStatus(value.status)
  );
}

function isCompletedSession(value: unknown): value is CompletedSession {
  if (!isRecord(value) || !isCurrentSession(value)) return false;

  const completed = value as Record<string, unknown>;
  return typeof completed.endedAt === "string" && typeof completed.summary === "string" && Array.isArray(completed.tags);
}

function isMeaningNote(value: unknown): value is MeaningNote {
  return (
    isRecord(value) &&
    typeof value.id === "string" &&
    typeof value.createdAt === "string" &&
    typeof value.sourceSessionId === "string" &&
    typeof value.sourceStartedAt === "string" &&
    isTouchpointType(value.sourceTouchpointType) &&
    typeof value.sourceLabel === "string" &&
    typeof value.meaningNote === "string" &&
    Array.isArray(value.lenses) &&
    value.lenses.every((item) => typeof item === "string") &&
    Array.isArray(value.themes) &&
    value.themes.every((item) => typeof item === "string") &&
    (value.confidence === "low" || value.confidence === "medium" || value.confidence === "high")
  );
}

function isDecisionFrame(value: unknown): value is DecisionFrame {
  return (
    isRecord(value) &&
    typeof value.id === "string" &&
    typeof value.createdAt === "string" &&
    typeof value.updatedAt === "string" &&
    typeof value.question === "string" &&
    isDecisionFrameType(value.decisionType) &&
    isDecisionFrameStatus(value.status) &&
    Array.isArray(value.threads) &&
    value.threads.every((item) => typeof item === "string") &&
    Array.isArray(value.criteria) &&
    value.criteria.every((item) => typeof item === "string") &&
    Array.isArray(value.tradeoffs) &&
    value.tradeoffs.every((item) => typeof item === "string") &&
    Array.isArray(value.knowns) &&
    value.knowns.every((item) => typeof item === "string") &&
    Array.isArray(value.unknowns) &&
    value.unknowns.every((item) => typeof item === "string") &&
    (value.currentFocus === null || typeof value.currentFocus === "string") &&
    (value.nextStep === null || typeof value.nextStep === "string") &&
    (value.sourceSessionId === null || typeof value.sourceSessionId === "string")
  );
}

function normalizeDecisionFrame(value: unknown): DecisionFrame | null {
  if (!isRecord(value)) return null;

  if (isDecisionFrame(value)) {
    return value;
  }

  if (
    typeof value.id !== "string" ||
    typeof value.createdAt !== "string" ||
    typeof value.question !== "string" ||
    !isDecisionFrameType(value.decisionType)
  ) {
    return null;
  }

  const criteria = cleanStringList(value.criteria);
  const tradeoffs = cleanStringList(value.tradeoffs);
  const legacyOptions = cleanStringList(value.options);
  const threads = uniqueStrings([...cleanStringList(value.threads), ...legacyOptions, ...tradeoffs, ...criteria]).slice(0, 8);
  const unknowns = cleanStringList(value.unknowns);

  return {
    id: value.id,
    createdAt: value.createdAt,
    updatedAt: typeof value.updatedAt === "string" ? value.updatedAt : value.createdAt,
    question: value.question,
    decisionType: value.decisionType,
    status: isDecisionFrameStatus(value.status) ? value.status : "open",
    threads,
    criteria,
    tradeoffs,
    knowns: cleanStringList(value.knowns),
    unknowns,
    currentFocus:
      typeof value.currentFocus === "string"
        ? value.currentFocus
        : chooseDecisionCurrentFocus({ threads, criteria, tradeoffs, unknowns }),
    nextStep: typeof value.nextStep === "string" ? value.nextStep : null,
    sourceSessionId: typeof value.sourceSessionId === "string" ? value.sourceSessionId : null
  };
}

function normalizeSession(session: CurrentSession): CurrentSession {
  return {
    ...session,
    currentDepth: normalizeEngineDepth(session.currentDepth),
    activeThread: typeof session.activeThread === "string" ? session.activeThread : null,
    threadSource: session.threadSource === "user" || session.threadSource === "clara" ? session.threadSource : "clara",
    threadConfidence: typeof session.threadConfidence === "number" ? session.threadConfidence : 0,
    awaitingThreadRedirect:
      typeof (session as CurrentSession & { awaitingThreadRedirect?: unknown }).awaitingThreadRedirect === "boolean"
        ? (session as CurrentSession & { awaitingThreadRedirect: boolean }).awaitingThreadRedirect
        : false,
    threadCorrectionOffered:
      typeof (session as CurrentSession & { threadCorrectionOffered?: unknown }).threadCorrectionOffered === "boolean"
        ? (session as CurrentSession & { threadCorrectionOffered: boolean }).threadCorrectionOffered
        : false,
    turnCount:
      typeof (session as CurrentSession & { turnCount?: unknown }).turnCount === "number"
        ? (session as CurrentSession & { turnCount: number }).turnCount
        : session.messages.filter((message) => message.role === "user").length,
    userDepthSignal:
      (session as CurrentSession & { userDepthSignal?: unknown }).userDepthSignal === "medium" ||
      (session as CurrentSession & { userDepthSignal?: unknown }).userDepthSignal === "high"
        ? ((session as CurrentSession & { userDepthSignal: UserDepthSignal }).userDepthSignal)
        : "low",
    touchpointType: isTouchpointType((session as CurrentSession & { touchpointType?: unknown }).touchpointType)
      ? (session as CurrentSession & { touchpointType: TouchpointType }).touchpointType
      : "daily_check_in",
    momentKind: isMomentKind((session as CurrentSession & { momentKind?: unknown }).momentKind)
      ? (session as CurrentSession & { momentKind: MomentKind }).momentKind
      : undefined,
    eventType:
      typeof (session as CurrentSession & { eventType?: unknown }).eventType === "string"
        ? (session as CurrentSession & { eventType: string }).eventType
        : undefined,
    messages: session.messages.map((message, index) => {
      if (message.role === "user") return message;

      return {
        ...message,
        expectedInput: message.expectedInput ?? (index === session.messages.length - 1 ? "text" : "none"),
        choices: message.choices ?? undefined
      };
    })
  };
}

function readProfileFromStorage(): Profile | null {
  const profile = parseStoredJson<Profile & { depth?: unknown }>(window.localStorage.getItem(STORAGE_KEYS.profile));

  if (
    profile &&
    typeof profile.wantsMore === "string" &&
    typeof profile.drainsEnergy === "string"
  ) {
    return {
      wantsMore: profile.wantsMore,
      drainsEnergy: profile.drainsEnergy,
      depth: normalizeDepth(profile.depth)
    };
  }

  if (window.localStorage.getItem(STORAGE_KEYS.profile)) {
    window.localStorage.removeItem(STORAGE_KEYS.profile);
  }

  return null;
}

function readSessionsFromStorage(): CompletedSession[] {
  const storedSessions = window.localStorage.getItem(STORAGE_KEYS.sessions);
  const parsedSessions = parseStoredJson<unknown>(storedSessions);

  if (Array.isArray(parsedSessions)) {
    return parsedSessions.filter(isCompletedSession).map((session) => normalizeSession(session) as CompletedSession);
  }

  if (storedSessions) {
    window.localStorage.removeItem(STORAGE_KEYS.sessions);
  }

  const legacyEntries = parseStoredJson<LegacyEntry[]>(window.localStorage.getItem(STORAGE_KEYS.legacyEntries));
  return Array.isArray(legacyEntries) ? legacyEntriesToSessions(legacyEntries) : [];
}

function readCurrentSessionFromStorage(): CurrentSession | null {
  const storedSession = window.localStorage.getItem(STORAGE_KEYS.currentSession);
  const parsedSession = parseStoredJson<unknown>(storedSession);

  if (isCurrentSession(parsedSession)) {
    return normalizeSession(parsedSession);
  }

  if (storedSession) {
    window.localStorage.removeItem(STORAGE_KEYS.currentSession);
  }

  return null;
}

function readMeaningNotesFromStorage(): MeaningNote[] {
  const storedNotes = window.localStorage.getItem(STORAGE_KEYS.meaningNotes);
  const parsedNotes = parseStoredJson<unknown>(storedNotes);

  if (Array.isArray(parsedNotes)) {
    return parsedNotes.filter(isMeaningNote);
  }

  if (storedNotes) {
    window.localStorage.removeItem(STORAGE_KEYS.meaningNotes);
  }

  return [];
}

function readDecisionFramesFromStorage(): DecisionFrame[] {
  const storedFrames = window.localStorage.getItem(STORAGE_KEYS.decisionFrames);
  const parsedFrames = parseStoredJson<unknown>(storedFrames);

  if (Array.isArray(parsedFrames)) {
    return parsedFrames
      .map(normalizeDecisionFrame)
      .filter((frame): frame is DecisionFrame => frame !== null);
  }

  if (storedFrames) {
    window.localStorage.removeItem(STORAGE_KEYS.decisionFrames);
  }

  return [];
}

function clearPrototypeStorage() {
  Object.values(STORAGE_KEYS).forEach((key) => window.localStorage.removeItem(key));

  Object.keys(window.localStorage)
    .filter((key) => APP_STORAGE_PREFIXES.some((prefix) => key.toLowerCase().startsWith(prefix)))
    .forEach((key) => window.localStorage.removeItem(key));
}

function legacyEntriesToSessions(entries: LegacyEntry[]): CompletedSession[] {
  return entries.map((entry) => ({
    sessionId: entry.id,
    startedAt: entry.createdAt,
    endedAt: entry.createdAt,
    currentDepth: depthToEngine(entry.depth),
    status: "closed",
    activeThread: null,
    threadSource: "clara",
    threadConfidence: 0,
    awaitingThreadRedirect: false,
    threadCorrectionOffered: false,
    turnCount: 1,
    userDepthSignal: inferUserDepthSignal(entry.response),
    touchpointType: "daily_check_in",
    tags: entry.tags,
    summary: entry.response,
    messages: [
      makeStoredClaraMessage(entry.question, entry.createdAt, "text"),
      makeStoredUserMessage(entry.response, entry.createdAt),
      makeStoredClaraMessage(entry.clara, entry.createdAt, "none")
    ]
  }));
}

function makeStoredUserMessage(text: string, timestamp: string): UserMessage {
  return { role: "user", text, timestamp };
}

function makeStoredClaraMessage(
  text: string,
  timestamp: string,
  expectedInput: ExpectedInput,
  choices?: string[]
): ClaraMessage {
  return { role: "clara", text, timestamp, expectedInput, choices };
}

export default function Home() {
  const [ready, setReady] = useState(false);
  const [profile, setProfile] = useState<Profile | null>(null);
  const [draftProfile, setDraftProfile] = useState<Profile>(starterProfile);
  const [currentSession, setCurrentSession] = useState<CurrentSession | null>(null);
  const [sessions, setSessions] = useState<CompletedSession[]>([]);
  const [meaningNotes, setMeaningNotes] = useState<MeaningNote[]>([]);
  const [decisionFrames, setDecisionFrames] = useState<DecisionFrame[]>([]);
  const [pendingMeaningNote, setPendingMeaningNote] = useState<MeaningNote | null>(null);
  const [meaningNoteDraftText, setMeaningNoteDraftText] = useState("");
  const [meaningNoteMode, setMeaningNoteMode] = useState<MeaningNoteMode>("review");
  const [meaningNoteLoading, setMeaningNoteLoading] = useState(false);
  const [meaningNoteError, setMeaningNoteError] = useState("");
  const [answer, setAnswer] = useState("");
  const [tab, setTab] = useState<Tab>("Today");
  const [closingMessage, setClosingMessage] = useState("");
  const [weeklyMeaning, setWeeklyMeaning] = useState("");
  const [weeklyMeaningLoading, setWeeklyMeaningLoading] = useState(false);
  const [weeklyMeaningError, setWeeklyMeaningError] = useState("");
  const [weeklyMeaningFeedback, setWeeklyMeaningFeedback] = useState("");
  const [settingsSaveMessage, setSettingsSaveMessage] = useState("");
  const settingsSaveTimer = useRef<number | null>(null);

  useEffect(() => {
    const parsedProfile = readProfileFromStorage();
    const parsedSessions = readSessionsFromStorage();
    const parsedSession = readCurrentSessionFromStorage();
    const parsedMeaningNotes = readMeaningNotesFromStorage();
    const parsedDecisionFrames = readDecisionFramesFromStorage();

    if (parsedProfile) {
      setProfile(parsedProfile);
      setDraftProfile(parsedProfile);
      window.localStorage.setItem(STORAGE_KEYS.profile, JSON.stringify(parsedProfile));
    }

    setSessions(parsedSessions);
    setMeaningNotes(parsedMeaningNotes);
    setDecisionFrames(parsedDecisionFrames);

    if (parsedSession) {
      if (parsedSession.status === "active" && isToday(parsedSession.startedAt)) {
        setCurrentSession(parsedSession);
      } else {
        window.localStorage.removeItem(STORAGE_KEYS.currentSession);
      }
    } else if (parsedProfile) {
      setCurrentSession(createSession(depthToEngine(parsedProfile.depth)));
    }

    setReady(true);
  }, []);

  useEffect(() => {
    if (ready) {
      window.localStorage.setItem(STORAGE_KEYS.sessions, JSON.stringify(sessions));
    }
  }, [sessions, ready]);

  useEffect(() => {
    if (ready) {
      window.localStorage.setItem(STORAGE_KEYS.meaningNotes, JSON.stringify(meaningNotes));
    }
  }, [meaningNotes, ready]);

  useEffect(() => {
    if (ready) {
      window.localStorage.setItem(STORAGE_KEYS.decisionFrames, JSON.stringify(decisionFrames));
    }
  }, [decisionFrames, ready]);

  useEffect(() => {
    if (!ready) return;

    if (currentSession?.status === "active") {
      window.localStorage.setItem(STORAGE_KEYS.currentSession, JSON.stringify(currentSession));
    }

    if (!currentSession) {
      window.localStorage.removeItem(STORAGE_KEYS.currentSession);
    }
  }, [currentSession, ready]);

  useEffect(() => {
    return () => {
      if (settingsSaveTimer.current) {
        window.clearTimeout(settingsSaveTimer.current);
      }
    };
  }, []);

  function saveProfile(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const isSettingsSave = profile !== null;
    const nextProfile = { ...draftProfile };
    setProfile(nextProfile);
    window.localStorage.setItem(STORAGE_KEYS.profile, JSON.stringify(nextProfile));

    if (!currentSession) {
      setCurrentSession(createSession(depthToEngine(nextProfile.depth)));
    }

    if (isSettingsSave) {
      flashSettingsSaved("Saved");
    }
  }

  async function continueConversation(reply: string) {
    const trimmed = reply.trim();
    if (!trimmed || !currentSession) return;
    const latestClara = [...currentSession.messages].reverse().find((message) => message.role === "clara");
    const isThreadCorrectionChoice = latestClara?.choices?.includes("Something else") ?? false;
    const chosenMomentKind = isMomentKind(trimmed) ? trimmed : null;
    const isInitialMomentKindChoice =
      currentSession.touchpointType === "marked_moment" &&
      currentSession.messages.filter((message) => message.role === "user").length === 0 &&
      chosenMomentKind !== null;

    if (isInitialMomentKindChoice && chosenMomentKind) {
      setCurrentSession({
        ...currentSession,
        momentKind: chosenMomentKind,
        messages: [
          ...currentSession.messages,
          makeUserMessage(chosenMomentKind),
          makeClaraMessage({
            text: momentKindPrompts[chosenMomentKind],
            expectedInput: "text"
          })
        ]
      });
      setAnswer("");
      return;
    }

    if (isThreadCorrectionChoice && normalizeChoice(trimmed) === "something else") {
      setCurrentSession({
        ...currentSession,
        activeThread: null,
        threadSource: "user",
        threadConfidence: 0,
        awaitingThreadRedirect: true,
        messages: [
          ...currentSession.messages,
          makeUserMessage(trimmed),
          makeClaraMessage({
            text: "Got it. What part should we stay with?",
            expectedInput: "text"
          })
        ]
      });
      setAnswer("");
      return;
    }

    const detectedUserIntent = detectUserIntent(trimmed, currentSession);
    console.log("detectedUserIntent", detectedUserIntent);

    if (detectedUserIntent === "polite_close") {
      const closeReason = "polite_close";
      console.log("closeReason", closeReason);
      await closeSession(trimmed, politeCloseText(trimmed));
      return;
    }

    if (detectedUserIntent === "explicit_stop") {
      const closeReason = "explicit_stop";
      console.log("closeReason", closeReason);
      await closeSession(trimmed, "Of course. I'll save this for now.");
      return;
    }

    if (detectedUserIntent === "save") {
      await closeSession(trimmed, "Saved. That's a good place to leave it for today.");
      return;
    }

    if (detectedUserIntent === "ambiguous_response") {
      setCurrentSession({
        ...currentSession,
        messages: [
          ...currentSession.messages,
          makeUserMessage(trimmed),
          makeClaraMessage({
            text: "I need one clearer choice. Which part should we look at first?",
            expectedInput: "text"
          })
        ]
      });
      setAnswer("");
      return;
    }

    if (isCloseChoice(trimmed)) {
      await closeSession(trimmed);
      return;
    }

    if (isSaveChoice(trimmed)) {
      await closeSession(trimmed, "Saved. That's a good place to leave it for today.");
      return;
    }

    const userMessage = makeUserMessage(trimmed);
    const sessionWithReply: CurrentSession = {
      ...withDepthState(currentSession, trimmed),
      messages: [...currentSession.messages, userMessage]
    };
    const existingDecisionFrame = activeDecisionFrameForSession(decisionFrames, currentSession);
    const newDecisionFrame = isDecisionMoment(trimmed) ? decisionFrameFromText(trimmed, sessionWithReply) : null;
    let decisionFrame = newDecisionFrame ?? existingDecisionFrame;
    let decisionFrameUpdate: DecisionFrameUpdate | null = null;

    if (newDecisionFrame) {
      console.log("Decision Frame detected", newDecisionFrame);
      setDecisionFrames((current) =>
        current.some((frame) => sameDecisionFrame(frame, newDecisionFrame)) ? current : [newDecisionFrame, ...current]
      );
    } else if (existingDecisionFrame && shouldUpdateDecisionFrameFromIntent(detectedUserIntent)) {
      const update = inferDecisionFrameUpdate(trimmed, existingDecisionFrame);
      const updatedDecisionFrame = applyDecisionFrameUpdate(existingDecisionFrame, update);
      decisionFrame = updatedDecisionFrame;
      decisionFrameUpdate = hasDecisionFrameUpdate(update) ? update : null;

      if (decisionFrameUpdate) {
        console.log("Decision Frame updated", { frame: updatedDecisionFrame, update });
        setDecisionFrames((current) =>
          current.map((frame) => (frame.id === updatedDecisionFrame.id ? updatedDecisionFrame : frame))
        );
      }
    }

    if (shouldCloseForDepth(sessionWithReply, trimmed)) {
      await closeSession(trimmed, "That's a good place to leave it for today.");
      return;
    }

    if (currentSession.awaitingThreadRedirect) {
      const redirectedSession: CurrentSession = {
        ...sessionWithReply,
        activeThread: trimmed,
        threadSource: "user",
        threadConfidence: 1,
        awaitingThreadRedirect: false,
        threadCorrectionOffered: true
      };
      const claraResult = await generateClaraFromConversation(redirectedSession, profile, sessions, {
        userIntent: detectedUserIntent,
        decisionFrame,
        decisionFrameUpdate
      });
      setCurrentSession(maybeApplyDepthCheck({
        ...redirectedSession,
        messages: [
          ...redirectedSession.messages,
          makeClaraMessage({
            text: claraResult.text,
            expectedInput: "text"
          })
        ]
      }));
      setAnswer("");
      return;
    }

    if (isThreadCorrectionChoice && (normalizeChoice(trimmed) === "yes, that" || normalizeChoice(trimmed) === "yes that")) {
      const claraResult = await generateClaraFromConversation(sessionWithReply, profile, sessions, {
        userIntent: detectedUserIntent,
        decisionFrame,
        decisionFrameUpdate
      });
      setCurrentSession(maybeApplyDepthCheck({
        ...sessionWithReply,
        awaitingThreadRedirect: false,
        messages: [
          ...sessionWithReply.messages,
          makeClaraMessage({
            text: claraResult.text,
            expectedInput: "text"
          })
        ]
      }));
      setAnswer("");
      return;
    }

    const claraResult = await generateClaraFromConversation(sessionWithReply, profile, sessions, {
      userIntent: detectedUserIntent,
      decisionFrame,
      decisionFrameUpdate
    });
    setCurrentSession(
      maybeApplyDepthCheck({
        ...sessionWithReply,
        messages: [
          ...sessionWithReply.messages,
          makeClaraMessage({
            text: claraResult.text,
            expectedInput: "text"
          })
        ]
      })
    );
    setAnswer("");
    return;

    if (normalizeChoice(trimmed) === "name what made it annoying") {
      const focusFields = sessionFocusIntentFields(sessionWithReply);
      const intent: ResponseIntent = {
        intent: "followup",
        strategy: "followup",
        userText: trimmed,
        themes: focusFields.themes,
        sentiment: "neutral",
        depth: "go_a_little_deeper",
        repeatedThemes: [],
        keyElements: focusFields.keyElements,
        focusElement: focusFields.focusElement,
        concreteReferences: focusFields.concreteReferences,
        memoryContext: [],
        activeThread: sessionWithReply.activeThread,
        threadSource: sessionWithReply.threadSource,
        threadConfidence: sessionWithReply.threadConfidence,
        turnCount: sessionWithReply.turnCount,
        userDepthSignal: sessionWithReply.userDepthSignal,
        openerFrame: sessionOpenerFrame(sessionWithReply),
        expectedInput: "text"
      };
      const claraResult = await generateClaraText(intent);
      const nextSession = applyThreadLock(
        {
          ...sessionWithReply,
          currentDepth: "go_a_little_deeper",
          messages: [
            ...sessionWithReply.messages,
            makeClaraMessage({
              text: claraResult.text,
              expectedInput: "text"
            })
          ]
        },
        {
          text: claraResult.text,
          expectedInput: "text",
          selectedThread: claraResult.selectedThread,
          threadConfidence: claraResult.threadConfidence
        },
        trimmed,
        focusFields.focusElement
      );
      setCurrentSession(maybeApplyDepthCheck(nextSession));
      setAnswer("");
      return;
    }

    if (isDepthChoice(trimmed)) {
      const focusFields = sessionFocusIntentFields(sessionWithReply);
      const intent: ResponseIntent = {
        intent: "followup",
        strategy: "followup",
        userText: trimmed,
        themes: focusFields.themes,
        sentiment: "neutral",
        depth: "go_a_little_deeper",
        repeatedThemes: [],
        keyElements: focusFields.keyElements,
        focusElement: focusFields.focusElement,
        concreteReferences: focusFields.concreteReferences,
        memoryContext: [],
        activeThread: sessionWithReply.activeThread,
        threadSource: sessionWithReply.threadSource,
        threadConfidence: sessionWithReply.threadConfidence,
        turnCount: sessionWithReply.turnCount,
        userDepthSignal: sessionWithReply.userDepthSignal,
        openerFrame: sessionOpenerFrame(sessionWithReply),
        expectedInput: "text"
      };
      const claraResult = await generateClaraText(intent);
      const nextSession = applyThreadLock(
        {
          ...sessionWithReply,
          currentDepth: "go_a_little_deeper",
          messages: [
            ...sessionWithReply.messages,
            makeClaraMessage({
              text: claraResult.text,
              expectedInput: "text"
            })
          ]
        },
        {
          text: claraResult.text,
          expectedInput: "text",
          selectedThread: claraResult.selectedThread,
          threadConfidence: claraResult.threadConfidence
        },
        trimmed,
        focusFields.focusElement
      );
      setCurrentSession(maybeApplyDepthCheck(nextSession));
      setAnswer("");
      return;
    }

    if (isLightChoice(trimmed)) {
      const focusFields = sessionFocusIntentFields(sessionWithReply);
      const intent: ResponseIntent = {
        intent: "choice",
        strategy: "choice",
        userText: trimmed,
        themes: focusFields.themes,
        sentiment: "neutral",
        depth: "keep_it_light",
        repeatedThemes: [],
        keyElements: focusFields.keyElements,
        focusElement: focusFields.focusElement,
        concreteReferences: focusFields.concreteReferences,
        memoryContext: [],
        activeThread: sessionWithReply.activeThread,
        threadSource: sessionWithReply.threadSource,
        threadConfidence: sessionWithReply.threadConfidence,
        turnCount: sessionWithReply.turnCount,
        userDepthSignal: sessionWithReply.userDepthSignal,
        openerFrame: sessionOpenerFrame(sessionWithReply),
        expectedInput: "text"
      };
      const claraResult = await generateClaraText(intent);
      const nextSession = applyThreadLock(
        {
          ...sessionWithReply,
          currentDepth: "keep_it_light",
          messages: [
            ...sessionWithReply.messages,
            makeClaraMessage({
              text: claraResult.text,
              expectedInput: "text"
            })
          ]
        },
        {
          text: claraResult.text,
          expectedInput: "text",
          selectedThread: claraResult.selectedThread,
          threadConfidence: claraResult.threadConfidence
        },
        trimmed,
        focusFields.focusElement
      );
      setCurrentSession(maybeApplyDepthCheck(nextSession));
      setAnswer("");
      return;
    }

    const classification = classifyEntry(trimmed, sessions);
    const nextDepth = classification.suggestedDepth;
    const strategy = chooseResponseStrategy(classification, sessionWithReply.currentDepth);
    const claraTurn = await generateClaraResponse(
      trimmed,
      classification,
      strategy,
      sessionWithReply.currentDepth,
      sessions,
      sessionWithReply
    );
    const nextSession = applyThreadLock(
      {
        ...sessionWithReply,
        currentDepth: nextDepth,
        messages: [...sessionWithReply.messages, makeClaraMessage(claraTurn)]
      },
      claraTurn,
      trimmed,
      claraTurn.selectedThread ?? ""
    );

    setCurrentSession(maybeApplyDepthCheck(maybeOfferThreadCorrection(currentSession as CurrentSession, nextSession, claraTurn)));
    setAnswer("");
  }

  function submitReply(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    void continueConversation(answer);
  }

  async function closeSession(choiceText?: string, claraText?: string) {
    if (!currentSession) return;

    const finalClaraText = claraText ?? "That's a good place to leave it for today.";
    const now = new Date().toISOString();
    const messages = choiceText
      ? [
          ...currentSession.messages,
          makeUserMessage(choiceText),
          makeClaraMessage({
            text: finalClaraText,
            expectedInput: "none"
          })
        ]
      : [
          ...currentSession.messages,
          makeClaraMessage({
            text: finalClaraText,
            expectedInput: "none"
          })
        ];
    const closedSession: CompletedSession = {
      ...currentSession,
      status: "closed",
      endedAt: now,
      messages,
      tags: sessionTags({ ...currentSession, messages }),
      summary: summarizeSession({ ...currentSession, messages })
    };

    setSessions((current) => [closedSession, ...current]);
    setCurrentSession(null);
    setAnswer("");
    setClosingMessage(finalClaraText);
    window.localStorage.removeItem(STORAGE_KEYS.currentSession);
    void generateMeaningNoteForSession(closedSession);
  }

  async function generateMeaningNoteForSession(session: CompletedSession) {
    setMeaningNoteLoading(true);
    setMeaningNoteError("");
    setPendingMeaningNote(null);
    setMeaningNoteDraftText("");
    setMeaningNoteMode("review");

    try {
      const response = await fetch("/api/meaning-note", {
        method: "POST",
        headers: {
          "Content-Type": "application/json"
        },
        body: JSON.stringify({
          transcript: sessionTranscript(session, 20),
          opener: sessionOpener(session),
          touchpointType: session.touchpointType ?? "daily_check_in",
          memory: profileMemory(profile, sessions),
          sourceLabel: sessionDisplayLabel(session)
        })
      });
      const data = (await response.json()) as MeaningNoteResponse;

      if (!response.ok || !data.meaningNote) {
        throw new Error(data.detail || data.error || `Meaning Note failed with ${response.status}`);
      }

      const note = meaningNoteFromResponse(session, data);
      setPendingMeaningNote(note);
      setMeaningNoteDraftText(note.meaningNote);
    } catch (error) {
      console.warn("Using fallback Meaning Note", error);
      const note = fallbackMeaningNoteForSession(session);
      setPendingMeaningNote(note);
      setMeaningNoteDraftText(note.meaningNote);
      setMeaningNoteError("Using a local Meaning Note because Clara's extraction route was unavailable.");
    } finally {
      setMeaningNoteLoading(false);
    }
  }

  function savePendingMeaningNote() {
    if (!pendingMeaningNote) return;

    const noteToSave: MeaningNote = {
      ...pendingMeaningNote,
      meaningNote: meaningNoteDraftText.trim() || pendingMeaningNote.meaningNote
    };

    setMeaningNotes((current) => [noteToSave, ...current.filter((note) => note.id !== noteToSave.id)]);
    setPendingMeaningNote(null);
    setMeaningNoteDraftText("");
    setMeaningNoteMode("review");
    setMeaningNoteError("");
    setTab("Meaning");
  }

  function discardPendingMeaningNote() {
    setPendingMeaningNote(null);
    setMeaningNoteDraftText("");
    setMeaningNoteMode("review");
    setMeaningNoteError("");
  }

  function toggleDecisionFrameStatus(id: string) {
    setDecisionFrames((current) =>
      current.map((frame) =>
        frame.id === id
          ? { ...frame, status: frame.status === "open" ? "closed" : "open", updatedAt: new Date().toISOString() }
          : frame
      )
    );
  }

  function updateDecisionFrame(id: string, updates: Partial<DecisionFrame>) {
    setDecisionFrames((current) =>
      current.map((frame) => (frame.id === id ? { ...frame, ...updates, updatedAt: new Date().toISOString() } : frame))
    );
  }

  function updateDepth(depth: Depth) {
    if (!profile) return;
    const nextProfile = { ...draftProfile, depth };
    setProfile(nextProfile);
    setDraftProfile(nextProfile);
    window.localStorage.setItem(STORAGE_KEYS.profile, JSON.stringify(nextProfile));
    flashSettingsSaved("Mode saved");

    if (currentSession) {
      setCurrentSession({
        ...currentSession,
        currentDepth: depthToEngine(depth)
      });
    }
  }

  function flashSettingsSaved(message: string) {
    setSettingsSaveMessage(message);

    if (settingsSaveTimer.current) {
      window.clearTimeout(settingsSaveTimer.current);
    }

    settingsSaveTimer.current = window.setTimeout(() => {
      setSettingsSaveMessage("");
      settingsSaveTimer.current = null;
    }, 2500);
  }

  function startNewSession() {
    if (!profile) return;
    setClosingMessage("");
    setCurrentSession(createSession(depthToEngine(profile.depth)));
  }

  function startTouchpointSession(
    touchpointType: TouchpointType,
    opener: string,
    options: {
      momentKind?: MomentKind;
      choices?: string[];
    } = {}
  ) {
    if (!profile) return;

    setClosingMessage("");
    setAnswer("");
    setCurrentSession(
      createSession(depthToEngine(profile.depth), {
        opener,
        touchpointType,
        momentKind: options.momentKind,
        choices: options.choices
      })
    );
    setTab("Today");
  }

  async function generateWeeklyMeaningThread() {
    if (weeklyMeaningNotes.length === 0) return;

    setWeeklyMeaningLoading(true);
    setWeeklyMeaningError("");
    setWeeklyMeaning("");
    setWeeklyMeaningFeedback("");

    try {
      const response = await fetch("/api/clara-lab", {
        method: "POST",
        headers: {
          "Content-Type": "application/json"
        },
        body: JSON.stringify({
          task:
            "Review these saved Meaning Notes. Generate one plain-language weekly thread in 1-2 sentences, then ask exactly: Does that feel true?",
          opener: "Weekly Meaning Thread",
          memory: profileMemory(profile, sessions),
          depth: profile ? depthToEngine(profile.depth) : "go_a_little_deeper",
          transcript: weeklyMeaningNotesTranscript(weeklyMeaningNotes)
        })
      });
      const data = (await response.json()) as ClaraLabResponse;

      if (!response.ok || !data.text) {
        throw new Error(data.detail || data.error || `Weekly recap failed with ${response.status}`);
      }

      setWeeklyMeaning(data.text);
    } catch (error) {
      console.warn("Using fallback weekly meaning thread", error);
      setWeeklyMeaning(fallbackWeeklyMeaningFromNotes(weeklyMeaningNotes));
      setWeeklyMeaningError("Using a local recap because Clara's response route was unavailable.");
    } finally {
      setWeeklyMeaningLoading(false);
    }
  }

  function resetPrototypeData() {
    const confirmed = window.confirm(
      "Reset all Whyld World Clara prototype data on this device? This clears onboarding, sessions, history, and settings."
    );

    if (!confirmed) return;

    clearPrototypeStorage();
    window.location.reload();
  }

  const weeklySessions = useMemo(() => {
    const sevenDaysAgo = Date.now() - 7 * 24 * 60 * 60 * 1000;
    return sessions.filter((session) => new Date(session.startedAt).getTime() >= sevenDaysAgo);
  }, [sessions]);
  const weeklyMeaningNotes = useMemo(() => {
    const sevenDaysAgo = Date.now() - 7 * 24 * 60 * 60 * 1000;
    return meaningNotes.filter((note) => new Date(note.createdAt).getTime() >= sevenDaysAgo);
  }, [meaningNotes]);

  const weeklyCounts = useMemo(() => sessionTagCounts(weeklySessions), [weeklySessions]);
  const topTags = useMemo(
    () =>
      (Object.entries(weeklyCounts) as [ThemeTag, number][])
        .sort((a, b) => b[1] - a[1])
        .slice(0, 3),
    [weeklyCounts]
  );
  const topMeaningThemes = useMemo(() => {
    const counts = weeklyMeaningNotes
      .flatMap((note) => note.themes)
      .reduce<Record<string, number>>((current, theme) => {
        current[theme] = (current[theme] ?? 0) + 1;
        return current;
      }, {});

    return Object.entries(counts)
      .sort((a, b) => b[1] - a[1])
      .slice(0, 3);
  }, [weeklyMeaningNotes]);
  const latestClaraMessage = [...(currentSession?.messages ?? [])].reverse().find((message) => message.role === "clara");
  const latestExpectedInput = latestClaraMessage?.expectedInput ?? "none";
  const latestChoices = latestClaraMessage?.choices ?? [];
  const requiredChoices = latestExpectedInput === "choice" ? latestChoices : [];
  const optionalTextChoices = latestExpectedInput === "text" ? latestChoices : [];
  const currentSessionLabel = currentSession ? sessionDisplayLabel(currentSession) : "Daily check-in";
  const currentSessionIsTouchpoint = currentSession?.touchpointType && currentSession.touchpointType !== "daily_check_in";
  const activeDecisionFrame = activeDecisionFrameForSession(decisionFrames, currentSession);

  if (!ready) {
    return <main className="min-h-dvh px-5 py-8" />;
  }

  if (!profile) {
    return (
      <main className="mx-auto flex min-h-dvh w-full max-w-md flex-col justify-center px-5 py-8">
        <section className="space-y-8">
          <div className="space-y-4">
            <p className="text-sm uppercase tracking-[0.28em] text-clay">Whyld World</p>
            <h1 className="text-5xl leading-none text-pearl">Clara Preview</h1>
            <p className="max-w-sm text-xl leading-8 text-fog">
              Clara helps you notice what matters, connect patterns, and reflect over time.
            </p>
          </div>

          <form className="space-y-5" onSubmit={saveProfile}>
            <Field
              label="What is something you want more of in your life right now?"
              value={draftProfile.wantsMore}
              onChange={(value) => setDraftProfile((current) => ({ ...current, wantsMore: value }))}
            />
            <Field
              label="What is something that has been taking energy from you?"
              value={draftProfile.drainsEnergy}
              onChange={(value) => setDraftProfile((current) => ({ ...current, drainsEnergy: value }))}
            />
            <DepthPicker
              value={draftProfile.depth}
              onChange={(depth) => setDraftProfile((current) => ({ ...current, depth }))}
            />
            <button className="w-full rounded-md bg-pearl px-5 py-4 text-base font-medium text-ink transition hover:bg-white">
              Begin with Clara
            </button>
          </form>
        </section>
      </main>
    );
  }

  return (
    <main className="mx-auto flex min-h-dvh w-full max-w-md flex-col px-5 pb-32 pt-7">
      <header className="mb-7 flex items-start justify-between gap-4">
        <div>
          <p className="text-sm uppercase tracking-[0.28em] text-clay">Whyld World</p>
          <h1 className="mt-2 text-4xl leading-none text-pearl">Clara</h1>
        </div>
        <div className="flex shrink-0 items-center gap-2">
          <button
            className="rounded-md border border-pearl/15 px-3 py-2 text-sm text-fog"
            onClick={() => setTab("Settings")}
          >
            {currentSession ? headerDepthLabel(currentSession.currentDepth) : headerDepthLabel(profile.depth)}
          </button>
        </div>
      </header>

      {tab === "Today" && (
        <section className="space-y-6">
          <div className="space-y-3">
            <p className="text-sm text-clay">{currentSessionLabel}</p>
            <h2 className="text-4xl leading-tight text-pearl">
              {currentSessionIsTouchpoint ? "A moment with Clara." : "A check-in with Clara."}
            </h2>
          </div>

          {currentSession ? (
            <>
              {activeDecisionFrame ? <FrameSoFarCard frame={activeDecisionFrame} /> : null}

              <section className="space-y-4">
                {currentSession.messages.map((message, index) => (
                  <ConversationBubble message={message} key={`${message.timestamp}-${index}`} />
                ))}
              </section>

              {latestExpectedInput === "choice" && requiredChoices.length > 0 && (
                <div className="flex flex-wrap gap-2">
                  {requiredChoices.map((choice) => (
                    <button
                      className="rounded-md border border-clay/45 bg-clay/15 px-3 py-2 text-sm text-pearl transition hover:bg-clay/25"
                      key={choice}
                      onClick={() => void continueConversation(choice)}
                    >
                      {choice}
                    </button>
                  ))}
                </div>
              )}

              {latestExpectedInput === "text" && (
                <form className="space-y-4 pb-4" onSubmit={submitReply}>
                  {optionalTextChoices.length > 0 && (
                    <div className="flex flex-wrap gap-2">
                      {optionalTextChoices.map((choice) => (
                        <button
                          className="rounded-md border border-pearl/12 bg-pearl/7 px-3 py-2 text-sm text-fog transition hover:bg-pearl/10"
                          key={choice}
                          onClick={() => void continueConversation(choice)}
                          type="button"
                        >
                          {choice}
                        </button>
                      ))}
                    </div>
                  )}
                  <textarea
                    className="min-h-36 scroll-mb-40 w-full resize-none rounded-md border border-pearl/12 bg-pearl/7 px-4 py-4 text-xl leading-8 text-pearl outline-none transition placeholder:text-fog/45 focus:border-clay/70"
                    value={answer}
                    onChange={(event) => setAnswer(event.target.value)}
                    placeholder="Type your response..."
                  />
                  <div className="grid grid-cols-[1fr_auto] gap-3">
                    <button className="rounded-md bg-clay px-5 py-4 text-base font-medium text-ink transition hover:bg-[#cc9978]">
                      Reply
                    </button>
                    <button
                      className="rounded-md border border-pearl/12 bg-pearl/7 px-4 py-4 text-sm text-fog transition hover:bg-pearl/10"
                      onClick={() => void closeSession()}
                      type="button"
                    >
                      End check-in
                    </button>
                  </div>
                </form>
              )}

              {latestExpectedInput === "none" && (
                <button
                  className="w-full rounded-md border border-pearl/12 bg-pearl/7 px-5 py-4 text-base text-fog transition hover:bg-pearl/10"
                  onClick={startNewSession}
                >
                  Start new check-in
                </button>
              )}
            </>
          ) : (
            <section className="space-y-5 border-t border-pearl/10 pt-6">
              <p className="text-2xl leading-9 text-pearl">
                {closingMessage || "Saved for today. I'll keep an eye on what keeps showing up."}
              </p>
              {meaningNoteLoading ? (
                <section className="space-y-2 rounded-md border border-pearl/10 bg-pearl/7 p-4">
                  <p className="text-sm text-clay">Meaning Note</p>
                  <p className="text-lg leading-7 text-fog">Clara is turning this into a small note for your map.</p>
                </section>
              ) : null}
              {pendingMeaningNote ? (
                <section className="space-y-4 rounded-md border border-pearl/10 bg-pearl/7 p-4">
                  <div className="space-y-2">
                    <p className="text-sm text-clay">Meaning Note</p>
                    {meaningNoteError ? <p className="text-sm leading-6 text-clay">{meaningNoteError}</p> : null}
                    {meaningNoteMode === "edit" ? (
                      <textarea
                        className="min-h-32 w-full resize-none rounded-md border border-pearl/12 bg-ink/55 px-4 py-3 text-lg leading-7 text-pearl outline-none transition focus:border-clay/70"
                        value={meaningNoteDraftText}
                        onChange={(event) => setMeaningNoteDraftText(event.target.value)}
                      />
                    ) : (
                      <p className="text-xl leading-8 text-pearl">{pendingMeaningNote.meaningNote}</p>
                    )}
                  </div>
                  <div className="flex flex-wrap gap-2">
                    <button
                      className="rounded-md bg-clay px-4 py-3 text-sm font-medium text-ink transition hover:bg-[#cc9978]"
                      onClick={savePendingMeaningNote}
                      type="button"
                    >
                      Save
                    </button>
                    <button
                      className="rounded-md border border-pearl/12 bg-pearl/7 px-4 py-3 text-sm text-fog transition hover:bg-pearl/10"
                      onClick={() => setMeaningNoteMode(meaningNoteMode === "edit" ? "review" : "edit")}
                      type="button"
                    >
                      {meaningNoteMode === "edit" ? "Review" : "Edit"}
                    </button>
                    <button
                      className="rounded-md border border-pearl/12 bg-pearl/7 px-4 py-3 text-sm text-fog transition hover:bg-pearl/10"
                      onClick={discardPendingMeaningNote}
                      type="button"
                    >
                      Not quite
                    </button>
                  </div>
                </section>
              ) : null}
              <button
                className="w-full rounded-md border border-pearl/12 bg-pearl/7 px-5 py-4 text-base text-fog transition hover:bg-pearl/10"
                onClick={startNewSession}
              >
                Start another check-in
              </button>
            </section>
          )}
        </section>
      )}

      {tab === "Moments" && (
        <section className="space-y-7">
          <ViewTitle eyebrow="Lightweight Moments" title="Only what deserves attention." />

          <section className="space-y-4 border-t border-pearl/10 pt-6">
            <div className="space-y-2">
              <p className="text-sm uppercase tracking-[0.2em] text-clay">Morning Orientation</p>
              <p className="text-lg leading-7 text-fog">One small thing to protect before the day gets loud.</p>
            </div>
            <button
              className="w-full rounded-md border border-pearl/12 bg-pearl/7 px-4 py-4 text-left text-lg leading-7 text-pearl transition hover:bg-pearl/10"
              onClick={() => startTouchpointSession("morning_orientation", morningOrientationPrompt)}
              type="button"
            >
              {morningOrientationPrompt}
            </button>
          </section>

          <section className="space-y-4 border-t border-pearl/10 pt-6">
            <div className="space-y-2">
              <p className="text-sm uppercase tracking-[0.2em] text-clay">Evening Reflection</p>
              <p className="text-lg leading-7 text-fog">A quick pass for anything the day already made clear.</p>
            </div>
            <button
              className="w-full rounded-md border border-pearl/12 bg-pearl/7 px-4 py-4 text-left text-lg leading-7 text-pearl transition hover:bg-pearl/10"
              onClick={() => startTouchpointSession("evening_reflection", eveningReflectionPrompt)}
              type="button"
            >
              {eveningReflectionPrompt}
            </button>
          </section>

          <section className="space-y-4 border-t border-pearl/10 pt-6">
            <div className="space-y-2">
              <p className="text-sm uppercase tracking-[0.2em] text-clay">Mark Moment</p>
              <p className="text-lg leading-7 text-fog">Capture the few moments that already have your attention.</p>
            </div>
            <button
              className="w-full rounded-md bg-clay px-5 py-4 text-base font-medium text-ink transition hover:bg-[#cc9978]"
              onClick={() =>
                startTouchpointSession("marked_moment", markMomentPrompt, {
                  choices: momentKindChoices
                })
              }
              type="button"
            >
              Mark a moment
            </button>
          </section>
        </section>
      )}

      {tab === "Meaning" && (
        <section className="space-y-5">
          <ViewTitle eyebrow="Meaning Map" title="What your moments are becoming." />
          <section className="space-y-5">
            <div className="space-y-1">
              <p className="text-sm uppercase tracking-[0.2em] text-clay">Meaning Notes</p>
              <p className="text-base leading-6 text-fog">Small pieces Clara has helped save from your check-ins.</p>
            </div>
            {meaningNotes.length === 0 ? (
              <EmptyState text="Saved Meaning Notes will gather here after you finish a check-in or moment." />
            ) : (
              meaningNotes.map((note) => <MeaningNoteCard note={note} key={note.id} />)
            )}
          </section>
        </section>
      )}

      {tab === "Frames" && (
        <section className="space-y-5">
          <ViewTitle eyebrow="Decision Frames" title="Messy questions, made visible." />
          <p className="text-lg leading-7 text-fog">
            Frames collect the threads, tradeoffs, knowns, unknowns, and next steps Clara helps surface.
          </p>
          {decisionFrames.length === 0 ? (
            <EmptyState text="Decision Frames will appear here when a check-in turns into a question to think through." />
          ) : (
            decisionFrames.map((frame) => (
              <DecisionFrameCard
                frame={frame}
                key={frame.id}
                onToggleStatus={toggleDecisionFrameStatus}
                onUpdate={updateDecisionFrame}
              />
            ))
          )}
        </section>
      )}

      {tab === "History" && (
        <section className="space-y-5">
          <ViewTitle eyebrow="Past sessions" title="What Clara has held with you." />
          {sessions.length === 0 ? (
            <EmptyState text="Completed check-ins will gather here after you end a session." />
          ) : (
            sessions.map((session) => <HistorySession session={session} key={session.sessionId} />)
          )}
        </section>
      )}

      {tab === "Recap" && (
        <section className="space-y-6">
          <ViewTitle eyebrow="Weekly Meaning Thread" title="What keeps showing up." />
          {weeklyMeaningNotes.length === 0 ? (
            <EmptyState text="A meaning thread appears after you save at least one Meaning Note this week." />
          ) : (
            <>
              <section className="space-y-3 border-t border-pearl/10 pt-6">
                <p className="text-lg leading-7 text-fog">
                  Clara will look across this week's saved check-ins and moments for one recurring thread.
                </p>
                <button
                  className="w-full rounded-md bg-clay px-5 py-4 text-base font-medium text-ink transition hover:bg-[#cc9978] disabled:cursor-not-allowed disabled:opacity-60"
                  disabled={weeklyMeaningLoading}
                  onClick={() => void generateWeeklyMeaningThread()}
                  type="button"
                >
                  {weeklyMeaningLoading ? "Looking across the week..." : "Generate meaning thread"}
                </button>
              </section>

              {weeklyMeaningError ? <p className="text-sm leading-6 text-clay">{weeklyMeaningError}</p> : null}

              {weeklyMeaning ? (
                <section className="space-y-3 border-t border-pearl/10 pt-6">
                  <p className="text-sm text-clay">Clara noticed</p>
                  <p className="whitespace-pre-wrap text-2xl leading-9 text-pearl">{weeklyMeaning}</p>
                  <div className="flex flex-wrap gap-2">
                    <button
                      className="rounded-md bg-clay px-4 py-3 text-sm font-medium text-ink transition hover:bg-[#cc9978]"
                      onClick={() => setWeeklyMeaningFeedback("Marked as true enough for now.")}
                      type="button"
                    >
                      Yes
                    </button>
                    <button
                      className="rounded-md border border-pearl/12 bg-pearl/7 px-4 py-3 text-sm text-fog transition hover:bg-pearl/10"
                      onClick={() => setWeeklyMeaningFeedback("Got it. Clara will hold that thread lightly.")}
                      type="button"
                    >
                      Not quite
                    </button>
                    <button
                      className="rounded-md border border-pearl/12 bg-pearl/7 px-4 py-3 text-sm text-fog transition hover:bg-pearl/10"
                      onClick={() => setWeeklyMeaningFeedback("Try opening one note in the Map and adding one more moment around it.")}
                      type="button"
                    >
                      Tell me more
                    </button>
                  </div>
                  {weeklyMeaningFeedback ? <p className="text-base leading-7 text-fog">{weeklyMeaningFeedback}</p> : null}
                </section>
              ) : null}

              {topMeaningThemes.length > 0 ? (
                <section className="space-y-3 border-t border-pearl/10 pt-6">
                  <p className="text-sm text-clay">Saved note themes</p>
                  {topMeaningThemes.map(([theme, count]) => (
                    <div className="flex items-center justify-between border-b border-pearl/10 py-3" key={theme}>
                      <span className="text-xl text-pearl">{capitalize(theme)}</span>
                      <span className="text-sm text-fog">
                        {count} {count === 1 ? "note" : "notes"}
                      </span>
                    </div>
                  ))}
                </section>
              ) : null}
            </>
          )}
        </section>
      )}

      {tab === "Settings" && (
        <section className="space-y-6">
          <ViewTitle eyebrow="Settings" title="How Clara should meet you." />
          <form className="space-y-5" onSubmit={saveProfile}>
            <Field
              label="What do you want more of?"
              value={draftProfile.wantsMore}
              onChange={(value) => setDraftProfile((current) => ({ ...current, wantsMore: value }))}
            />
            <Field
              label="What has been taking energy?"
              value={draftProfile.drainsEnergy}
              onChange={(value) => setDraftProfile((current) => ({ ...current, drainsEnergy: value }))}
            />
            <DepthPicker
              value={draftProfile.depth}
              onChange={updateDepth}
              showDescriptions
            />
            {settingsSaveMessage ? (
              <p className="text-sm text-clay" role="status">
                {settingsSaveMessage}
              </p>
            ) : null}
            <button className="w-full rounded-md bg-pearl px-5 py-4 text-base font-medium text-ink transition hover:bg-white">
              Save settings
            </button>
          </form>
          <section className="space-y-3 border-t border-pearl/10 pt-6">
            <div className="space-y-1">
              <p className="text-sm uppercase tracking-[0.2em] text-clay">Developer</p>
              <p className="text-base leading-6 text-fog">
                Response-quality tools for tuning Clara outside the main check-in flow.
              </p>
            </div>
            <a
              className="block w-full rounded-md border border-pearl/12 bg-pearl/7 px-5 py-4 text-center text-base text-pearl transition hover:bg-pearl/10"
              href="/lab"
            >
              Developer Lab
            </a>
          </section>
          <section className="space-y-3 border-t border-pearl/10 pt-6">
            <div className="space-y-1">
              <p className="text-sm uppercase tracking-[0.2em] text-clay">Prototype tools</p>
              <p className="text-base leading-6 text-fog">
                Clears local Clara data in this browser and returns to onboarding.
              </p>
            </div>
            <button
              className="w-full rounded-md border border-clay/45 bg-clay/10 px-5 py-4 text-base text-pearl transition hover:bg-clay/20"
              onClick={resetPrototypeData}
              type="button"
            >
              Reset prototype data
            </button>
          </section>
        </section>
      )}

      <nav className="fixed inset-x-0 bottom-0 border-t border-pearl/10 bg-ink/92 px-3 pb-[calc(1rem+env(safe-area-inset-bottom))] pt-3 backdrop-blur">
        <div className="mx-auto grid max-w-md grid-cols-6 gap-1">
          {(["Today", "Moments", "Meaning", "Frames", "History", "Recap"] as Tab[]).map((item) => (
            <button
              className={`rounded-md px-1 py-3 text-xs transition ${
                tab === item ? "bg-pearl text-ink" : "text-fog hover:bg-pearl/8"
              }`}
              key={item}
              onClick={() => setTab(item)}
            >
              {item === "Meaning" ? "Map" : item}
            </button>
          ))}
        </div>
      </nav>
    </main>
  );
}

function Field({
  label,
  value,
  onChange
}: {
  label: string;
  value: string;
  onChange: (value: string) => void;
}) {
  return (
    <label className="block space-y-2">
      <span className="block text-base leading-6 text-fog">{label}</span>
      <input
        className="w-full rounded-md border border-pearl/12 bg-pearl/7 px-4 py-4 text-lg text-pearl outline-none transition placeholder:text-fog/45 focus:border-clay/70"
        value={value}
        onChange={(event) => onChange(event.target.value)}
      />
    </label>
  );
}

function DepthPicker({
  value,
  onChange,
  showDescriptions = false
}: {
  value: Depth;
  onChange: (depth: Depth) => void;
  showDescriptions?: boolean;
}) {
  return (
    <div className="space-y-3">
      <p className="text-base text-fog">How should Clara usually respond?</p>
      <div className={showDescriptions ? "grid gap-2" : "grid grid-cols-2 gap-2"}>
        {(["keep_it_light", "go_a_little_deeper"] as Depth[]).map((depth) => (
          <button
            className={`rounded-md border px-3 py-3 text-left text-sm transition ${
              value === depth
                ? "border-clay bg-clay text-ink"
                : "border-pearl/12 bg-pearl/7 text-fog hover:bg-pearl/10"
            }`}
            key={depth}
            onClick={() => onChange(depth)}
            type="button"
          >
            <span className="block font-medium">{engineToDepth(depth)}</span>
            {showDescriptions ? (
              <span className={`mt-1 block leading-5 ${value === depth ? "text-ink/75" : "text-fog/75"}`}>
                {depthHelperText(depth)}
              </span>
            ) : null}
          </button>
        ))}
      </div>
    </div>
  );
}

function ConversationBubble({ message }: { message: ConversationMessage }) {
  const isClara = message.role === "clara";

  return (
    <article className={`flex ${isClara ? "justify-start" : "justify-end"}`}>
      <div
        className={`max-w-[88%] rounded-md px-4 py-3 ${
          isClara ? "bg-pearl/8 text-pearl" : "bg-clay text-ink"
        }`}
      >
        <p className="mb-1 text-xs uppercase tracking-[0.18em] opacity-65">{isClara ? "Clara" : "You"}</p>
        <p className="text-lg leading-7">{message.text}</p>
      </div>
    </article>
  );
}

function ViewTitle({ eyebrow, title }: { eyebrow: string; title: string }) {
  return (
    <div className="space-y-3">
      <p className="text-sm text-clay">{eyebrow}</p>
      <h2 className="text-4xl leading-tight text-pearl">{title}</h2>
    </div>
  );
}

function HistorySession({ session }: { session: CompletedSession }) {
  return (
    <article className="space-y-4 border-t border-pearl/10 pt-5">
      <div className="flex items-center justify-between gap-4 text-sm text-fog">
        <span>{formatDate(session.startedAt)}</span>
        <span>{engineToDepth(session.currentDepth)}</span>
      </div>
      <p className="text-sm uppercase tracking-[0.18em] text-clay">{sessionDisplayLabel(session)}</p>
      <p className="text-xl leading-8 text-pearl">{session.summary}</p>
      <div className="space-y-3">
        {session.messages.map((message, index) => (
          <div className="space-y-1" key={`${message.timestamp}-${index}`}>
            <p className="text-sm text-clay">{message.role === "clara" ? "Clara" : "You"}</p>
            <p className="text-lg leading-7 text-fog">{message.text}</p>
          </div>
        ))}
      </div>
      <TagRow tags={session.tags} />
    </article>
  );
}

function MeaningNoteCard({ note }: { note: MeaningNote }) {
  return (
    <article className="space-y-4 border-t border-pearl/10 pt-5">
      <div className="flex items-center justify-between gap-4 text-sm text-fog">
        <span>{formatDate(note.createdAt)}</span>
        <span>{note.confidence}</span>
      </div>
      <p className="text-sm uppercase tracking-[0.18em] text-clay">{note.sourceLabel}</p>
      <p className="text-xl leading-8 text-pearl">{note.meaningNote}</p>
      {note.lenses.length > 0 ? (
        <div className="space-y-2">
          <p className="text-sm text-clay">Lenses</p>
          <TagList values={note.lenses} />
        </div>
      ) : null}
      {note.themes.length > 0 ? (
        <div className="space-y-2">
          <p className="text-sm text-clay">Themes</p>
          <TagList values={note.themes} />
        </div>
      ) : null}
    </article>
  );
}

function FrameSoFarCard({ frame }: { frame: DecisionFrame }) {
  return (
    <details className="rounded-md border border-pearl/10 bg-pearl/7 p-4" open>
      <summary className="cursor-pointer text-sm uppercase tracking-[0.18em] text-clay">Frame so far</summary>
      <div className="mt-4 space-y-3">
        <p className="text-lg leading-7 text-pearl">{frame.question}</p>
        {frame.currentFocus ? (
          <div className="space-y-1">
            <p className="text-sm text-clay">Current focus</p>
            <p className="text-base leading-6 text-fog">{frame.currentFocus}</p>
          </div>
        ) : null}
        {frame.threads.length > 0 ? (
          <div className="space-y-2">
            <p className="text-sm text-clay">Threads</p>
            <TagList values={frame.threads.slice(0, 4)} />
          </div>
        ) : null}
        {frame.tradeoffs.length > 0 ? (
          <div className="space-y-2">
            <p className="text-sm text-clay">Tradeoffs</p>
            <TagList values={frame.tradeoffs.slice(0, 3)} />
          </div>
        ) : null}
        {frame.unknowns.length > 0 ? (
          <div className="space-y-2">
            <p className="text-sm text-clay">Unknowns</p>
            <ul className="space-y-1 text-base leading-6 text-fog">
              {frame.unknowns.slice(0, 3).map((unknown) => (
                <li key={unknown}>{unknown}</li>
              ))}
            </ul>
          </div>
        ) : null}
      </div>
    </details>
  );
}

function DecisionFrameCard({
  frame,
  onToggleStatus,
  onUpdate
}: {
  frame: DecisionFrame;
  onToggleStatus: (id: string) => void;
  onUpdate: (id: string, updates: Partial<DecisionFrame>) => void;
}) {
  const [editing, setEditing] = useState(false);
  const [question, setQuestion] = useState(frame.question);
  const [threads, setThreads] = useState(frame.threads.join(", "));
  const [criteria, setCriteria] = useState(frame.criteria.join(", "));
  const [tradeoffs, setTradeoffs] = useState(frame.tradeoffs.join(", "));
  const [knowns, setKnowns] = useState(frame.knowns.join(", "));
  const [unknowns, setUnknowns] = useState(frame.unknowns.join(", "));
  const [currentFocus, setCurrentFocus] = useState(frame.currentFocus ?? "");
  const [nextStep, setNextStep] = useState(frame.nextStep ?? "");

  function cancelEdit() {
    setQuestion(frame.question);
    setThreads(frame.threads.join(", "));
    setCriteria(frame.criteria.join(", "));
    setTradeoffs(frame.tradeoffs.join(", "));
    setKnowns(frame.knowns.join(", "));
    setUnknowns(frame.unknowns.join(", "));
    setCurrentFocus(frame.currentFocus ?? "");
    setNextStep(frame.nextStep ?? "");
    setEditing(false);
  }

  function saveEdit() {
    onUpdate(frame.id, {
      question: question.trim() || frame.question,
      threads: commaList(threads),
      criteria: commaList(criteria),
      tradeoffs: commaList(tradeoffs),
      knowns: commaList(knowns),
      unknowns: commaList(unknowns),
      currentFocus: currentFocus.trim() || null,
      nextStep: nextStep.trim() || null
    });
    setEditing(false);
  }

  return (
    <article className="space-y-4 border-t border-pearl/10 pt-5">
      <div className="flex items-center justify-between gap-4 text-sm text-fog">
        <span>{formatDate(frame.createdAt)}</span>
        <span>{frame.status}</span>
      </div>
      <p className="text-sm uppercase tracking-[0.18em] text-clay">{formatDecisionType(frame.decisionType)} Frame</p>
      {editing ? (
        <div className="space-y-3">
          <label className="block space-y-2">
            <span className="text-sm text-clay">Question</span>
            <textarea
              className="min-h-28 w-full resize-none rounded-md border border-pearl/12 bg-ink/55 px-4 py-3 text-lg leading-7 text-pearl outline-none transition focus:border-clay/70"
              value={question}
              onChange={(event) => setQuestion(event.target.value)}
            />
          </label>
          <MiniField label="Threads" value={threads} onChange={setThreads} />
          <MiniField label="Criteria" value={criteria} onChange={setCriteria} />
          <MiniField label="Tradeoffs" value={tradeoffs} onChange={setTradeoffs} />
          <MiniField label="Knowns" value={knowns} onChange={setKnowns} />
          <MiniField label="Unknowns" value={unknowns} onChange={setUnknowns} />
          <MiniField label="Current focus" value={currentFocus} onChange={setCurrentFocus} />
          <MiniField label="Next step" value={nextStep} onChange={setNextStep} />
          <div className="flex flex-wrap gap-2">
            <button
              className="rounded-md bg-clay px-4 py-3 text-sm font-medium text-ink transition hover:bg-[#cc9978]"
              onClick={saveEdit}
              type="button"
            >
              Save
            </button>
            <button
              className="rounded-md border border-pearl/12 bg-pearl/7 px-4 py-3 text-sm text-fog transition hover:bg-pearl/10"
              onClick={cancelEdit}
              type="button"
            >
              Cancel
            </button>
          </div>
        </div>
      ) : (
        <>
          <p className="text-xl leading-8 text-pearl">{frame.question}</p>
          {frame.currentFocus ? (
            <div className="space-y-1">
              <p className="text-sm text-clay">Current focus</p>
              <p className="text-lg leading-7 text-fog">{frame.currentFocus}</p>
            </div>
          ) : null}
          {frame.threads.length > 0 ? (
            <div className="space-y-2">
              <p className="text-sm text-clay">Key threads</p>
              <TagList values={frame.threads} />
            </div>
          ) : null}
          {frame.tradeoffs.length > 0 ? (
            <div className="space-y-2">
              <p className="text-sm text-clay">Key tradeoffs</p>
              <TagList values={frame.tradeoffs} />
            </div>
          ) : null}
          {frame.criteria.length > 0 ? (
            <div className="space-y-2">
              <p className="text-sm text-clay">Criteria</p>
              <TagList values={frame.criteria} />
            </div>
          ) : null}
          {frame.knowns.length > 0 ? (
            <div className="space-y-2">
              <p className="text-sm text-clay">Knowns</p>
              <TagList values={frame.knowns} />
            </div>
          ) : null}
          {frame.unknowns.length > 0 ? (
            <div className="space-y-2">
              <p className="text-sm text-clay">Unknowns</p>
              <TagList values={frame.unknowns} />
            </div>
          ) : null}
          {frame.nextStep ? (
            <div className="space-y-1">
              <p className="text-sm text-clay">Next step</p>
              <p className="text-lg leading-7 text-fog">{frame.nextStep}</p>
            </div>
          ) : null}
          <div className="flex flex-wrap gap-2">
            <button
              className="rounded-md border border-pearl/12 bg-pearl/7 px-4 py-3 text-sm text-fog transition hover:bg-pearl/10"
              onClick={() => setEditing(true)}
              type="button"
            >
              Edit
            </button>
            <button
              className="rounded-md border border-pearl/12 bg-pearl/7 px-4 py-3 text-sm text-fog transition hover:bg-pearl/10"
              onClick={() => onToggleStatus(frame.id)}
              type="button"
            >
              Mark {frame.status === "open" ? "closed" : "open"}
            </button>
          </div>
        </>
      )}
    </article>
  );
}

function formatDecisionType(type: DecisionFrameType) {
  return capitalize(type);
}

function MiniField({
  label,
  value,
  onChange
}: {
  label: string;
  value: string;
  onChange: (value: string) => void;
}) {
  return (
    <label className="block space-y-2">
      <span className="text-sm text-clay">{label}</span>
      <input
        className="w-full rounded-md border border-pearl/12 bg-ink/55 px-4 py-3 text-base text-pearl outline-none transition placeholder:text-fog/45 focus:border-clay/70"
        value={value}
        onChange={(event) => onChange(event.target.value)}
      />
    </label>
  );
}

function commaList(text: string) {
  return uniqueStrings(text.split(",").map((item) => item.trim())).slice(0, 6);
}

function TagRow({ tags }: { tags: ThemeTag[] }) {
  return <TagList values={tags} />;
}

function TagList({ values }: { values: string[] }) {
  return (
    <div className="flex flex-wrap gap-2">
      {values.map((value) => (
        <span className="rounded-md bg-pearl/8 px-3 py-2 text-sm text-fog" key={value}>
          {value}
        </span>
      ))}
    </div>
  );
}

function EmptyState({ text }: { text: string }) {
  return <p className="border-t border-pearl/10 pt-6 text-xl leading-8 text-fog">{text}</p>;
}

function capitalize(value: string) {
  return value.charAt(0).toUpperCase() + value.slice(1);
}
