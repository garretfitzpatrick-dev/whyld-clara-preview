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
type ConversationRoute =
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
type DecisionFrameStage = "opening" | "mapping" | "clarifying" | "next_step" | "paused" | "closed";
type DecisionMode = "reflect" | "map" | "research" | "compare" | "act";
type ResearchTaskStatus = "open" | "done";
type ResponsibilityPlanStatus = "open" | "monitoring" | "resolved";
type QuestCadence = "once" | "daily" | "weekly" | "custom";
type QuestStatus = "active" | "paused" | "completed";
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

type QuestSeed = {
  originalAspiration: string;
  direction: string;
  domain: "presence" | "physical" | "creative" | "leadership" | "parenting" | "general";
  peopleOrContext: string[];
  possiblePractices: string[];
  selectedPractice?: string | null;
};

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
  conversationRoute: ConversationRoute;
  activeDecisionFrameId: string | null;
  activeResponsibilityPlanId: string | null;
  activeQuestId: string | null;
  questSeed: QuestSeed | null;
  awaitingRouteChoice: boolean;
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

type ResearchTask = {
  id: string;
  question: string;
  status: ResearchTaskStatus;
  notes?: string;
};

type DecisionFrame = {
  id: string;
  createdAt: string;
  updatedAt: string;
  question: string;
  decisionType: DecisionFrameType;
  status: DecisionFrameStatus;
  stage: DecisionFrameStage;
  currentDecisionMode: DecisionMode;
  frameSummary: string;
  threads: string[];
  criteria: string[];
  tradeoffs: string[];
  knowns: string[];
  unknowns: string[];
  possiblePaths: string[];
  optionNotes: string[];
  comparisonNotes: string[];
  researchQuestions: string[];
  researchTasks: ResearchTask[];
  currentFocus: string | null;
  nextStep: string | null;
  sourceSessionId: string | null;
  sourceSummary: string | null;
};

type DecisionFrameUpdate = {
  threads: string[];
  criteria: string[];
  tradeoffs: string[];
  knowns: string[];
  unknowns: string[];
  possiblePaths: string[];
  optionNotes: string[];
  comparisonNotes: string[];
  researchQuestions: string[];
  researchTasks: ResearchTask[];
  currentFocus: string | null;
  nextStep: string | null;
  frameSummary: string | null;
  stage: DecisionFrameStage | null;
  currentDecisionMode: DecisionMode | null;
};

type ResponsibilityPlan = {
  id: string;
  createdAt: string;
  updatedAt: string;
  sourceSessionId: string | null;
  issue: string;
  role: string;
  immediateConcern: string;
  nextSteps: string[];
  peopleToContact: string[];
  policiesToCheck: string[];
  communicationsToDraft: string[];
  status: ResponsibilityPlanStatus;
};

type Quest = {
  id: string;
  createdAt: string;
  updatedAt: string;
  sourceSessionId: string | null;
  title: string;
  direction: string;
  whyItMatters: string;
  practice: string;
  cadence: QuestCadence;
  checkInPrompt: string;
  obstacles: string[];
  evidence: string[];
  nextStep: string | null;
  status: QuestStatus;
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
  responsibilityPlan?: ResponsibilityPlan | null;
  quest?: Quest | null;
  routeClassification?: RouteClassification | null;
};

type RouteClassification = {
  route: ConversationRoute;
  confidence: number;
  reason: string;
  suggestedArtifactType: ArtifactType;
  suggestedMode: string;
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
  decisionFrames: "whyld-world-clara-decision-frames",
  responsibilityPlans: "whyld-world-clara-responsibility-plans",
  quests: "whyld-world-clara-quests"
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
const decisionPauseChoices = ["Keep working it", "Pause here", "Find next honest step"];
const decisionResumeChoices = ["What we still don't know", "Next honest step", "Keep mapping"];
const decisionModeChoices = ["Reflect", "Map options", "Find unknowns", "Compare paths", "Next step", "Research"];

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
    momentKind: options.momentKind,
    conversationRoute: "meaning_moment",
    activeDecisionFrameId: null,
    activeResponsibilityPlanId: null,
    activeQuestId: null,
    questSeed: null,
    awaitingRouteChoice: false
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
  if (isDecisionRoute(session.conversationRoute) || session.activeDecisionFrameId) return false;
  if (session.conversationRoute === "responsibility_safety" || session.activeResponsibilityPlanId) return false;
  if (session.conversationRoute === "quest_goal" || session.activeQuestId) return false;
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

function decisionFrameTurnCount(session: CurrentSession) {
  return session.messages.filter((message) => {
    if (message.role !== "user") return false;
    if (
      isMomentKind(message.text) ||
      isReflectRouteChoice(message.text) ||
      isThinkRouteChoice(message.text) ||
      isFindNextStepRouteChoice(message.text)
    ) {
      return false;
    }
    if (isAcknowledgement(message.text) || isContinueSignal(message.text) || decisionControlChoice(message.text)) return false;
    return message.text.trim().split(/\s+/).filter(Boolean).length >= 3;
  }).length;
}

function maybeApplyDecisionPauseCheck(session: CurrentSession, frame: DecisionFrame | null) {
  if (!frame || !isDecisionRoute(session.conversationRoute)) return session;
  if (frame.stage === "paused" || frame.stage === "closed" || frame.status === "closed") return session;

  const lastUserText = [...session.messages].reverse().find((message) => message.role === "user")?.text ?? "";
  if (isCorrectionSignal(lastUserText) || isContinueSignal(lastUserText) || isSeriousLifeEvent(lastUserText)) return session;

  const turnCount = decisionFrameTurnCount(session);
  if (turnCount < 4 || (turnCount !== 4 && turnCount % 3 !== 1)) return session;

  const messages = [...session.messages];
  const lastMessage = messages[messages.length - 1];
  if (!lastMessage || lastMessage.role !== "clara" || lastMessage.expectedInput !== "text") return session;
  if (/keep working this|pause here|next honest step/i.test(lastMessage.text)) return session;

  const shape = frame.frameSummary || "The frame has a clearer shape now.";
  messages[messages.length - 1] = makeClaraMessage({
    text: `${shape} Want to keep working this, pause here, or name a next honest step?`,
    expectedInput: "choice",
    choices: decisionPauseChoices
  });

  return {
    ...session,
    messages
  };
}

function finalizeGeneratedSession(session: CurrentSession, frame: DecisionFrame | null) {
  if (isDecisionRoute(session.conversationRoute) || frame) {
    return maybeApplyDecisionPauseCheck(session, frame);
  }

  if (session.conversationRoute === "responsibility_safety" || session.activeResponsibilityPlanId) {
    return session;
  }

  if (session.conversationRoute === "quest_goal" || session.activeQuestId) {
    return session;
  }

  return maybeApplyDepthCheck(session);
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
  return ["keep going", "continue", "say more", "go deeper", "keep working it"].includes(normalizeChoice(text));
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
    const askedAmbiguousChoice = claraAskedAmbiguousChoice(lower);
    if (claraAskedToFrameDecision(lower)) return "confirm";
    if (askedAmbiguousChoice) return "ambiguous_response";
    if (askedToSave && askedToContinue) return "ambiguous_response";
    if (askedToSave) return "save";
    if (askedToContinue) return "explicit_continue";
    if (claraAskedForConfirmation(lower)) return "confirm";
    return "substantive_response";
  }

  const askedToSave = claraAskedToSave(lower);
  const askedToContinue = claraAskedToContinue(lower);
  const askedAmbiguousChoice = claraAskedAmbiguousChoice(lower);
  if (askedAmbiguousChoice) return "ambiguous_response";
  if (askedToSave && askedToContinue) return "ambiguous_response";
  if (claraAskedToFrameDecision(lower)) return "correction";
  if (askedToContinue) return "explicit_stop";
  if (askedToSave) return "explicit_continue";
  if (claraAskedForConfirmation(lower)) return "correction";
  return "substantive_response";
}

function isYesSignal(text: string) {
  return ["yes", "yeah", "yep", "yup", "sure", "right", "correct"].includes(normalizeConversationalSignal(text));
}

function isNoSignal(text: string) {
  return ["no", "nope", "nah", "not really"].includes(normalizeConversationalSignal(text));
}

function isReflectRouteChoice(text: string) {
  return normalizeChoice(text) === "reflect" || normalizeChoice(text) === "reflect on it";
}

function isThinkRouteChoice(text: string) {
  return normalizeChoice(text) === "think it through";
}

function isFindNextStepRouteChoice(text: string) {
  return normalizeChoice(text) === "find next step";
}

function claraAskedToSave(text: string) {
  return /\bsave\b/.test(text) || /\bkeep this\b/.test(text);
}

function claraAskedToContinue(text: string) {
  return (
    /\bkeep going\b/.test(text) ||
    /\bkeep working\b/.test(text) ||
    /\bcontinue\b/.test(text) ||
    /\bstay with\b/.test(text) ||
    /\bgo deeper\b/.test(text)
  );
}

function claraAskedToFrameDecision(text: string) {
  return (
    /\bdecision to frame\b/.test(text) ||
    /\bput the pieces on the table\b/.test(text) ||
    /\bhelp frame it\b/.test(text) ||
    /\bthink it through\b/.test(text)
  );
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
      /\bwant to keep working\b/.test(text) ||
      /\bpause here\b/.test(text) ||
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
    touchpointType: "daily_check_in",
    conversationRoute: "meaning_moment",
    activeDecisionFrameId: null,
    activeResponsibilityPlanId: null,
    activeQuestId: null,
    questSeed: null,
    awaitingRouteChoice: false
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
    intentContext?.routeClassification ? routeClassificationMemory(intentContext.routeClassification) : "",
    intentContext?.decisionFrame ? decisionFrameMemory(intentContext.decisionFrame) : "",
    intentContext?.decisionFrameUpdate ? decisionFrameUpdateMemory(intentContext.decisionFrameUpdate) : "",
    intentContext?.responsibilityPlan ? responsibilityPlanMemory(intentContext.responsibilityPlan) : "",
    intentContext?.quest ? questMemory(intentContext.quest) : ""
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
      routeClassification: intentContext?.routeClassification,
      decisionFrame: intentContext?.decisionFrame,
      decisionFrameUpdate: intentContext?.decisionFrameUpdate,
      responsibilityPlan: intentContext?.responsibilityPlan,
      quest: intentContext?.quest
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
        routeClassification: intentContext?.routeClassification,
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

  if (isResponsibilitySafetyMoment(latestUser)) {
    return fallbackResponsibilityPlanText(latestUser, session);
  }

  if (isOrientationMoment(latestUser, session)) {
    return "Let's orient before you go in. What do you most want to protect in this?";
  }

  if (isQuestGoalMoment(latestUser)) {
    return "That sounds like something you may want to practice over time. What would a small honest start look like?";
  }

  if (isCorrectionSignal(latestUser)) {
    return "Right - fair correction. What would be the better way to say it?";
  }

  if (isDecisionMoment(latestUser)) {
    const frame = decisionFrameFromText(latestUser, session);
    const threads = frame.threads.slice(0, 3).join(", ");
    const tradeoff = frame.tradeoffs[0];

    if (tradeoff) {
      return `This has a real tension: ${tradeoff}. I'd put what's involved into ${threads}. Which part feels most important to look at first?`;
    }

    return `This sounds like a messy question with a few moving pieces. I'd start with ${threads}. Which part should we look at first?`;
  }

  if (lower.includes("work") && (lower.includes("annoying") || lower.includes("hard"))) {
    return "Work got under your skin today. What made it land that way?";
  }

  return "That makes sense. What part of that feels closest right now?";
}

function fallbackResponsibilityPlanText(latestUser: string, session: CurrentSession) {
  const plan = responsibilityPlanFromText(latestUser, session);
  const steps = plan.nextSteps
    .slice(0, 6)
    .map((step, index) => `${index + 1}. ${step}`)
    .join("\n");

  return [
    "This sounds like a safety/responsibility issue, so I'd make the next step procedural rather than reflective.",
    steps,
    "I'm not a lawyer or investigator, so use the policy as the anchor. If there is serious harm, threats, abuse, or ongoing danger, don't handle it alone.",
    "Want help drafting the first message?"
  ].join("\n\n");
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
  return ["save this", "save it", "save the plan", "save this as the plan", "mark that", "keep it close"].includes(normalizeChoice(text));
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

function isDecisionRoute(route: ConversationRoute) {
  return route === "decision_frame";
}

function isArtifactRoute(route: ConversationRoute) {
  return route === "meaning_moment" || route === "decision_frame";
}

type DecisionControlChoice =
  | "keep_working"
  | "pause"
  | "next_step"
  | "unknowns"
  | "mapping"
  | "mode_reflect"
  | "mode_map"
  | "mode_research"
  | "mode_compare"
  | "mode_research_list";

function decisionControlChoice(text: string): DecisionControlChoice | null {
  const normalized = normalizeChoice(text);

  if (normalized === "keep working it") return "keep_working";
  if (normalized === "pause here") return "pause";
  if (normalized === "find next honest step" || normalized === "next honest step") return "next_step";
  if (normalized === "what we still don't know" || normalized === "what we still dont know") return "unknowns";
  if (normalized === "keep mapping") return "mapping";
  if (normalized === "reflect") return "mode_reflect";
  if (normalized === "map options") return "mode_map";
  if (normalized === "find unknowns") return "mode_research";
  if (normalized === "research") return "mode_research_list";
  if (normalized === "compare paths") return "mode_compare";
  return null;
}

function decisionModeForControlChoice(choice: DecisionControlChoice, fallback: DecisionMode): DecisionMode {
  if (choice === "next_step") return "act";
  if (choice === "unknowns") return "research";
  if (choice === "mapping") return "map";
  if (choice === "mode_reflect") return "reflect";
  if (choice === "mode_map") return "map";
  if (choice === "mode_research") return "research";
  if (choice === "mode_research_list") return "research";
  if (choice === "mode_compare") return "compare";
  return fallback;
}

function decisionStageForMode(mode: DecisionMode): DecisionFrameStage {
  if (mode === "map") return "mapping";
  if (mode === "act") return "next_step";
  return "clarifying";
}

function decisionFocusForMode(mode: DecisionMode) {
  if (mode === "reflect") return "what matters";
  if (mode === "map") return "possible paths";
  if (mode === "research") return "research list";
  if (mode === "compare") return "compare paths";
  return "next honest step";
}

function applyDecisionControlToFrame(frame: DecisionFrame, choice: DecisionControlChoice): DecisionFrame {
  const updatedAt = new Date().toISOString();
  const currentDecisionMode = decisionModeForControlChoice(choice, frame.currentDecisionMode);

  if (choice === "pause") {
    return {
      ...frame,
      updatedAt,
      stage: "paused",
      frameSummary: frame.frameSummary || inferFrameSummary({
        decisionType: frame.decisionType,
        threads: frame.threads,
        criteria: frame.criteria,
        tradeoffs: frame.tradeoffs,
        unknowns: frame.unknowns,
        question: frame.question
      })
    };
  }

  if (choice === "next_step") {
    return {
      ...frame,
      updatedAt,
      status: "open",
      currentDecisionMode,
      stage: "next_step",
      currentFocus: "next honest step",
      frameSummary: frame.frameSummary || inferFrameSummary({
        decisionType: frame.decisionType,
        threads: frame.threads,
        criteria: frame.criteria,
        tradeoffs: frame.tradeoffs,
        unknowns: frame.unknowns,
        question: frame.question
      })
    };
  }

  if (choice === "unknowns") {
    return {
      ...frame,
      updatedAt,
      status: "open",
      currentDecisionMode,
      stage: "clarifying",
      currentFocus: "what we still don't know"
    };
  }

  if (
    choice === "mode_reflect" ||
    choice === "mode_map" ||
    choice === "mode_research" ||
    choice === "mode_research_list" ||
    choice === "mode_compare"
  ) {
    const currentFocus = choice === "mode_research" ? "what we still don't know" : decisionFocusForMode(currentDecisionMode);
    return {
      ...frame,
      updatedAt,
      status: "open",
      currentDecisionMode,
      stage: decisionStageForMode(currentDecisionMode),
      currentFocus
    };
  }

  return {
    ...frame,
    updatedAt,
    status: "open",
    currentDecisionMode,
    stage:
      choice === "mapping"
        ? "mapping"
        : frame.stage === "paused" || frame.stage === "closed"
          ? decisionStageForMode(currentDecisionMode)
          : frame.stage,
    currentFocus: choice === "mapping" ? "possible paths" : frame.currentFocus
  };
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
  const possiblePaths = inferDecisionPossiblePaths(text, decisionType);
  const researchQuestions = inferResearchQuestions(text, decisionType, unknowns, possiblePaths);
  const currentDecisionMode = inferInitialDecisionMode(text, possiblePaths, unknowns);
  const frameSummary = inferFrameSummary({
    decisionType,
    threads,
    criteria,
    tradeoffs,
    unknowns,
    question: inferDecisionQuestion(text, decisionType)
  });

  return {
    id: crypto.randomUUID(),
    createdAt,
    updatedAt: createdAt,
    question: inferDecisionQuestion(text, decisionType),
    decisionType,
    status: "open",
    stage: "opening",
    currentDecisionMode,
    frameSummary,
    threads,
    criteria,
    tradeoffs,
    knowns,
    unknowns,
    possiblePaths,
    optionNotes: [],
    comparisonNotes: [],
    researchQuestions,
    researchTasks: makeResearchTasks(researchQuestions),
    currentFocus,
    nextStep: inferDecisionNextStep(text, decisionType, tradeoffs),
    sourceSessionId: session.sessionId,
    sourceSummary: summarizeDecisionSource(session, text)
  };
}

function inferInitialDecisionMode(text: string, possiblePaths: string[], unknowns: string[]): DecisionMode {
  const lower = text.toLowerCase();

  if (
    /\b(can you research|can you do the research|what should i research|find out|facts?|data|information|how would i figure this out|how do i find out|don'?t know enough|need more information|what facts do we need)\b/.test(
      lower
    )
  ) {
    return "research";
  }
  if (/\bwhat are my options|options|paths|alternatives|ideas\b/.test(lower)) return "map";
  if (/\bcompare|weigh|against|side by side\b/.test(lower)) return "compare";
  if (/\bnext step|what do i do next|where do i start\b/.test(lower)) return "act";
  if (possiblePaths.length > 0 && unknowns.length === 0) return "map";
  return "reflect";
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

function inferDecisionQuestion(text: string, decisionType: DecisionFrameType) {
  const explicitQuestion = text.match(/([^.!?]*\?)/);
  if (explicitQuestion) return decisionQuestionFromText(explicitQuestion[1]);

  const lower = text.toLowerCase();
  if (decisionType === "family" && /\bmove|moving|school|kids?|children\b/.test(lower)) {
    return "Should we consider moving because of the school situation?";
  }
  if (decisionType === "work" && /\bjob|career|change jobs?|changing jobs?\b/.test(lower)) {
    return "Should I consider changing jobs?";
  }
  if (decisionType === "meeting") return "How should I prepare for this meeting?";
  if (decisionType === "goals") return "What should my goals be right now?";

  return decisionQuestionFromText(text);
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
    threads.push("kids are happy where they are", "kids may not be challenged enough", "what they may need later");
  }
  if (/\bbudget cuts?|programs? .*\bcut|teachers? .*\bcut\b/.test(lower)) {
    threads.push("school budget cuts may affect programs and teachers");
  }
  if (/\bmove|moving|town|home|community|friends?\b/.test(lower)) {
    threads.push("moving would disrupt family or community life", "cost of moving");
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
    tradeoffs.push("stability vs opportunity", "staying and advocating vs leaving");
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
    unknowns.push("how deeply the cuts will affect the kids");
  }
  if (/\benrichment|challenge|challenged|academic\b/.test(lower)) unknowns.push("whether enrichment could solve part of the problem");
  if (/\bmove|moving|town|home|community|friends?\b/.test(lower)) {
    unknowns.push("what moving would cost emotionally, financially, and socially");
  }
  if (/\bjob|career|work\b/.test(lower)) unknowns.push("what the change would ask from your energy and family life");
  if (decisionType === "meeting") unknowns.push("what outcome would make the meeting worth it");
  if (decisionType === "goals") unknowns.push("what has enough room to matter right now");
  if (/\bi don'?t know|not sure|unclear|wonder|worry\b/.test(lower)) {
    unknowns.push(shortenDecisionItem(text));
  }

  return uniqueStrings(unknowns).slice(0, 5);
}

function inferDecisionPossiblePaths(text: string, decisionType: DecisionFrameType) {
  const lower = text.toLowerCase();
  const paths: string[] = [];

  if (decisionType === "family" && /\bschool|kids?|children|move|moving\b/.test(lower)) {
    paths.push(
      "stay and supplement academics",
      "stay and advocate locally",
      "reassess after budget decisions",
      "explore other districts",
      "move only if specific thresholds are crossed"
    );
  } else if (decisionType === "work") {
    paths.push("stay and adjust the role", "explore other roles quietly", "name what would need to change", "set a decision date");
  } else if (decisionType === "meeting") {
    paths.push("define the outcome", "clarify your role", "prepare the hardest conversation", "decide what can wait");
  } else if (decisionType === "goals") {
    paths.push("choose one focus for this season", "drop one goal for now", "run a one-week experiment", "notice what keeps coming up");
  }

  return uniqueStrings(paths).slice(0, 6);
}

function inferResearchQuestions(
  text: string,
  decisionType: DecisionFrameType,
  unknowns: string[] = [],
  possiblePaths: string[] = []
) {
  const lower = text.toLowerCase();
  const asksForResearch =
    /\b(can you research|can you do the research|what should i research|how do i find out|don'?t know enough|need more information|what facts do we need|find out|research)\b/.test(
      lower
    );
  const questions: string[] = [];

  if (decisionType === "family" && /\bschool|district|move|moving|kids?|children|budget cuts?\b/.test(lower)) {
    questions.push(
      "Which districts are realistic for the family?",
      "What academic options do those schools offer?",
      "How stable are the school budgets?",
      "What would the move cost financially, socially, and day to day?",
      "Would moving actually create a better school fit?"
    );
  } else if (decisionType === "work") {
    questions.push(
      "What would need to change in the current role?",
      "What options exist inside or outside the current job?",
      "What would each path ask from energy, money, and family life?"
    );
  } else if (decisionType === "meeting") {
    questions.push(
      "What outcome would make the meeting worth it?",
      "Who needs to be aligned before the meeting?",
      "What facts or examples would make the conversation clearer?"
    );
  } else if (asksForResearch) {
    questions.push(
      "What facts would change the decision?",
      "Which options are actually realistic?",
      "What would make one path clearly harder or easier?"
    );
  }

  return uniqueStrings([...questions, ...unknowns.map((unknown) => `Find out ${unknown.toLowerCase()}`), ...possiblePaths.map((path) => `What would it take to ${path}?`)]).slice(0, 8);
}

function makeResearchTasks(questions: string[]): ResearchTask[] {
  return questions.map((question) => ({
    id: crypto.randomUUID(),
    question,
    status: "open"
  }));
}

function mergeResearchTasks(existing: ResearchTask[], incoming: ResearchTask[]) {
  const byQuestion = new Map(existing.map((task) => [normalizeDecisionQuestion(task.question), task]));

  incoming.forEach((task) => {
    const key = normalizeDecisionQuestion(task.question);
    if (!byQuestion.has(key)) {
      byQuestion.set(key, task);
    }
  });

  return Array.from(byQuestion.values()).slice(0, 12);
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

function inferFrameSummary({
  decisionType,
  threads,
  criteria,
  tradeoffs,
  unknowns,
  question
}: {
  decisionType: DecisionFrameType;
  threads: string[];
  criteria: string[];
  tradeoffs: string[];
  unknowns: string[];
  question: string;
}) {
  const firstTradeoff = tradeoffs[0];

  if (firstTradeoff) {
    return `This decision seems to center on ${firstTradeoff}.`;
  }

  if (decisionType === "family" && threads.some((thread) => thread.includes("kids"))) {
    return "The question is not only what to choose, but what kind of family environment you are trying to protect.";
  }

  if (decisionType === "meeting") {
    return "The meeting question seems to be about whether the group needs alignment, a decision, or shared understanding.";
  }

  if (decisionType === "goals") {
    return "The goals question seems to be about what deserves attention in this season, not just what sounds good.";
  }

  const anchor = criteria[0] ?? threads[0] ?? unknowns[0];
  return anchor ? `This question seems to be taking shape around ${anchor}.` : question;
}

function inferDecisionStage({
  tradeoffs,
  unknowns,
  nextStep
}: {
  tradeoffs: string[];
  unknowns: string[];
  nextStep: string | null;
}): DecisionFrameStage {
  if (nextStep) return "next_step";
  if (tradeoffs.length > 0 || unknowns.length > 0) return "clarifying";
  return "mapping";
}

function inferDecisionNextStep(text: string, decisionType: DecisionFrameType, tradeoffs: string[] = []) {
  if (decisionType === "meeting") return "Name the outcome that would make the meeting worth the time.";
  if (decisionType === "goals") return "Choose the one area that deserves attention first.";
  if (tradeoffs.length > 0) return "Choose which side of the tradeoff feels heavier right now.";
  if (inferDecisionOptions(text, decisionType).length > 1) return "Name which option feels most alive or most costly right now.";
  return null;
}

function shortenDecisionItem(text: string) {
  return text.trim().replace(/\s+/g, " ").replace(/^whether to\s+/i, "").slice(0, 80);
}

function uniqueStrings(values: string[]) {
  return Array.from(new Set(values.map((value) => value.trim()).filter(Boolean)));
}

function inferDecisionModeFromText(text: string, frame: DecisionFrame): DecisionMode | null {
  const lower = text.toLowerCase();

  if (/\b(next step|what do i do next|what should i do now|where do i start|take action)\b/.test(lower)) return "act";
  if (/\b(compare|weigh|against|side by side|which option|which path|tradeoffs between)\b/.test(lower)) return "compare";
  if (
    /\b(can you research|can you do the research|what should i research|what do i need to find out|find out|research|how would i figure this out|how do i find out|don'?t know enough|need more information|what facts do we need|facts?|data|information)\b/.test(
      lower
    )
  ) {
    return "research";
  }
  if (/\b(do you have any ideas|what are my options|possible options|options|paths|alternatives|ideas)\b/.test(lower)) return "map";
  if (/\bi don'?t know\b/.test(lower)) return frame.possiblePaths.length > 1 ? "research" : "map";
  if (/\b(protect|matter|matters|important|value|care about|identity|kind of person|kind of parent|feel)\b/.test(lower)) return "reflect";

  return null;
}

function inferOptionNotes(text: string) {
  const lower = text.toLowerCase();

  if (!/\b(option|path|possibilit|alternative|idea|could|maybe|what if)\b/.test(lower)) return [];
  return [shortenDecisionItem(text)];
}

function inferComparisonNotes(text: string) {
  const lower = text.toLowerCase();

  if (!/\b(compare|weigh|versus|vs\.?|tradeoff|trade-off|against|side by side)\b/.test(lower)) return [];
  return [shortenDecisionItem(text)];
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
  const possiblePaths: string[] = [];
  const optionNotes = inferOptionNotes(text);
  const comparisonNotes = inferComparisonNotes(text);
  const currentDecisionMode = inferDecisionModeFromText(text, frame);
  const researchQuestions: string[] = [];
  let nextStep: string | null = null;

  if (/\bhappy\b/.test(lower) && /\bchalleng|growth|academic|school\b/.test(lower)) {
    threads.push("kids' happiness now", "academic growth over time");
    criteria.push("happiness", "academic challenge");
    tradeoffs.push("happiness now vs growth over time");
    knowns.push("the kids are happy here");
    unknowns.push("whether they are being challenged enough");
    possiblePaths.push("stay and supplement academics", "explore other districts");
  }

  if (/\bbudget cuts?|programs? .*\bcut|teachers? .*\bcut\b/.test(lower)) {
    threads.push("future school cuts");
    tradeoffs.push("stability now vs uncertainty ahead");
    knowns.push("cuts are part of the picture");
    unknowns.push("what the cuts will actually change");
    possiblePaths.push("reassess after budget decisions", "stay and advocate locally");
  }

  if (/\bmove|moving|town|home|community|friends?\b/.test(lower)) {
    threads.push("belonging where you are", "cost of moving");
    criteria.push("belonging", "stability");
    tradeoffs.push("stability vs change");
    unknowns.push("what moving would cost socially");
    possiblePaths.push("explore other districts", "move only if specific thresholds are crossed");
  }

  if (/\bjob|career|work\b/.test(lower)) {
    threads.push("growth", "stability", "energy", "family load");
    criteria.push("growth", "stability", "energy");
    tradeoffs.push("growth vs stability");
    unknowns.push("what this would ask from your energy and family life");
    possiblePaths.push("stay and adjust the role", "explore other roles quietly");
  }

  if (/\bmeeting\b/.test(lower)) {
    threads.push("meeting outcome", "your role", "how you want to show up");
    criteria.push("outcome", "role", "mindset");
    unknowns.push("what outcome would make the meeting worth it");
    nextStep = "Name the outcome that would make the meeting worth the time.";
    possiblePaths.push("define the outcome", "clarify your role");
  }

  if (/\bgoal|goals\b/.test(lower)) {
    threads.push("what deserves attention", "actual bandwidth");
    criteria.push("attention", "capacity");
    tradeoffs.push("ambition vs bandwidth");
    possiblePaths.push("choose one focus for this season", "run a one-week experiment");
  }

  if (currentDecisionMode === "map") {
    possiblePaths.push(...inferDecisionPossiblePaths(`${frame.question} ${text}`, frame.decisionType));
  }

  if (currentDecisionMode === "research") {
    researchQuestions.push(
      ...inferResearchQuestions(
        `${frame.question} ${text}`,
        frame.decisionType,
        uniqueStrings([...frame.unknowns, ...unknowns]),
        uniqueStrings([...frame.possiblePaths, ...possiblePaths])
      )
    );
  }

  if (/\bi know|we know|definitely|for sure|it's clear|its clear\b/.test(lower)) {
    knowns.push(shortenDecisionItem(text));
  }

  if (/\bi don'?t know|we don'?t know|not sure|unclear|wonder|worry|question is|find out|research|facts?\b/.test(lower)) {
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
    possiblePaths: uniqueStrings(possiblePaths).slice(0, 5),
    optionNotes: uniqueStrings(optionNotes).slice(0, 5),
    comparisonNotes: uniqueStrings(comparisonNotes).slice(0, 5),
    researchQuestions: uniqueStrings(researchQuestions).slice(0, 8),
    researchTasks: makeResearchTasks(uniqueStrings(researchQuestions).slice(0, 8)),
    currentFocus:
      (currentDecisionMode ? decisionFocusForMode(currentDecisionMode) : null) ??
      chooseDecisionCurrentFocus({ threads, criteria, tradeoffs, unknowns }) ??
      frame.currentFocus,
    nextStep,
    frameSummary: null,
    stage: currentDecisionMode ? decisionStageForMode(currentDecisionMode) : null,
    currentDecisionMode
  };
}

function summarizeDecisionSource(session: CurrentSession, latestText?: string) {
  const text = [sessionText(session), latestText ?? ""].filter(Boolean).join(" ").trim();
  return text ? text.replace(/\s+/g, " ").slice(0, 420) : null;
}

function applyDecisionFrameUpdate(frame: DecisionFrame, update: DecisionFrameUpdate): DecisionFrame {
  const currentDecisionMode = update.currentDecisionMode ?? frame.currentDecisionMode;
  const nextStage =
    update.stage ??
    (update.currentDecisionMode
      ? decisionStageForMode(update.currentDecisionMode)
      : inferDecisionStage({
          tradeoffs: uniqueStrings([...frame.tradeoffs, ...update.tradeoffs]),
          unknowns: uniqueStrings([...frame.unknowns, ...update.unknowns]),
          nextStep: update.nextStep
        }));

  return {
    ...frame,
    updatedAt: new Date().toISOString(),
    currentDecisionMode,
    threads: uniqueStrings([...frame.threads, ...update.threads]).slice(0, 8),
    criteria: uniqueStrings([...frame.criteria, ...update.criteria]).slice(0, 8),
    tradeoffs: uniqueStrings([...frame.tradeoffs, ...update.tradeoffs]).slice(0, 8),
    knowns: uniqueStrings([...frame.knowns, ...update.knowns]).slice(0, 8),
    unknowns: uniqueStrings([...frame.unknowns, ...update.unknowns]).slice(0, 8),
    possiblePaths: uniqueStrings([...frame.possiblePaths, ...update.possiblePaths]).slice(0, 8),
    optionNotes: uniqueStrings([...frame.optionNotes, ...update.optionNotes]).slice(0, 8),
    comparisonNotes: uniqueStrings([...frame.comparisonNotes, ...update.comparisonNotes]).slice(0, 8),
    researchQuestions: uniqueStrings([...frame.researchQuestions, ...update.researchQuestions]).slice(0, 12),
    researchTasks: mergeResearchTasks(frame.researchTasks, update.researchTasks),
    currentFocus: update.currentFocus ?? frame.currentFocus,
    nextStep: update.nextStep ?? frame.nextStep,
    frameSummary:
      update.frameSummary ??
      inferFrameSummary({
        decisionType: frame.decisionType,
        threads: uniqueStrings([...frame.threads, ...update.threads]),
        criteria: uniqueStrings([...frame.criteria, ...update.criteria]),
        tradeoffs: uniqueStrings([...frame.tradeoffs, ...update.tradeoffs]),
        unknowns: uniqueStrings([...frame.unknowns, ...update.unknowns]),
        question: frame.question
      }),
    stage: nextStage
  };
}

function updateDecisionFrameSourceSummary(frame: DecisionFrame, session: CurrentSession, latestText: string) {
  return {
    ...frame,
    updatedAt: new Date().toISOString(),
    sourceSummary: summarizeDecisionSource(session, latestText),
    frameSummary: frame.frameSummary || inferFrameSummary({
      decisionType: frame.decisionType,
      threads: frame.threads,
      criteria: frame.criteria,
      tradeoffs: frame.tradeoffs,
      unknowns: frame.unknowns,
      question: frame.question
    })
  };
}

function emptyDecisionFrameUpdate(currentFocus: string | null): DecisionFrameUpdate {
  return {
    threads: [],
    criteria: [],
    tradeoffs: [],
    knowns: [],
    unknowns: [],
    possiblePaths: [],
    optionNotes: [],
    comparisonNotes: [],
    researchQuestions: [],
    researchTasks: [],
    currentFocus,
    nextStep: null,
    frameSummary: null,
    stage: null,
    currentDecisionMode: null
  };
}

function hasDecisionFrameUpdate(update: DecisionFrameUpdate) {
  return (
    update.threads.length > 0 ||
    update.criteria.length > 0 ||
    update.tradeoffs.length > 0 ||
    update.knowns.length > 0 ||
    update.unknowns.length > 0 ||
    update.possiblePaths.length > 0 ||
    update.optionNotes.length > 0 ||
    update.comparisonNotes.length > 0 ||
    update.researchQuestions.length > 0 ||
    update.researchTasks.length > 0 ||
    update.nextStep !== null ||
    update.frameSummary !== null ||
    update.stage !== null ||
    update.currentDecisionMode !== null
  );
}

function isLowSignalFrameReply(text: string) {
  return isYesSignal(text) || isNoSignal(text) || isAcknowledgement(text) || isContinueSignal(text);
}

function routeConversationMessage(text: string, session: CurrentSession, activeFrame: DecisionFrame | null): ConversationRoute {
  if (isDecisionRoute(session.conversationRoute) || activeFrame) return "decision_frame";
  if (session.conversationRoute === "responsibility_safety") return "responsibility_safety";
  if (session.conversationRoute === "quest_goal") return "quest_goal";
  if (isSeriousLifeEvent(text)) return "support_witness";
  if (isResponsibilitySafetyMoment(text)) return "responsibility_safety";
  if (isDecisionMoment(text) || hasStrongDecisionContent(text)) return "decision_frame";
  if (isOrientationMoment(text, session)) return "orientation";
  if (isQuestGoalMoment(text)) return "quest_goal";
  if (hasUnclearDecisionContent(text)) return "unclear";
  return "meaning_moment";
}

function fallbackRouteClassification(text: string, session: CurrentSession, activeFrame: DecisionFrame | null): RouteClassification {
  const route = routeConversationMessage(text, session, activeFrame);

  return routeMetadata(route, route === "unclear" ? 0.48 : 0.68, "Local fallback route classification.");
}

function routeMetadata(route: ConversationRoute, confidence: number, reason: string): RouteClassification {
  const metadata: Record<ConversationRoute, Pick<RouteClassification, "suggestedArtifactType" | "suggestedMode">> = {
    meaning_moment: {
      suggestedArtifactType: "meaning_note",
      suggestedMode: "notice_what_mattered"
    },
    decision_frame: {
      suggestedArtifactType: "decision_frame",
      suggestedMode: "frame_decision"
    },
    responsibility_safety: {
      suggestedArtifactType: "responsibility_plan",
      suggestedMode: "responsible_action"
    },
    orientation: {
      suggestedArtifactType: "orientation_note",
      suggestedMode: "orient_before_entering"
    },
    quest_goal: {
      suggestedArtifactType: "quest",
      suggestedMode: "turn_into_practice"
    },
    support_witness: {
      suggestedArtifactType: null,
      suggestedMode: "witness"
    },
    unclear: {
      suggestedArtifactType: null,
      suggestedMode: "clarify_route"
    }
  };

  return {
    route,
    confidence,
    reason,
    ...metadata[route]
  };
}

async function classifyRoute(
  text: string,
  session: CurrentSession,
  profile: Profile | null,
  previousSessions: CompletedSession[],
  activeFrame: DecisionFrame | null
): Promise<RouteClassification> {
  if (activeFrame || isDecisionRoute(session.conversationRoute)) {
    return routeMetadata("decision_frame", 0.96, "A Decision Frame is already active.");
  }

  if (session.conversationRoute === "responsibility_safety") {
    return withResponsibilityActionMode(
      routeMetadata("responsibility_safety", 0.95, "A responsibility/safety loop is already active."),
      text,
      session
    );
  }

  if (session.conversationRoute === "quest_goal") {
    return routeMetadata("quest_goal", 0.95, "A Quest loop is already active.");
  }

  try {
    const response = await fetch("/api/clara-route", {
      method: "POST",
      headers: {
        "Content-Type": "application/json"
      },
      body: JSON.stringify({
        userText: text,
        transcript: sessionTranscript(session, 10),
        opener: sessionOpener(session),
        memory: profileMemory(profile, previousSessions),
        currentRoute: session.conversationRoute
      })
    });
    const data = (await response.json()) as Partial<RouteClassification>;

    if (!response.ok || !isConversationRoute(data.route)) {
      throw new Error("Route classifier unavailable");
    }

    return withResponsibilityActionMode({
      ...routeMetadata(
        data.route,
        typeof data.confidence === "number" ? Math.min(1, Math.max(0, data.confidence)) : 0.7,
        typeof data.reason === "string" ? data.reason : "Model route classification."
      ),
      suggestedArtifactType:
        data.suggestedArtifactType === undefined ? routeMetadata(data.route, 0.7, "").suggestedArtifactType : data.suggestedArtifactType,
      suggestedMode: typeof data.suggestedMode === "string" ? data.suggestedMode : routeMetadata(data.route, 0.7, "").suggestedMode
    }, text, session);
  } catch (error) {
    console.warn("Using fallback route classification", error);
    return withResponsibilityActionMode(fallbackRouteClassification(text, session, activeFrame), text, session);
  }
}

function hasStrongDecisionContent(text: string) {
  const lower = text.toLowerCase();
  const hasOptions = /\bbetween\b.+\b(and|or|vs\.?|versus)\b/.test(lower) || /\beither\b.+\bor\b/.test(lower);
  const hasDecisionDomain = /\b(move|moving|school|teacher|program|job|career|meeting|goals?|kids?|children|family)\b/.test(lower);
  const hasUncertainty = /\b(trying to decide|decide|choice|choose|not sure|unsure|don'?t know what to do|worry|worried)\b/.test(lower);
  const hasTradeoff = /\b(tradeoff|trade-off|tension|balance|but|however|versus|vs\.?|competing)\b/.test(lower);
  const hasFutureStakes = /\b(future|later|long term|long-term|consequence|impact|affect|cuts?|moving|change)\b/.test(lower);

  return hasOptions || (hasDecisionDomain && hasUncertainty) || (hasDecisionDomain && hasTradeoff && hasFutureStakes);
}

function isResponsibilitySafetyMoment(text: string) {
  const lower = text.toLowerCase();

  return (
    /\b(bullying|harassment|abuse|misconduct|unsafe|safety|threat|threatened|duty of care|duty-of-care)\b/.test(lower) ||
    /\b(child|player|student|employee|kid|kids)\b.*\b(wellbeing|well-being|harm|hurt|unsafe|protect|report)\b/.test(lower) ||
    /\b(i need to report|should i report|mandatory|responsible thing|what am i required)\b/.test(lower) ||
    (isResponsibilityActionRequest(text) &&
      /\b(league|president|coach|player|parent|guardian|school|student|principal|hr|employee|policy|safeguarding)\b/.test(lower))
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

function responsibilitySuggestedMode(text: string, session: CurrentSession) {
  if (isResponsibilityActionRequest(text)) return "action_plan";
  if (session.conversationRoute === "responsibility_safety" && !isLowSignalFrameReply(text)) return "action_plan";

  const wordCount = text.trim().split(/\s+/).filter(Boolean).length;
  if (wordCount >= 10 && isResponsibilitySafetyMoment(text)) return "action_plan";

  return "responsible_action";
}

function withResponsibilityActionMode(
  classification: RouteClassification,
  text: string,
  session: CurrentSession
): RouteClassification {
  if (classification.route !== "responsibility_safety") return classification;

  return {
    ...classification,
    suggestedArtifactType: "responsibility_plan",
    suggestedMode: responsibilitySuggestedMode(text, session)
  };
}

function responsibilityPlanFromText(text: string, session: CurrentSession): ResponsibilityPlan {
  const combinedText = [sessionText(session), text].filter(Boolean).join(" ");
  const now = new Date().toISOString();
  const peopleToContact = inferResponsibilityPeople(combinedText);
  const policiesToCheck = inferResponsibilityPolicies(combinedText);
  const nextSteps = inferResponsibilityNextSteps(combinedText, peopleToContact, policiesToCheck);

  return {
    id: crypto.randomUUID(),
    createdAt: now,
    updatedAt: now,
    sourceSessionId: session.sessionId,
    issue: inferResponsibilityIssue(combinedText, text),
    role: inferResponsibilityRole(combinedText),
    immediateConcern: inferResponsibilityConcern(combinedText),
    nextSteps,
    peopleToContact,
    policiesToCheck,
    communicationsToDraft: inferResponsibilityMessages(combinedText, peopleToContact),
    status: "open"
  };
}

function mergeResponsibilityPlan(existing: ResponsibilityPlan, inferred: ResponsibilityPlan): ResponsibilityPlan {
  return {
    ...existing,
    updatedAt: new Date().toISOString(),
    issue: existing.issue || inferred.issue,
    role: existing.role || inferred.role,
    immediateConcern: existing.immediateConcern || inferred.immediateConcern,
    nextSteps: uniqueStrings([...existing.nextSteps, ...inferred.nextSteps]).slice(0, 8),
    peopleToContact: uniqueStrings([...existing.peopleToContact, ...inferred.peopleToContact]).slice(0, 8),
    policiesToCheck: uniqueStrings([...existing.policiesToCheck, ...inferred.policiesToCheck]).slice(0, 6),
    communicationsToDraft: uniqueStrings([...existing.communicationsToDraft, ...inferred.communicationsToDraft]).slice(0, 6),
    status: existing.status === "resolved" ? "monitoring" : existing.status
  };
}

function inferResponsibilityIssue(combinedText: string, latestText: string) {
  const lower = combinedText.toLowerCase();
  if (/\b(tee ball|baseball|player|coach|league)\b/.test(lower) && /\b(bully|bullying|safety|unsafe|harm|hurt)\b/.test(lower)) {
    return "Player safety / bullying concern";
  }
  if (/\bharassment\b/.test(lower)) return "Harassment concern";
  if (/\babuse\b/.test(lower)) return "Possible abuse or safeguarding concern";
  if (/\bthreat|threatened\b/.test(lower)) return "Threat or safety concern";
  if (/\bmisconduct\b/.test(lower)) return "Misconduct concern";
  if (/\breport\b/.test(lower)) return "Report that needs the right process";

  const sentence = firstPlainSentence(latestText || combinedText);
  return sentence || "Responsibility or safety concern";
}

function inferResponsibilityRole(text: string) {
  const lower = text.toLowerCase();
  if (/\bleague president\b/.test(lower)) return "League volunteer or coach trying to handle a concern responsibly";
  if (/\bcoach|coaching|practice|game|player|team\b/.test(lower)) return "Coach or team adult responsible for player safety";
  if (/\bparent|guardian|my kid|my child\b/.test(lower)) return "Parent or guardian trying to protect a child";
  if (/\bteacher|student|school|principal\b/.test(lower)) return "School adult responsible for student wellbeing";
  if (/\bemployee|manager|hr|workplace|supervisor\b/.test(lower)) return "Workplace adult responsible for a safe process";
  return "Responsible person in the situation";
}

function inferResponsibilityConcern(text: string) {
  const lower = text.toLowerCase();
  if (/\bbully|bullying\b/.test(lower)) return "A bullying report needs to be documented and handled through the right league process.";
  if (/\bharassment\b/.test(lower)) return "A harassment concern needs documentation, policy review, and appropriate escalation.";
  if (/\babuse|threat|immediate danger|ongoing danger\b/.test(lower)) {
    return "The concern may involve serious or ongoing risk, so it should not be handled alone.";
  }
  if (/\bunsafe|safety|harm|hurt\b/.test(lower)) return "Someone's safety or wellbeing may need a temporary protective step.";
  return "Make sure the concern is handled through the right process, with documentation and appropriate escalation.";
}

function inferResponsibilityPeople(text: string) {
  const lower = text.toLowerCase();
  const people: string[] = [];

  if (/\bleague president|president\b/.test(lower)) people.push("League president");
  if (/\bdirector\b/.test(lower)) people.push("Program director");
  if (/\bprincipal|school\b/.test(lower)) people.push("School administrator");
  if (/\bhr|workplace|employee\b/.test(lower)) people.push("HR or workplace lead");
  if (/\bparent|guardian\b/.test(lower)) people.push("Reporting parent or guardian");
  if (/\bcoach\b/.test(lower)) people.push("Coach involved");

  if (people.length === 0) {
    people.push("Appropriate organization leader", "Person who reported the concern");
  }

  if (/\babuse|threat|immediate danger|ongoing danger|serious harm\b/.test(lower)) {
    people.push("Safeguarding lead or appropriate authority if risk is immediate or severe");
  }

  return uniqueStrings(people);
}

function inferResponsibilityPolicies(text: string) {
  const lower = text.toLowerCase();
  const policies: string[] = [];

  if (/\bleague|player|coach|team|practice|game|baseball|tee ball\b/.test(lower)) {
    policies.push("League conduct and safety policy");
  }
  if (/\bschool|student|teacher\b/.test(lower)) policies.push("School safeguarding or student conduct policy");
  if (/\bworkplace|employee|hr|manager\b/.test(lower)) policies.push("Workplace conduct and reporting policy");
  if (/\bharassment|abuse|misconduct|bully|bullying|threat\b/.test(lower)) {
    policies.push("Reporting and escalation procedure");
  }

  return uniqueStrings(policies.length > 0 ? policies : ["Organization conduct and safety policy"]);
}

function inferResponsibilityMessages(text: string, peopleToContact: string[]) {
  const lower = text.toLowerCase();
  const messages: string[] = [];

  if (peopleToContact.some((person) => person.toLowerCase().includes("president"))) {
    messages.push("Message to the league president");
  }
  if (peopleToContact.some((person) => person.toLowerCase().includes("parent") || person.toLowerCase().includes("guardian"))) {
    messages.push("Follow-up to the parent or guardian with process and timing");
  }
  if (/\bcoach\b/.test(lower)) messages.push("Conversation notes or message for the coach");
  if (messages.length === 0) messages.push("Message to the appropriate organization leader");

  return uniqueStrings(messages);
}

function inferResponsibilityNextSteps(text: string, peopleToContact: string[], policiesToCheck: string[]) {
  const lower = text.toLowerCase();
  const leader = peopleToContact[0] ?? "the appropriate organization leader";
  const policy = policiesToCheck[0] ?? "the relevant conduct or safety policy";
  const steps = [
    "Write down exactly what was reported, who reported it, dates, and any immediate safety concern.",
    `Check ${policy}.`,
    `Loop in ${leader} before deciding consequences alone.`,
    "Decide whether a temporary safety step is needed before the next practice, game, meeting, or interaction.",
    "Use the policy/process as the anchor before talking with the person involved.",
    "Follow up with the reporting person with the process and timeline."
  ];

  if (/\babuse|threat|immediate danger|ongoing danger|serious harm\b/.test(lower)) {
    steps.splice(3, 0, "If there is immediate or severe risk, involve the appropriate safeguarding lead, organization leadership, or authorities.");
  }

  return steps;
}

function firstPlainSentence(text: string) {
  return (
    text
      .trim()
      .replace(/\s+/g, " ")
      .split(/[.!?]/)[0]
      ?.trim()
      .slice(0, 140) ?? ""
  );
}

function isOrientationMoment(text: string, session: CurrentSession) {
  const lower = text.toLowerCase();

  return (
    session.touchpointType === "morning_orientation" ||
    /\b(prepare|preparing|before|about to|going into|show up|orientation|hard conversation|practice|meeting|transition)\b/.test(lower)
  );
}

function isQuestGoalMoment(text: string) {
  const lower = text.toLowerCase();

  return (
    /\b(goal|goals|habit|habits|aspiration|aspire|becoming|practice|growth challenge|want to become|trying to build)\b/.test(lower) ||
    /\bi want to (be|become|write|run|running|create|make|practice|build|get better|be more|show up|lead|parent|exercise|eat|sleep|move|start)\b/.test(
      lower
    ) ||
    /\bi'?m trying to (be|become|write|run|running|create|make|practice|build|get better|be more|show up|lead|parent|exercise|eat|sleep|move|start)\b/.test(
      lower
    ) ||
    /\bi'?d like to (be|become|write|run|running|create|make|practice|build|get better|be more|show up|lead|parent|exercise|eat|sleep|move|start)\b/.test(
      lower
    ) ||
    /\bi need to get better at\b/.test(lower) ||
    /\b(be more present|write more|be healthier|start running|running more|run more|better leader|better parent|better creator)\b/.test(
      lower
    )
  ) && (
    !isDecisionMoment(text)
  );
}

function isQuestOfferMessage(message: ClaraMessage | undefined) {
  return message?.choices?.includes("Make it a quest") ?? false;
}

function isQuestConfirmChoice(text: string) {
  const normalized = normalizeChoice(text);
  return ["make it a quest", "turn it into a quest", "yes", "yeah", "yep", "sure"].includes(normalized);
}

function isQuestDeclineChoice(text: string) {
  return ["not now", "no", "nope", "nah"].includes(normalizeChoice(text));
}

function isQuestContinueChoice(text: string) {
  return ["keep talking", "keep going", "continue"].includes(normalizeChoice(text));
}

function questFromText(text: string, session: CurrentSession): Quest {
  return questFromSeed(questSeedFromText(text || latestQuestAspirationText(session)), session);
}

type QuestGenerationSource = "ai" | "fallback" | "domain_default";

type QuestGenerationResult = {
  quest: Quest;
  questGenerationSource: QuestGenerationSource;
};

type QuestValidationResult = {
  valid: boolean;
  validationFailureReason: string | null;
};

function questFromSeed(seed: QuestSeed, session: CurrentSession): Quest {
  return generateQuestFromSeed(seed, session).quest;
}

function generateQuestFromSeed(seed: QuestSeed, session: CurrentSession): QuestGenerationResult {
  const direction = seed.direction || inferQuestDirection(seed.originalAspiration);
  const selectedPractice = bestQuestPractice(seed);
  const questGenerationSource: QuestGenerationSource = selectedPractice || seed.domain !== "general" ? "domain_default" : "fallback";
  const practice = selectedPractice
    ? {
        practice: selectedPractice,
        cadence: inferQuestCadence(direction, selectedPractice)
      }
    : inferQuestPractice(direction);
  const now = new Date().toISOString();

  return {
    quest: {
      id: crypto.randomUUID(),
      createdAt: now,
      updatedAt: now,
      sourceSessionId: session.sessionId,
      title: inferQuestTitle(direction),
      direction,
      whyItMatters: inferQuestWhyItMatters(direction),
      practice: practice.practice,
      cadence: practice.cadence,
      checkInPrompt: inferQuestCheckInPrompt(direction),
      obstacles: inferQuestObstacles(direction),
      evidence: inferQuestEvidence(direction),
      nextStep: inferQuestNextStep(direction),
      status: "active"
    },
    questGenerationSource
  };
}

function validatedQuestFromSeed(seed: QuestSeed, session: CurrentSession): Quest | null {
  const enrichedSeed = seed.possiblePractices.length > 0 ? seed : enrichQuestSeedWithPracticeOptions(seed);
  const generated = generateQuestFromSeed(enrichedSeed, session);
  const latestUserText = [...session.messages].reverse().find((message) => message.role === "user")?.text ?? "";
  const validationResult = validateQuest(generated.quest, enrichedSeed, latestUserText);

  console.log("Quest generation", {
    questSeed: enrichedSeed,
    questGenerationSource: generated.questGenerationSource,
    generatedQuest: generated.quest,
    validationResult: validationResult.valid,
    validationFailureReason: validationResult.validationFailureReason
  });

  if (validationResult.valid) return generated.quest;

  const defaultPractices = domainDefaultQuestPractices(enrichedSeed);
  const regeneratedSeed: QuestSeed = {
    ...enrichedSeed,
    possiblePractices: defaultPractices,
    selectedPractice: defaultPractices[0]
  };
  const regenerated = generateQuestFromSeed(regeneratedSeed, session);
  const regeneratedValidation = validateQuest(regenerated.quest, regeneratedSeed, latestUserText);

  console.log("Quest generation retry", {
    questSeed: regeneratedSeed,
    questGenerationSource: "domain_default",
    generatedQuest: regenerated.quest,
    validationResult: regeneratedValidation.valid,
    validationFailureReason: regeneratedValidation.validationFailureReason
  });

  return regeneratedValidation.valid ? regenerated.quest : null;
}

function questCreatedText(quest: Quest) {
  return `Quest created: ${quest.title}. Try this ${formatQuestCadence(quest.cadence).toLowerCase()}: ${quest.practice}`;
}

function latestQuestAspirationText(session: CurrentSession) {
  return (
    [...session.messages]
      .reverse()
      .find(
        (message) =>
          message.role === "user" &&
          !isQuestControlMessage(message.text) &&
          isQuestGoalMoment(message.text)
      )?.text ?? ""
  );
}

function questSeedFromText(text: string): QuestSeed {
  const originalAspiration = text.trim();
  const direction = inferQuestDirection(originalAspiration);
  const domain = inferQuestDomain(originalAspiration, direction);
  const peopleOrContext = inferQuestPeopleOrContext(originalAspiration);

  return {
    originalAspiration,
    direction,
    domain,
    peopleOrContext,
    possiblePractices: domainDefaultQuestPractices({ direction, domain, peopleOrContext }),
    selectedPractice: null
  };
}

function questSeedForSession(session: CurrentSession, latestText: string) {
  if (session.questSeed) return session.questSeed;

  const seedText = !isQuestControlMessage(latestText)
    ? latestText
    : latestQuestAspirationText(session) || sessionText(session);

  return questSeedFromText(seedText);
}

function enrichQuestSeedWithPracticeOptions(seed: QuestSeed): QuestSeed {
  const possiblePractices = seed.possiblePractices.length > 0 ? seed.possiblePractices : inferQuestPracticeOptions(seed.direction);

  return {
    ...seed,
    possiblePractices
  };
}

function selectQuestPractice(seed: QuestSeed, choice: string): QuestSeed {
  const practice = questPracticeFromChoice(seed, choice);

  return {
    ...enrichQuestSeedWithPracticeOptions(seed),
    selectedPractice: practice
  };
}

function bestQuestPractice(seed: QuestSeed) {
  return seed.selectedPractice || seed.possiblePractices[0] || null;
}

function isQuestControlMessage(text: string) {
  const normalized = normalizeChoice(text);

  return (
    isQuestConfirmChoice(text) ||
    isQuestDeclineChoice(text) ||
    isQuestContinueChoice(text) ||
    isAcknowledgement(text) ||
    isStoppingSignal(text) ||
    isQuestPracticeIdeaRequest(text) ||
    ["i'm not sure", "im not sure", "not sure", "i don't know", "i dont know", "do you have any ideas", "give me ideas"].includes(
      normalized
    )
  );
}

function isQuestPracticeIdeaRequest(text: string) {
  const normalized = normalizeChoice(text);
  const lower = text.toLowerCase();

  return (
    normalized === "i'm not sure" ||
    normalized === "im not sure" ||
    normalized === "not sure" ||
    normalized === "i don't know" ||
    normalized === "i dont know" ||
    /\bi'?m not sure\b/.test(lower) ||
    /\bi don'?t know\b/.test(lower) ||
    /\bdo you have any ideas\b/.test(lower) ||
    /\bwhat could i try\b/.test(lower) ||
    /\bgive me ideas\b/.test(lower) ||
    /\bany ideas\b/.test(lower)
  );
}

function inferQuestPeopleOrContext(text: string) {
  const lower = text.toLowerCase();
  const context: string[] = [];

  if (/\b(kids|children)\b/.test(lower)) context.push("kids", "family time");
  if (/\bfamily\b/.test(lower)) context.push("family time");
  if (/\bwork|team|leader|leadership\b/.test(lower)) context.push("work", "leadership");
  if (/\bwrite|writing\b/.test(lower)) context.push("writing");
  if (/\bhealth|healthier|exercise|move|sleep|eat\b/.test(lower)) context.push("health");
  if (/\bcreate|creator|creative|make\b/.test(lower)) context.push("creative work");

  return uniqueStrings(context);
}

function inferQuestDomain(originalAspiration: string, direction: string): QuestSeed["domain"] {
  const lower = `${originalAspiration} ${direction}`.toLowerCase();

  if (/\b(run|running|runner|jog|jogging|fitness|exercise|workout|health|healthier|walk|walking|move|sleep|eat)\b/.test(lower)) {
    return "physical";
  }
  if (/\b(write|writing|draft|creative|creativity|create|creator|make|making)\b/.test(lower)) return "creative";
  if (/\b(present|phone|attention|kids|children|family)\b/.test(lower)) return "presence";
  if (/\b(leader|leadership|lead|team|manage|manager)\b/.test(lower)) return "leadership";
  if (/\b(parent|parenting|kid|kids|child|children)\b/.test(lower)) return "parenting";

  return "general";
}

function domainDefaultQuestPractices(seed: Pick<QuestSeed, "domain" | "direction" | "peopleOrContext">) {
  const lower = directionWithContext(seed).toLowerCase();

  if (seed.domain === "physical" || /\b(run|running|fitness|exercise|workout)\b/.test(lower)) {
    if (/\b(run|running|runner|jog|jogging)\b/.test(lower)) {
      return [
        "Do two easy runs this week, with no pace goal.",
        "Lay out running clothes the night before one planned run.",
        "Run/walk for 20 minutes once this week.",
        "Choose two days now when running is realistic."
      ];
    }

    return [
      "Do two easy movement sessions this week, with no performance goal.",
      "Choose two realistic workout windows for the week.",
      "Keep the first session deliberately easy.",
      "Lay out what you need the night before one planned session."
    ];
  }

  if (seed.domain === "presence" && /\b(kids|children|family)\b/.test(lower)) {
    return [
      "Put your phone away for the first ten minutes after getting home.",
      "Ask one follow-up question before giving advice.",
      "Do one thing with them without multitasking.",
      "Let one child choose a ten-minute activity and fully join it."
    ];
  }

  if (seed.domain === "presence") {
    return [
      "Choose one daily transition and spend the first few minutes without checking your phone.",
      "Take one slow breath before entering the next room, meeting, or conversation.",
      "Notice three concrete details before reaching for the next thing."
    ];
  }

  if (seed.domain === "creative") {
    if (/\b(write|writing|draft)\b/.test(lower)) {
      return [
        "Spend 20 bad minutes writing twice this week.",
        "Open the draft and add one paragraph.",
        "Make a tiny outline before trying to write well.",
        "Keep one sentence you might want to expand later."
      ];
    }

    return [
      "Make one rough version before deciding whether it is good.",
      "Spend 20 bad minutes making twice this week.",
      "Make a tiny outline before trying to make it well.",
      "Share one unfinished piece with someone safe."
    ];
  }

  if (seed.domain === "leadership") {
    return [
      "Ask one clarifying question before offering your own answer.",
      "Name the outcome you want before the next important conversation.",
      "Give one person clearer context before asking for work."
    ];
  }

  if (seed.domain === "parenting") {
    return [
      "Give one small moment your full attention before correcting or directing.",
      "Ask one follow-up question before giving advice.",
      "Create a ten-minute window where your kid gets your full attention."
    ];
  }

  return [
    "Choose one moment this week where the practice can become visible.",
    "Make the practice small enough to do once this week.",
    "Do one concrete 10-minute version this week and notice what changes."
  ];
}

function directionWithContext(seed: Pick<QuestSeed, "direction" | "peopleOrContext">) {
  return `${seed.direction} ${seed.peopleOrContext.join(" ")}`;
}

function inferQuestPracticeOptions(direction: string) {
  const seed = questSeedFromText(direction);
  const lower = directionWithContext(seed).toLowerCase();

  if (seed.domain !== "general") {
    return domainDefaultQuestPractices(seed);
  }

  if (lower.includes("present") && /\b(kids|children|family)\b/.test(lower)) {
    return [
      "Put your phone away for the first ten minutes after you get home and give your kids your full attention.",
      "Ask one follow-up question before giving advice or moving on.",
      "Do one thing with them without multitasking.",
      "Let them choose a ten-minute activity and fully join it."
    ];
  }

  if (lower.includes("present")) {
    return [
      "Choose one daily transition and spend the first few minutes without checking your phone.",
      "Take one slow breath before entering the next room, meeting, or conversation.",
      "Notice three concrete details before reaching for the next thing."
    ];
  }

  if (lower.includes("write")) {
    return [
      "Open a writing document for ten quiet minutes before judging what comes out.",
      "Write one rough paragraph before checking messages.",
      "Keep a tiny note of one sentence you might want to expand later."
    ];
  }

  if (lower.includes("health") || lower.includes("healthier") || lower.includes("exercise") || lower.includes("move")) {
    return [
      "Choose one ten-minute walk or stretch you can do even on an imperfect day.",
      "Pick one meal or snack where you make the next healthy choice.",
      "Set a simple bedtime cue and try it once this week."
    ];
  }

  if (lower.includes("leader")) {
    return [
      "Ask one clarifying question before offering your own answer.",
      "Name the outcome you want before the next important conversation.",
      "Give one person clearer context before asking for work."
    ];
  }

  if (lower.includes("parent")) {
    return [
      "Give one small moment your full attention before correcting or directing.",
      "Ask one follow-up question before giving advice.",
      "Create a ten-minute window where your kid gets your full attention."
    ];
  }

  if (lower.includes("creator") || lower.includes("create") || lower.includes("make")) {
    return [
      "Make one rough version before deciding whether it is good.",
      "Spend twenty minutes making without editing.",
      "Share one unfinished piece with someone safe."
    ];
  }

  return [
    "Do one concrete 10-minute version this week and notice what changes.",
    "Make the practice small enough to do once this week.",
    "Choose one moment where this direction can become visible."
  ];
}

function questPracticeChoiceLabels(seed: QuestSeed) {
  return enrichQuestSeedWithPracticeOptions(seed).possiblePractices.map(questPracticeLabel).slice(0, 4);
}

function questPracticeLabel(practice: string) {
  const lower = practice.toLowerCase();
  if (lower.includes("two easy runs")) return "Two easy runs";
  if (lower.includes("running clothes")) return "Lay out clothes";
  if (lower.includes("run/walk")) return "Run/walk";
  if (lower.includes("run windows") || lower.includes("running is realistic")) return "Pick run windows";
  if (lower.includes("20 bad minutes")) return "Bad writing minutes";
  if (lower.includes("first ten minutes") || lower.includes("ten-minute window")) return "First ten minutes";
  if (lower.includes("follow-up question")) return "One follow-up question";
  if (lower.includes("without multitasking")) return "No multitasking";
  if (lower.includes("choose a ten-minute activity")) return "Kid chooses activity";
  if (lower.includes("writing document")) return "Ten-minute writing";
  if (lower.includes("rough paragraph")) return "One rough paragraph";
  if (lower.includes("ten-minute walk")) return "Ten-minute walk";
  if (lower.includes("clarifying question")) return "Clarifying question";
  if (lower.includes("rough version")) return "Rough version";
  return shortenQuestText(practice.replace(/^For one week,\s*/i, ""), 28);
}

function questPracticeFromChoice(seed: QuestSeed, choice: string) {
  const enrichedSeed = enrichQuestSeedWithPracticeOptions(seed);
  const normalizedChoice = normalizeChoice(choice);

  return (
    enrichedSeed.possiblePractices.find((practice) => normalizeChoice(questPracticeLabel(practice)) === normalizedChoice) ??
    enrichedSeed.possiblePractices[0] ??
    inferQuestPractice(enrichedSeed.direction).practice
  );
}

function isQuestPracticeChoice(text: string, seed: QuestSeed | null) {
  if (!seed) return false;
  const labels = questPracticeChoiceLabels(seed);
  return labels.some((label) => normalizeChoice(label) === normalizeChoice(text));
}

function questIdeasText(seed: QuestSeed) {
  const practices = enrichQuestSeedWithPracticeOptions(seed).possiblePractices.slice(0, 4);
  const numbered = practices.map((practice, index) => `${index + 1}. ${practice}`).join("\n");

  return `Yes. A few small ones:\n${numbered}\n\nWant to make one of these a quest?`;
}

function validateQuest(quest: Quest, seed: QuestSeed, latestUserText = ""): QuestValidationResult {
  const lowerTitle = quest.title.toLowerCase();
  const lowerPractice = quest.practice.toLowerCase();
  const normalizedPractice = normalizeChoice(quest.practice);
  const normalizedAspiration = normalizeChoice(seed.originalAspiration);
  const normalizedLatestUserText = normalizeChoice(latestUserText);
  const directionWords = meaningfulQuestWords(seed.direction);
  const practiceWords = meaningfulQuestWords(quest.practice);
  const relatesToDirection =
    seed.possiblePractices.includes(quest.practice) ||
    directionWords.length === 0 ||
    directionWords.some((word) => practiceWords.includes(word)) ||
    lowerPractice.includes("phone") ||
    lowerPractice.includes("ten") ||
    lowerPractice.includes("run") ||
    lowerPractice.includes("write");

  if (isQuestControlMessage(quest.title)) {
    return { valid: false, validationFailureReason: "title_is_control_message" };
  }
  if (["i'm not sure", "im not sure", "not sure"].includes(normalizeChoice(quest.title)) || lowerTitle.includes("do you have any ideas")) {
    return { valid: false, validationFailureReason: "title_is_low_signal" };
  }
  if (isQuestPracticeIdeaRequest(quest.practice)) {
    return { valid: false, validationFailureReason: "practice_is_idea_request" };
  }
  if (/^try\s+one\s+small\s+version\s+of\b/i.test(quest.practice.trim())) {
    return { valid: false, validationFailureReason: "practice_uses_generic_quoted_template" };
  }
  if (normalizedPractice === normalizedAspiration || normalizedPractice.includes(`"${normalizedAspiration}"`)) {
    return { valid: false, validationFailureReason: "practice_repeats_original_aspiration" };
  }
  if (normalizedLatestUserText && normalizedPractice === normalizedLatestUserText) {
    return { valid: false, validationFailureReason: "practice_is_latest_user_message" };
  }
  if (/[?]$/.test(quest.practice.trim())) {
    return { valid: false, validationFailureReason: "practice_is_question" };
  }
  if (quest.practice.trim().split(/\s+/).length < 5 || /\b(something|somehow|better|more)\b$/i.test(quest.practice.trim())) {
    return { valid: false, validationFailureReason: "practice_is_too_vague" };
  }
  if (!hasConcreteQuestAction(quest.practice)) {
    return { valid: false, validationFailureReason: "practice_has_no_concrete_action" };
  }
  if (!relatesToDirection) {
    return { valid: false, validationFailureReason: "practice_does_not_match_aspiration" };
  }

  return { valid: true, validationFailureReason: null };
}

function isValidQuest(quest: Quest, seed: QuestSeed) {
  return validateQuest(quest, seed).valid;
}

function meaningfulQuestWords(text: string) {
  const stopWords = new Set(["want", "more", "better", "be", "with", "the", "and", "for", "this", "that", "your", "you"]);
  return text
    .toLowerCase()
    .replace(/[^a-z0-9\s]/g, " ")
    .split(/\s+/)
    .filter((word) => word.length > 2 && !stopWords.has(word));
}

function hasConcreteQuestAction(text: string) {
  return /\b(put|ask|do|let|choose|open|write|run|walk|lay|keep|pick|set|take|notice|make|spend|share|give|name|try|create)\b/i.test(
    text
  );
}

function inferQuestDirection(text: string) {
  const cleaned = text
    .trim()
    .replace(/\s+/g, " ")
    .replace(/[.!?]+$/g, "");
  const lower = cleaned.toLowerCase();

  if (/\b(start running|running more|run more|running again|start running again|start running more again)\b/.test(lower)) {
    return "Rebuild a running rhythm";
  }
  if (/\b(start writing|write more|writing again|start writing again)\b/.test(lower)) {
    return "Start writing again";
  }

  const direct =
    lower.match(/\bi want to (.+)$/)?.[1] ??
    lower.match(/\bi'?m trying to (.+)$/)?.[1] ??
    lower.match(/\bi'?d like to (.+)$/)?.[1] ??
    lower.match(/\bi would like to (.+)$/)?.[1] ??
    lower.match(/\bi need to get better at (.+)$/)?.[1] ??
    lower.match(/\bi want to become (.+)$/)?.[1] ??
    "";

  if (direct) return sentenceCaseQuestDirection(direct);
  if (lower.includes("be more present")) return "Be more present";
  if (lower.includes("write more")) return "Write more";
  if (lower.includes("be healthier")) return "Be healthier";
  if (lower.includes("better leader")) return "Be a better leader";
  if (lower.includes("better parent")) return "Be a better parent";
  if (lower.includes("better creator")) return "Be a better creator";

  return cleaned ? sentenceCaseQuestDirection(cleaned) : "Practice something that matters";
}

function sentenceCaseQuestDirection(text: string) {
  const trimmed = text.trim().replace(/^to\s+/i, "").replace(/\s+/g, " ");
  if (!trimmed) return "Practice something that matters";
  return `${trimmed.charAt(0).toUpperCase()}${trimmed.slice(1)}`;
}

function inferQuestTitle(direction: string) {
  const lower = direction.toLowerCase();
  if (/\b(run|running|runner|jog|jogging|running rhythm)\b/.test(lower)) return "Start running again";
  if (lower.includes("present") && /\b(kids|children|family)\b/.test(lower)) return "Protect the first ten minutes";
  if (lower.includes("present")) return "Arrive fully";
  if (lower.includes("write")) return "Start writing again";
  if (lower.includes("health") || lower.includes("healthier") || lower.includes("exercise") || lower.includes("move")) {
    return "Choose the next healthy move";
  }
  if (lower.includes("leader")) return "Practice the better question";
  if (lower.includes("parent")) return "One undistracted moment";
  if (lower.includes("creator") || lower.includes("create") || lower.includes("make")) return "Make before measuring";
  return `Practice: ${shortenQuestText(direction, 42)}`;
}

function inferQuestWhyItMatters(direction: string) {
  const lower = direction.toLowerCase();
  if (/\b(run|running|runner|jog|jogging|running rhythm)\b/.test(lower)) {
    return "You want to return to something that gives you energy, health, and momentum.";
  }
  if (lower.includes("present") && /\b(kids|children|family)\b/.test(lower)) {
    return "You want time with your kids to feel more connected, especially in the small transitions.";
  }
  if (lower.includes("present")) return "You want to meet the day with more attention and less drift.";
  if (lower.includes("write")) return "Writing seems like one of the ways you stay close to what is yours to say.";
  if (lower.includes("health") || lower.includes("healthier") || lower.includes("exercise") || lower.includes("move")) {
    return "You want your body and energy to have a little more support.";
  }
  if (lower.includes("leader")) return "You want your presence to help the people around you do better work.";
  if (lower.includes("parent")) return "You want your parenting to show up in ordinary moments, not just big ones.";
  if (lower.includes("creator") || lower.includes("create") || lower.includes("make")) {
    return "You want making things to become a lived practice, not only an idea you carry around.";
  }
  return "This sounds like something you want to practice in real life, not just think about.";
}

function inferQuestPractice(direction: string): { practice: string; cadence: QuestCadence } {
  const lower = direction.toLowerCase();
  if (/\b(run|running|runner|jog|jogging|running rhythm)\b/.test(lower)) {
    return {
      practice: "Do two easy runs this week, with no pace goal.",
      cadence: "weekly"
    };
  }
  if (lower.includes("present") && /\b(kids|children|family)\b/.test(lower)) {
    return {
      practice: "Put your phone away for the first ten minutes after getting home.",
      cadence: "daily"
    };
  }
  if (lower.includes("present")) {
    return {
      practice: "Choose one transition each day and enter it without checking your phone for the first few minutes.",
      cadence: "daily"
    };
  }
  if (lower.includes("write")) {
    return {
      practice: "Spend 20 bad minutes writing twice this week.",
      cadence: "weekly"
    };
  }
  if (lower.includes("health") || lower.includes("healthier") || lower.includes("exercise") || lower.includes("move")) {
    return {
      practice: "Pick one small healthy move each day that you can do even when the day is imperfect.",
      cadence: "daily"
    };
  }
  if (lower.includes("leader")) {
    return {
      practice: "In one conversation this week, ask the question that helps someone else get clearer.",
      cadence: "weekly"
    };
  }
  if (lower.includes("parent")) {
    return {
      practice: "Choose one small daily moment where your attention is fully with your kid before you correct or direct.",
      cadence: "daily"
    };
  }
  if (lower.includes("creator") || lower.includes("create") || lower.includes("make")) {
    return {
      practice: "Set a short making window this week where the only goal is to make one rough version.",
      cadence: "weekly"
    };
  }

  return {
    practice: "Do one concrete 10-minute version this week and notice what changes.",
    cadence: "weekly"
  };
}

function inferQuestCadence(direction: string, practice: string): QuestCadence {
  const lower = `${direction} ${practice}`.toLowerCase();

  if (/\b(today|once|one time|this conversation|next conversation)\b/.test(lower)) return "once";
  if (/\bdaily|each day|every day|after you get home|first ten minutes|phone away|one small daily\b/.test(lower)) return "daily";
  if (/\bweek|weekly|this week|one conversation|rough version|making window\b/.test(lower)) return "weekly";
  return "weekly";
}

function inferQuestCheckInPrompt(direction: string) {
  const lower = direction.toLowerCase();
  if (/\b(run|running|runner|jog|jogging|running rhythm)\b/.test(lower)) return "What made it easier or harder to get out the door?";
  if (lower.includes("present") && /\b(kids|children|family)\b/.test(lower)) return "What changed when you arrived more fully?";
  if (lower.includes("present")) return "Where did you feel a little more here today?";
  if (lower.includes("write")) return "What happened when you made space before judging the writing?";
  if (lower.includes("health") || lower.includes("healthier")) return "What gave your body or energy a little support?";
  if (lower.includes("leader")) return "What did your question make clearer?";
  if (lower.includes("parent")) return "Where did your attention change the moment?";
  if (lower.includes("creator") || lower.includes("create") || lower.includes("make")) return "What existed after you made the rough version?";
  return "What did you notice when you tried the practice?";
}

function inferQuestObstacles(direction: string) {
  const lower = direction.toLowerCase();
  if (/\b(run|running|runner|jog|jogging|running rhythm)\b/.test(lower)) {
    return ["schedule", "fatigue", "weather", "trying to do too much too soon"];
  }
  if (lower.includes("present")) return ["fatigue", "work residue", "habit of checking messages"];
  if (lower.includes("write")) return ["perfectionism", "waiting for a big block of time", "judging too early"];
  if (lower.includes("health") || lower.includes("healthier")) return ["busy days", "all-or-nothing thinking", "low energy"];
  if (lower.includes("leader")) return ["rushing to solve", "unclear expectations", "taking on too much"];
  if (lower.includes("parent")) return ["fatigue", "reacting quickly", "competing demands"];
  if (lower.includes("creator") || lower.includes("create") || lower.includes("make")) return ["overthinking", "comparison", "waiting for the perfect idea"];
  return ["forgetting", "making it too large", "waiting for perfect conditions"];
}

function inferQuestEvidence(direction: string) {
  const lower = direction.toLowerCase();
  if (/\b(run|running|runner|jog|jogging|running rhythm)\b/.test(lower)) {
    return ["you get out the door", "the runs stay easy", "running starts to feel available again"];
  }
  if (lower.includes("present")) return ["you notice more details", "transitions feel less rushed", "connection feels easier"];
  if (lower.includes("write")) return ["pages exist", "starting feels easier", "you trust rough drafts more"];
  if (lower.includes("health") || lower.includes("healthier")) return ["more steady energy", "less all-or-nothing pressure", "one healthy choice leads to another"];
  if (lower.includes("leader")) return ["people leave clearer", "you listen before solving", "the room feels steadier"];
  if (lower.includes("parent")) return ["you pause before reacting", "small moments feel warmer", "your kid gets more of your attention"];
  if (lower.includes("creator") || lower.includes("create") || lower.includes("make")) return ["rough versions exist", "momentum returns", "you spend less time only thinking about it"];
  return ["the practice happens", "it feels a little easier to begin", "you notice what changes"];
}

function inferQuestNextStep(direction: string) {
  const lower = direction.toLowerCase();
  if (/\b(run|running|runner|jog|jogging|running rhythm)\b/.test(lower)) return "Choose two realistic run windows for this week.";
  if (lower.includes("present") && /\b(kids|children|family)\b/.test(lower)) return "Choose when the first ten-minute window starts.";
  if (lower.includes("write")) return "Choose the first ten-minute writing window.";
  if (lower.includes("health") || lower.includes("healthier")) return "Pick tomorrow's smallest healthy move.";
  if (lower.includes("leader")) return "Choose the next conversation where you want to practice the better question.";
  if (lower.includes("parent")) return "Choose one daily moment to meet without distraction.";
  if (lower.includes("creator") || lower.includes("create") || lower.includes("make")) return "Choose the rough version you can make first.";
  return "Choose the smallest version you can try this week.";
}

function shortenQuestText(text: string, maxLength: number) {
  const trimmed = text.trim().replace(/\s+/g, " ");
  return trimmed.length > maxLength ? `${trimmed.slice(0, maxLength - 1).trim()}...` : trimmed;
}

function hasUnclearDecisionContent(text: string) {
  const lower = text.toLowerCase();
  const hasTension = /\b(but|however|on the other hand|balance|tension|tradeoff|trade-off|competing)\b/.test(lower);
  const hasUncertainty = /\b(not sure|unsure|don'?t know|wondering|trying to figure out|worry|worried)\b/.test(lower);
  const hasFuture = /\b(future|later|next|long term|long-term|could|might|may|what if)\b/.test(lower);

  return (hasTension && hasUncertainty) || (hasUncertainty && hasFuture);
}

function routeChoiceText(route: ConversationRoute) {
  if (route === "decision_frame") {
    return "That sounds less like a moment to save and more like a decision to frame. Want to put the pieces on the table?";
  }

  return "Do you want to reflect on this, think it through, or figure out what to do next?";
}

function routeClassificationMemory(classification: RouteClassification) {
  return [
    "High-level Clara route:",
    `Route: ${classification.route}`,
    `Confidence: ${classification.confidence.toFixed(2)}`,
    `Reason: ${classification.reason}`,
    `Likely user need: ${routeUserNeed(classification.route)}`,
    `Suggested artifact: ${classification.suggestedArtifactType ?? "none"}`,
    `Suggested Clara behavior mode: ${classification.suggestedMode}`,
    "Use this route under the hood. Do not announce the route name to the user."
  ].join("\n");
}

function routeUserNeed(route: ConversationRoute) {
  const needs: Record<ConversationRoute, string> = {
    meaning_moment: "notice what mattered",
    decision_frame: "frame the question",
    responsibility_safety: "act responsibly",
    orientation: "orient before entering",
    quest_goal: "turn meaning into practice",
    support_witness: "be met with presence, not pushed into solving",
    unclear: "clarify what kind of help is needed"
  };

  return needs[route];
}

function responsibilityPlanMemory(plan: ResponsibilityPlan) {
  const lines = [
    "Responsibility Plan in progress.",
    `Issue: ${plan.issue}`,
    `Your role: ${plan.role}`,
    `Immediate concern: ${plan.immediateConcern}`,
    plan.nextSteps.length > 0 ? `Next steps: ${plan.nextSteps.join(" | ")}` : "",
    plan.peopleToContact.length > 0 ? `People to contact: ${plan.peopleToContact.join(", ")}` : "",
    plan.policiesToCheck.length > 0 ? `Policy to check: ${plan.policiesToCheck.join(", ")}` : "",
    plan.communicationsToDraft.length > 0 ? `Messages to draft: ${plan.communicationsToDraft.join(", ")}` : "",
    `Status: ${plan.status}`,
    "In responsibility/safety mode, prioritize concrete responsible action over reflective questions.",
    "If the user asks what to do or asks for advice, give a bounded action sequence first, then offer help drafting a message, turning it into a checklist, or saving the plan."
  ];

  return lines.filter(Boolean).join("\n");
}

function questMemory(quest: Quest) {
  const lines = [
    "Quest v1 is active.",
    `Quest: ${quest.title}`,
    `Direction: ${quest.direction}`,
    `Why it matters: ${quest.whyItMatters}`,
    `Practice: ${quest.practice}`,
    `Cadence: ${quest.cadence}`,
    `Check-in question: ${quest.checkInPrompt}`,
    quest.obstacles.length > 0 ? `What might get in the way: ${quest.obstacles.join(", ")}` : "",
    quest.evidence.length > 0 ? `Evidence it's working: ${quest.evidence.join(", ")}` : "",
    quest.nextStep ? `Next step: ${quest.nextStep}` : "",
    `Status: ${quest.status}`,
    "A Quest is a small meaning-aligned practice or experiment, not a productivity task.",
    "Keep Clara human and low-pressure. Do not gamify, promise streaks, or turn this into a complex goal plan."
  ];

  return lines.filter(Boolean).join("\n");
}

function decisionFrameUpdateMemory(update: DecisionFrameUpdate) {
  if (!hasDecisionFrameUpdate(update)) return "";

  const lines = [
    "Latest user reply added to the frame:",
    update.threads.length > 0 ? `What's involved added: ${update.threads.join(", ")}` : "",
    update.criteria.length > 0 ? `What matters added: ${update.criteria.join(", ")}` : "",
    update.tradeoffs.length > 0 ? `Tensions added: ${update.tradeoffs.join(", ")}` : "",
    update.knowns.length > 0 ? `What we know added: ${update.knowns.join(", ")}` : "",
    update.unknowns.length > 0 ? `What we still don't know added: ${update.unknowns.join(", ")}` : "",
    update.possiblePaths.length > 0 ? `Possible paths added: ${update.possiblePaths.join(", ")}` : "",
    update.optionNotes.length > 0 ? `Option notes added: ${update.optionNotes.join(", ")}` : "",
    update.comparisonNotes.length > 0 ? `Comparison notes added: ${update.comparisonNotes.join(", ")}` : "",
    update.researchQuestions.length > 0 ? `Research questions added: ${update.researchQuestions.join(", ")}` : "",
    update.researchTasks.length > 0 ? `Research tasks added: ${update.researchTasks.map((task) => task.question).join(", ")}` : "",
    update.currentFocus ? `Current focus: ${update.currentFocus}` : "",
    update.nextStep ? `Next honest step added: ${update.nextStep}` : "",
    update.frameSummary ? `Shape of the question: ${update.frameSummary}` : "",
    update.stage ? `Frame stage: ${update.stage}` : "",
    update.currentDecisionMode ? `Decision-thinking mode: ${update.currentDecisionMode}` : "",
    "Acknowledge the frame update naturally. Say things like 'I'd put that under tensions,' 'That seems like one of the big unknowns,' or 'That sounds like something that matters in the decision.'"
  ];

  return lines.filter(Boolean).join("\n");
}

function decisionFrameMemory(frame: DecisionFrame) {
  const lines = [
    "Decision Frame v1 is active.",
    `Decision question: ${frame.question}`,
    `Decision type: ${frame.decisionType}`,
    `Frame status: ${frame.status}`,
    `Frame stage: ${frame.stage}`,
    `Decision-thinking mode: ${frame.currentDecisionMode}`,
    frame.frameSummary ? `Shape of the question: ${frame.frameSummary}` : "",
    frame.currentFocus ? `Current focus: ${frame.currentFocus}` : "",
    frame.threads.length > 0 ? `What's involved: ${frame.threads.join(", ")}` : "",
    frame.criteria.length > 0 ? `What matters: ${frame.criteria.join(", ")}` : "",
    frame.tradeoffs.length > 0 ? `Tensions: ${frame.tradeoffs.join(", ")}` : "",
    frame.knowns.length > 0 ? `What we know: ${frame.knowns.join(", ")}` : "",
    frame.unknowns.length > 0 ? `What we still don't know: ${frame.unknowns.join(", ")}` : "",
    frame.possiblePaths.length > 0 ? `Possible paths: ${frame.possiblePaths.join(", ")}` : "",
    frame.optionNotes.length > 0 ? `Option notes: ${frame.optionNotes.join(", ")}` : "",
    frame.comparisonNotes.length > 0 ? `Comparison notes: ${frame.comparisonNotes.join(", ")}` : "",
    frame.researchQuestions.length > 0 ? `Research questions: ${frame.researchQuestions.join(", ")}` : "",
    frame.researchTasks.length > 0 ? `Research tasks: ${frame.researchTasks.map((task) => `${task.question} (${task.status})`).join(", ")}` : "",
    frame.nextStep ? `Next honest step: ${frame.nextStep}` : "",
    frame.sourceSummary ? `Source conversation summary: ${frame.sourceSummary}` : "",
    "Use the frame_decision listening move. Do not decide for the user.",
    "Use the current decision-thinking mode: reflect clarifies what matters; map names possible paths; research identifies facts and unknowns; compare puts paths against criteria; act names one next honest step.",
    "Use the decision-framing rhythm: identify what the user added, briefly say why it matters, then ask the next useful question or offer to pause.",
    "Each question should connect to one part of the frame: what's involved, a tension, what matters, an unknown, or the next honest step."
  ];

  return lines.filter(Boolean).join("\n");
}

function sameDecisionFrame(a: DecisionFrame, b: DecisionFrame) {
  return a.sourceSessionId === b.sourceSessionId && normalizeDecisionQuestion(a.question) === normalizeDecisionQuestion(b.question);
}

function activeDecisionFrameForSession(frames: DecisionFrame[], session: CurrentSession | null) {
  if (!session) return null;
  if (session.activeDecisionFrameId) {
    return frames.find((frame) => frame.id === session.activeDecisionFrameId && frame.status === "open") ?? null;
  }

  return frames.find((frame) => frame.sourceSessionId === session.sessionId && frame.status === "open") ?? null;
}

function activeResponsibilityPlanForSession(plans: ResponsibilityPlan[], session: CurrentSession | null) {
  if (!session) return null;
  if (session.activeResponsibilityPlanId) {
    return plans.find((plan) => plan.id === session.activeResponsibilityPlanId && plan.status !== "resolved") ?? null;
  }

  return plans.find((plan) => plan.sourceSessionId === session.sessionId && plan.status !== "resolved") ?? null;
}

function activeQuestForSession(quests: Quest[], session: CurrentSession | null) {
  if (!session) return null;
  if (session.activeQuestId) {
    return quests.find((quest) => quest.id === session.activeQuestId && quest.status === "active") ?? null;
  }

  return quests.find((quest) => quest.sourceSessionId === session.sessionId && quest.status === "active") ?? null;
}

function latestSubstantiveUserText(session: CurrentSession) {
  return (
    [...session.messages]
      .reverse()
      .find(
        (message) =>
          message.role === "user" &&
          !isMomentKind(message.text) &&
          !isReflectRouteChoice(message.text) &&
          !isThinkRouteChoice(message.text) &&
          !isFindNextStepRouteChoice(message.text) &&
          !isAcknowledgement(message.text)
      )?.text ?? ""
  );
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

  if (session.questSeed) {
    lines.push("Quest seed:");
    lines.push(`Original aspiration: ${session.questSeed.originalAspiration}`);
    lines.push(`Direction: ${session.questSeed.direction}`);
    lines.push(`Domain: ${session.questSeed.domain}`);
    if (session.questSeed.peopleOrContext.length > 0) {
      lines.push(`People/context: ${session.questSeed.peopleOrContext.join(", ")}`);
    }
    if (session.questSeed.possiblePractices.length > 0) {
      lines.push(`Possible practices: ${session.questSeed.possiblePractices.join(" | ")}`);
    }
    if (session.questSeed.selectedPractice) {
      lines.push(`Selected practice: ${session.questSeed.selectedPractice}`);
    }
    lines.push("Do not treat low-signal replies like 'I'm not sure' or 'Do you have any ideas?' as the quest direction.");
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

function isDecisionFrameStage(value: unknown): value is DecisionFrameStage {
  return (
    value === "opening" ||
    value === "mapping" ||
    value === "clarifying" ||
    value === "next_step" ||
    value === "paused" ||
    value === "closed"
  );
}

function isDecisionMode(value: unknown): value is DecisionMode {
  return value === "reflect" || value === "map" || value === "research" || value === "compare" || value === "act";
}

function isConversationRoute(value: unknown): value is ConversationRoute {
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

function normalizeConversationRoute(value: unknown): ConversationRoute {
  if (value === "moment") return "meaning_moment";
  if (value === "decision") return "decision_frame";
  return isConversationRoute(value) ? value : "meaning_moment";
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

function isQuestDomain(value: unknown): value is QuestSeed["domain"] {
  return (
    value === "presence" ||
    value === "physical" ||
    value === "creative" ||
    value === "leadership" ||
    value === "parenting" ||
    value === "general"
  );
}

function normalizeQuestSeed(value: unknown): QuestSeed | null {
  if (!isRecord(value)) return null;

  const originalAspiration =
    typeof value.originalAspiration === "string" && value.originalAspiration.trim()
      ? value.originalAspiration.trim()
      : typeof value.direction === "string" && value.direction.trim()
        ? value.direction.trim()
        : "";
  if (!originalAspiration) return null;

  const direction =
    typeof value.direction === "string" && value.direction.trim() ? value.direction.trim() : inferQuestDirection(originalAspiration);
  const peopleOrContext = cleanStringList(value.peopleOrContext);
  const domain = isQuestDomain(value.domain) ? value.domain : inferQuestDomain(originalAspiration, direction);
  const possiblePractices = cleanStringList(value.possiblePractices);
  const selectedPractice = typeof value.selectedPractice === "string" && value.selectedPractice.trim() ? value.selectedPractice.trim() : null;
  const seed: QuestSeed = {
    originalAspiration,
    direction,
    domain,
    peopleOrContext,
    possiblePractices,
    selectedPractice
  };

  return seed.possiblePractices.length > 0 ? seed : enrichQuestSeedWithPracticeOptions(seed);
}

function isQuestSeed(value: unknown): value is QuestSeed {
  return normalizeQuestSeed(value) !== null;
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

function isResearchTask(value: unknown): value is ResearchTask {
  return (
    isRecord(value) &&
    typeof value.id === "string" &&
    typeof value.question === "string" &&
    (value.status === "open" || value.status === "done") &&
    (value.notes === undefined || typeof value.notes === "string")
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
    isDecisionFrameStage(value.stage) &&
    isDecisionMode(value.currentDecisionMode) &&
    typeof value.frameSummary === "string" &&
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
    Array.isArray(value.possiblePaths) &&
    value.possiblePaths.every((item) => typeof item === "string") &&
    Array.isArray(value.optionNotes) &&
    value.optionNotes.every((item) => typeof item === "string") &&
    Array.isArray(value.comparisonNotes) &&
    value.comparisonNotes.every((item) => typeof item === "string") &&
    Array.isArray(value.researchQuestions) &&
    value.researchQuestions.every((item) => typeof item === "string") &&
    Array.isArray(value.researchTasks) &&
    value.researchTasks.every(isResearchTask) &&
    (value.currentFocus === null || typeof value.currentFocus === "string") &&
    (value.nextStep === null || typeof value.nextStep === "string") &&
    (value.sourceSessionId === null || typeof value.sourceSessionId === "string") &&
    (value.sourceSummary === null || typeof value.sourceSummary === "string")
  );
}

function isResponsibilityPlanStatus(value: unknown): value is ResponsibilityPlanStatus {
  return value === "open" || value === "monitoring" || value === "resolved";
}

function isResponsibilityPlan(value: unknown): value is ResponsibilityPlan {
  return (
    isRecord(value) &&
    typeof value.id === "string" &&
    typeof value.createdAt === "string" &&
    typeof value.updatedAt === "string" &&
    (value.sourceSessionId === null || typeof value.sourceSessionId === "string") &&
    typeof value.issue === "string" &&
    typeof value.role === "string" &&
    typeof value.immediateConcern === "string" &&
    Array.isArray(value.nextSteps) &&
    value.nextSteps.every((item) => typeof item === "string") &&
    Array.isArray(value.peopleToContact) &&
    value.peopleToContact.every((item) => typeof item === "string") &&
    Array.isArray(value.policiesToCheck) &&
    value.policiesToCheck.every((item) => typeof item === "string") &&
    Array.isArray(value.communicationsToDraft) &&
    value.communicationsToDraft.every((item) => typeof item === "string") &&
    isResponsibilityPlanStatus(value.status)
  );
}

function normalizeResponsibilityPlan(value: unknown): ResponsibilityPlan | null {
  if (!isRecord(value)) return null;

  if (isResponsibilityPlan(value)) {
    return value;
  }

  if (typeof value.id !== "string" || typeof value.createdAt !== "string") {
    return null;
  }

  const issue = typeof value.issue === "string" && value.issue.trim() ? value.issue : "Responsibility or safety concern";

  return {
    id: value.id,
    createdAt: value.createdAt,
    updatedAt: typeof value.updatedAt === "string" ? value.updatedAt : value.createdAt,
    sourceSessionId: typeof value.sourceSessionId === "string" ? value.sourceSessionId : null,
    issue,
    role: typeof value.role === "string" && value.role.trim() ? value.role : "Responsible person in the situation",
    immediateConcern:
      typeof value.immediateConcern === "string" && value.immediateConcern.trim()
        ? value.immediateConcern
        : "Make sure the concern is handled through the right process.",
    nextSteps: cleanStringList(value.nextSteps),
    peopleToContact: cleanStringList(value.peopleToContact),
    policiesToCheck: cleanStringList(value.policiesToCheck),
    communicationsToDraft: cleanStringList(value.communicationsToDraft),
    status: isResponsibilityPlanStatus(value.status) ? value.status : "open"
  };
}

function isQuestCadence(value: unknown): value is QuestCadence {
  return value === "once" || value === "daily" || value === "weekly" || value === "custom";
}

function isQuestStatus(value: unknown): value is QuestStatus {
  return value === "active" || value === "paused" || value === "completed";
}

function isQuest(value: unknown): value is Quest {
  return (
    isRecord(value) &&
    typeof value.id === "string" &&
    typeof value.createdAt === "string" &&
    typeof value.updatedAt === "string" &&
    (value.sourceSessionId === null || typeof value.sourceSessionId === "string") &&
    typeof value.title === "string" &&
    typeof value.direction === "string" &&
    typeof value.whyItMatters === "string" &&
    typeof value.practice === "string" &&
    isQuestCadence(value.cadence) &&
    typeof value.checkInPrompt === "string" &&
    Array.isArray(value.obstacles) &&
    value.obstacles.every((item) => typeof item === "string") &&
    Array.isArray(value.evidence) &&
    value.evidence.every((item) => typeof item === "string") &&
    (value.nextStep === null || typeof value.nextStep === "string") &&
    isQuestStatus(value.status)
  );
}

function normalizeQuest(value: unknown): Quest | null {
  if (!isRecord(value)) return null;

  if (isQuest(value)) {
    return value;
  }

  if (typeof value.id !== "string" || typeof value.createdAt !== "string") {
    return null;
  }

  const direction = typeof value.direction === "string" && value.direction.trim() ? value.direction : "Practice something that matters";

  return {
    id: value.id,
    createdAt: value.createdAt,
    updatedAt: typeof value.updatedAt === "string" ? value.updatedAt : value.createdAt,
    sourceSessionId: typeof value.sourceSessionId === "string" ? value.sourceSessionId : null,
    title: typeof value.title === "string" && value.title.trim() ? value.title : inferQuestTitle(direction),
    direction,
    whyItMatters:
      typeof value.whyItMatters === "string" && value.whyItMatters.trim()
        ? value.whyItMatters
        : inferQuestWhyItMatters(direction),
    practice:
      typeof value.practice === "string" && value.practice.trim()
        ? value.practice
        : inferQuestPractice(direction).practice,
    cadence: isQuestCadence(value.cadence) ? value.cadence : inferQuestPractice(direction).cadence,
    checkInPrompt:
      typeof value.checkInPrompt === "string" && value.checkInPrompt.trim()
        ? value.checkInPrompt
        : inferQuestCheckInPrompt(direction),
    obstacles: cleanStringList(value.obstacles),
    evidence: cleanStringList(value.evidence),
    nextStep: typeof value.nextStep === "string" && value.nextStep.trim() ? value.nextStep : inferQuestNextStep(direction),
    status: isQuestStatus(value.status) ? value.status : "active"
  };
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
  const storedPossiblePaths = cleanStringList(value.possiblePaths);
  const possiblePaths =
    storedPossiblePaths.length > 0 ? storedPossiblePaths : inferDecisionPossiblePaths(value.question, value.decisionType);
  const storedResearchQuestions = cleanStringList(value.researchQuestions);
  const researchQuestions =
    storedResearchQuestions.length > 0
      ? storedResearchQuestions
      : inferResearchQuestions(value.question, value.decisionType, unknowns, possiblePaths);
  const storedResearchTasks = Array.isArray(value.researchTasks) ? value.researchTasks.filter(isResearchTask) : [];
  const nextStep = typeof value.nextStep === "string" ? value.nextStep : null;
  const status = isDecisionFrameStatus(value.status) ? value.status : "open";
  const stage = isDecisionFrameStage(value.stage)
    ? value.stage
    : status === "closed"
      ? "closed"
      : inferDecisionStage({ tradeoffs, unknowns, nextStep });
  const currentDecisionMode = isDecisionMode(value.currentDecisionMode)
    ? value.currentDecisionMode
    : stage === "mapping"
      ? "map"
      : stage === "next_step"
        ? "act"
        : unknowns.length > 0
          ? "research"
          : "reflect";
  const frameSummary =
    typeof value.frameSummary === "string" && value.frameSummary.trim()
      ? value.frameSummary
      : inferFrameSummary({
          decisionType: value.decisionType,
          threads,
          criteria,
          tradeoffs,
          unknowns,
          question: value.question
        });

  return {
    id: value.id,
    createdAt: value.createdAt,
    updatedAt: typeof value.updatedAt === "string" ? value.updatedAt : value.createdAt,
    question: value.question,
    decisionType: value.decisionType,
    status,
    stage,
    currentDecisionMode,
    frameSummary,
    threads,
    criteria,
    tradeoffs,
    knowns: cleanStringList(value.knowns),
    unknowns,
    possiblePaths,
    optionNotes: cleanStringList(value.optionNotes),
    comparisonNotes: cleanStringList(value.comparisonNotes),
    researchQuestions,
    researchTasks: storedResearchTasks.length > 0 ? storedResearchTasks : makeResearchTasks(researchQuestions),
    currentFocus:
      typeof value.currentFocus === "string"
        ? value.currentFocus
        : chooseDecisionCurrentFocus({ threads, criteria, tradeoffs, unknowns }),
    nextStep,
    sourceSessionId: typeof value.sourceSessionId === "string" ? value.sourceSessionId : null,
    sourceSummary: typeof value.sourceSummary === "string" ? value.sourceSummary : null
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
    conversationRoute: normalizeConversationRoute((session as CurrentSession & { conversationRoute?: unknown }).conversationRoute),
    activeDecisionFrameId:
      typeof (session as CurrentSession & { activeDecisionFrameId?: unknown }).activeDecisionFrameId === "string"
        ? (session as CurrentSession & { activeDecisionFrameId: string }).activeDecisionFrameId
        : null,
    activeResponsibilityPlanId:
      typeof (session as CurrentSession & { activeResponsibilityPlanId?: unknown }).activeResponsibilityPlanId === "string"
        ? (session as CurrentSession & { activeResponsibilityPlanId: string }).activeResponsibilityPlanId
        : null,
    activeQuestId:
      typeof (session as CurrentSession & { activeQuestId?: unknown }).activeQuestId === "string"
        ? (session as CurrentSession & { activeQuestId: string }).activeQuestId
        : null,
    questSeed: normalizeQuestSeed((session as CurrentSession & { questSeed?: unknown }).questSeed),
    awaitingRouteChoice:
      typeof (session as CurrentSession & { awaitingRouteChoice?: unknown }).awaitingRouteChoice === "boolean"
        ? (session as CurrentSession & { awaitingRouteChoice: boolean }).awaitingRouteChoice
        : false,
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

function readResponsibilityPlansFromStorage(): ResponsibilityPlan[] {
  const storedPlans = window.localStorage.getItem(STORAGE_KEYS.responsibilityPlans);
  const parsedPlans = parseStoredJson<unknown>(storedPlans);

  if (Array.isArray(parsedPlans)) {
    return parsedPlans
      .map(normalizeResponsibilityPlan)
      .filter((plan): plan is ResponsibilityPlan => plan !== null);
  }

  if (storedPlans) {
    window.localStorage.removeItem(STORAGE_KEYS.responsibilityPlans);
  }

  return [];
}

function readQuestsFromStorage(): Quest[] {
  const storedQuests = window.localStorage.getItem(STORAGE_KEYS.quests);
  const parsedQuests = parseStoredJson<unknown>(storedQuests);

  if (Array.isArray(parsedQuests)) {
    return parsedQuests.map(normalizeQuest).filter((quest): quest is Quest => quest !== null);
  }

  if (storedQuests) {
    window.localStorage.removeItem(STORAGE_KEYS.quests);
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
    conversationRoute: "meaning_moment",
    activeDecisionFrameId: null,
    activeResponsibilityPlanId: null,
    activeQuestId: null,
    questSeed: null,
    awaitingRouteChoice: false,
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
  const [responsibilityPlans, setResponsibilityPlans] = useState<ResponsibilityPlan[]>([]);
  const [quests, setQuests] = useState<Quest[]>([]);
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
  const [selectedDecisionFrameId, setSelectedDecisionFrameId] = useState<string | null>(null);
  const settingsSaveTimer = useRef<number | null>(null);

  useEffect(() => {
    const parsedProfile = readProfileFromStorage();
    const parsedSessions = readSessionsFromStorage();
    const parsedSession = readCurrentSessionFromStorage();
    const parsedMeaningNotes = readMeaningNotesFromStorage();
    const parsedDecisionFrames = readDecisionFramesFromStorage();
    const parsedResponsibilityPlans = readResponsibilityPlansFromStorage();
    const parsedQuests = readQuestsFromStorage();

    if (parsedProfile) {
      setProfile(parsedProfile);
      setDraftProfile(parsedProfile);
      window.localStorage.setItem(STORAGE_KEYS.profile, JSON.stringify(parsedProfile));
    }

    setSessions(parsedSessions);
    setMeaningNotes(parsedMeaningNotes);
    setDecisionFrames(parsedDecisionFrames);
    setResponsibilityPlans(parsedResponsibilityPlans);
    setQuests(parsedQuests);

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
    if (ready) {
      window.localStorage.setItem(STORAGE_KEYS.responsibilityPlans, JSON.stringify(responsibilityPlans));
    }
  }, [responsibilityPlans, ready]);

  useEffect(() => {
    if (ready) {
      window.localStorage.setItem(STORAGE_KEYS.quests, JSON.stringify(quests));
    }
  }, [quests, ready]);

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

    if (currentSession.awaitingRouteChoice) {
      if (isReflectRouteChoice(trimmed) || (isNoSignal(trimmed) && currentSession.conversationRoute === "unclear")) {
        const sessionWithChoice: CurrentSession = {
          ...currentSession,
          conversationRoute: "meaning_moment",
          awaitingRouteChoice: false,
          messages: [
            ...currentSession.messages,
            makeUserMessage(trimmed),
            makeClaraMessage({
              text: "Okay. We'll treat it like a moment to reflect on. What part feels most worth noticing?",
              expectedInput: "text"
            })
          ]
        };
        setCurrentSession(sessionWithChoice);
        setAnswer("");
        return;
      }

      if (isFindNextStepRouteChoice(trimmed)) {
        const sessionWithChoice: CurrentSession = {
          ...currentSession,
          conversationRoute: "responsibility_safety",
          awaitingRouteChoice: false,
          messages: [
            ...currentSession.messages,
            makeUserMessage(trimmed),
            makeClaraMessage({
              text: "Okay. Give me the situation in one paragraph, and I'll help make the next step concrete.",
              expectedInput: "text"
            })
          ]
        };
        setCurrentSession(sessionWithChoice);
        setAnswer("");
        return;
      }

      if (isThinkRouteChoice(trimmed) || isYesSignal(trimmed)) {
        const frameText = latestSubstantiveUserText(currentSession) || sessionText(currentSession) || trimmed;
        const frame = decisionFrameFromText(frameText, currentSession);
        const sessionWithFrame: CurrentSession = {
          ...currentSession,
          conversationRoute: "decision_frame",
          activeDecisionFrameId: frame.id,
          awaitingRouteChoice: false,
          messages: [...currentSession.messages, makeUserMessage(trimmed)]
        };

        console.log("Decision Frame detected", frame);
        setDecisionFrames((current) =>
          current.some((existing) => sameDecisionFrame(existing, frame)) ? current : [frame, ...current]
        );

        const claraResult = await generateClaraFromConversation(sessionWithFrame, profile, sessions, {
          userIntent: "confirm",
          decisionFrame: frame
        });
        setCurrentSession(
          finalizeGeneratedSession(
            {
              ...sessionWithFrame,
              messages: [
                ...sessionWithFrame.messages,
                makeClaraMessage({
                  text: claraResult.text,
                  expectedInput: "text"
                })
              ]
            },
            frame
          )
        );
        setAnswer("");
        return;
      }
    }

    if (isQuestOfferMessage(latestClara)) {
      const currentSeed = currentSession.questSeed ?? questSeedForSession(currentSession, trimmed);
      const enrichedSeed = enrichQuestSeedWithPracticeOptions(currentSeed);
      const sessionWithChoice: CurrentSession = {
        ...currentSession,
        conversationRoute: "quest_goal",
        questSeed: enrichedSeed,
        awaitingRouteChoice: false,
        messages: [...currentSession.messages, makeUserMessage(trimmed)]
      };

      if (isQuestPracticeChoice(trimmed, enrichedSeed)) {
        const selectedSeed = selectQuestPractice(enrichedSeed, trimmed);
        const quest = validatedQuestFromSeed(selectedSeed, sessionWithChoice);
        if (!quest) {
          setCurrentSession({
            ...sessionWithChoice,
            questSeed: selectedSeed,
            messages: [
              ...sessionWithChoice.messages,
              makeClaraMessage({
                text: "I don't want to save a flimsy quest. What small practice would actually fit that aspiration?",
                expectedInput: "text"
              })
            ]
          });
          setAnswer("");
          return;
        }

        console.log("Quest created", quest);
        setQuests((current) => [quest, ...current.filter((item) => item.id !== quest.id)]);
        setCurrentSession({
          ...sessionWithChoice,
          questSeed: selectedSeed,
          activeQuestId: quest.id,
          messages: [
            ...sessionWithChoice.messages,
            makeClaraMessage({
              text: questCreatedText(quest),
              expectedInput: "choice",
              choices: ["Keep going", "Done for today"]
            })
          ]
        });
        setAnswer("");
        return;
      }

      if (isQuestConfirmChoice(trimmed)) {
        const quest = validatedQuestFromSeed(enrichedSeed, sessionWithChoice);
        if (!quest) {
          setCurrentSession({
            ...sessionWithChoice,
            messages: [
              ...sessionWithChoice.messages,
              makeClaraMessage({
                text: "I don't want to turn the wrong thing into a quest. What is the small practice you want to try?",
                expectedInput: "text"
              })
            ]
          });
          setAnswer("");
          return;
        }

        console.log("Quest created", quest);
        setQuests((current) => [quest, ...current.filter((item) => item.id !== quest.id)]);
        setCurrentSession({
          ...sessionWithChoice,
          activeQuestId: quest.id,
          messages: [
            ...sessionWithChoice.messages,
            makeClaraMessage({
              text: questCreatedText(quest),
              expectedInput: "choice",
              choices: ["Keep going", "Done for today"]
            })
          ]
        });
        setAnswer("");
        return;
      }

      if (isQuestDeclineChoice(trimmed)) {
        setCurrentSession({
          ...sessionWithChoice,
          messages: [
            ...sessionWithChoice.messages,
            makeClaraMessage({
              text: "Okay. We can leave it as an intention for now.",
              expectedInput: "none"
            })
          ]
        });
        setAnswer("");
        return;
      }

      if (isQuestContinueChoice(trimmed)) {
        const routeClassification = routeMetadata("quest_goal", 0.95, "The user wants to keep exploring the aspiration before making a quest.");
        const claraResult = await generateClaraFromConversation(sessionWithChoice, profile, sessions, {
          userIntent: "explicit_continue",
          routeClassification
        });
        setCurrentSession({
          ...sessionWithChoice,
          messages: [
            ...sessionWithChoice.messages,
            makeClaraMessage({
              text: claraResult.text,
              expectedInput: "text"
            })
          ]
        });
        setAnswer("");
        return;
      }
    }

    const activeFrameForControl = activeDecisionFrameForSession(decisionFrames, currentSession);
    const frameControlChoice = activeFrameForControl ? decisionControlChoice(trimmed) : null;

    if (activeFrameForControl && frameControlChoice) {
      if (frameControlChoice === "pause") {
        await closeSession(trimmed, "Saved. You can come back to this from Frames.");
        return;
      }

      const updatedFrame = applyDecisionControlToFrame(activeFrameForControl, frameControlChoice);
      const controlUpdate: DecisionFrameUpdate = {
        ...emptyDecisionFrameUpdate(decisionFocusForMode(updatedFrame.currentDecisionMode)),
        currentDecisionMode: updatedFrame.currentDecisionMode,
        currentFocus: updatedFrame.currentFocus,
        stage: updatedFrame.stage
      };
      const sessionWithChoice: CurrentSession = {
        ...currentSession,
        conversationRoute: "decision_frame",
        activeDecisionFrameId: updatedFrame.id,
        messages: [...currentSession.messages, makeUserMessage(trimmed)]
      };
      const claraResult = await generateClaraFromConversation(sessionWithChoice, profile, sessions, {
        userIntent: "explicit_continue",
        decisionFrame: updatedFrame,
        decisionFrameUpdate: controlUpdate
      });
      setDecisionFrames((current) => current.map((frame) => (frame.id === updatedFrame.id ? updatedFrame : frame)));
      setCurrentSession(
        finalizeGeneratedSession(
          {
            ...sessionWithChoice,
            messages: [
              ...sessionWithChoice.messages,
              makeClaraMessage({
                text: claraResult.text,
                expectedInput: "text"
              })
            ]
          },
          updatedFrame
        )
      );
      setAnswer("");
      return;
    }

    const detectedUserIntent = detectUserIntent(trimmed, currentSession);
    const currentlyInDecisionLoop =
      isDecisionRoute(currentSession.conversationRoute) || activeDecisionFrameForSession(decisionFrames, currentSession) !== null;
    const currentlyInQuestLoop = currentSession.conversationRoute === "quest_goal" || activeQuestForSession(quests, currentSession) !== null;
    const artifactCloseText = currentlyInQuestLoop
      ? "Saved. You can find this under Map."
      : currentlyInDecisionLoop
        ? "Saved. You can come back to this from Frames."
        : null;
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
      await closeSession(trimmed, artifactCloseText ?? "Of course. I'll save this for now.");
      return;
    }

    if (detectedUserIntent === "save") {
      await closeSession(trimmed, artifactCloseText ?? "Saved. That's a good place to leave it for today.");
      return;
    }

    if (detectedUserIntent === "ambiguous_response") {
      setCurrentSession({
        ...currentSession,
        messages: [
          ...currentSession.messages,
          makeUserMessage(trimmed),
          makeClaraMessage({
            text: currentlyInDecisionLoop
              ? "Which one feels right: keep working it, pause here, or find a next honest step?"
              : "I need one clearer choice. Which part should we look at first?",
            expectedInput: currentlyInDecisionLoop ? "choice" : "text",
            choices: currentlyInDecisionLoop ? decisionPauseChoices : undefined
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
      await closeSession(trimmed, artifactCloseText ?? "Saved. That's a good place to leave it for today.");
      return;
    }

    const userMessage = makeUserMessage(trimmed);
    const sessionWithReply: CurrentSession = {
      ...withDepthState(currentSession, trimmed),
      messages: [...currentSession.messages, userMessage]
    };
    const existingDecisionFrame = activeDecisionFrameForSession(decisionFrames, currentSession);
    const existingResponsibilityPlan = activeResponsibilityPlanForSession(responsibilityPlans, currentSession);
    const existingQuest = activeQuestForSession(quests, currentSession);
    const routeClassification = await classifyRoute(trimmed, sessionWithReply, profile, sessions, existingDecisionFrame);
    const routedAs = routeClassification.route;
    console.log("Clara route classification", routeClassification);

    if (routedAs === "unclear") {
      setCurrentSession({
        ...sessionWithReply,
        conversationRoute: "unclear",
        awaitingRouteChoice: true,
        messages: [
          ...sessionWithReply.messages,
          makeClaraMessage({
            text: routeChoiceText("unclear"),
            expectedInput: "choice",
            choices: ["Reflect", "Think it through", "Find next step"]
          })
        ]
      });
      setAnswer("");
      return;
    }

    const newDecisionFrame =
      routedAs === "decision_frame" && !existingDecisionFrame ? decisionFrameFromText(trimmed, sessionWithReply) : null;
    let decisionFrame = newDecisionFrame ?? existingDecisionFrame;
    let decisionFrameUpdate: DecisionFrameUpdate | null = null;
    let responsibilityPlan: ResponsibilityPlan | null = null;
    let quest: Quest | null = existingQuest;
    let routedSession: CurrentSession = {
      ...sessionWithReply,
      conversationRoute: routedAs,
      activeDecisionFrameId: decisionFrame?.id ?? sessionWithReply.activeDecisionFrameId,
      activeResponsibilityPlanId: sessionWithReply.activeResponsibilityPlanId,
      activeQuestId: quest?.id ?? sessionWithReply.activeQuestId,
      awaitingRouteChoice: false
    };

    if (newDecisionFrame) {
      console.log("Decision Frame detected", newDecisionFrame);
      setDecisionFrames((current) =>
        current.some((frame) => sameDecisionFrame(frame, newDecisionFrame)) ? current : [newDecisionFrame, ...current]
      );
    } else if (existingDecisionFrame && shouldUpdateDecisionFrameFromIntent(detectedUserIntent)) {
      const update = inferDecisionFrameUpdate(trimmed, existingDecisionFrame);
      const updatedDecisionFrame = hasDecisionFrameUpdate(update)
        ? applyDecisionFrameUpdate(existingDecisionFrame, update)
        : updateDecisionFrameSourceSummary(existingDecisionFrame, sessionWithReply, trimmed);
      decisionFrame = updatedDecisionFrame;
      decisionFrameUpdate = hasDecisionFrameUpdate(update) ? update : null;

      console.log("Decision Frame updated", { frame: updatedDecisionFrame, update });
      setDecisionFrames((current) =>
        current.map((frame) => (frame.id === updatedDecisionFrame.id ? updatedDecisionFrame : frame))
      );
      routedSession = {
        ...routedSession,
        activeDecisionFrameId: updatedDecisionFrame.id
      };
    }

    if (routedAs === "responsibility_safety") {
      const inferredPlan = responsibilityPlanFromText(trimmed, sessionWithReply);
      const updatedPlan = existingResponsibilityPlan ? mergeResponsibilityPlan(existingResponsibilityPlan, inferredPlan) : inferredPlan;
      responsibilityPlan = updatedPlan;
      console.log("Responsibility Plan updated", updatedPlan);
      setResponsibilityPlans((current) =>
        current.some((plan) => plan.id === updatedPlan.id)
          ? current.map((plan) => (plan.id === updatedPlan.id ? updatedPlan : plan))
          : [updatedPlan, ...current]
      );
      routedSession = {
        ...routedSession,
        activeResponsibilityPlanId: updatedPlan.id
      };
    }

    if (routedAs === "quest_goal" && !quest) {
      const seed = questSeedForSession(routedSession, trimmed);
      const seededSession: CurrentSession = {
        ...routedSession,
        questSeed: seed
      };

      if (isQuestPracticeIdeaRequest(trimmed)) {
        const enrichedSeed = enrichQuestSeedWithPracticeOptions(seed);
        setCurrentSession({
          ...seededSession,
          questSeed: enrichedSeed,
          messages: [
            ...seededSession.messages,
            makeClaraMessage({
              text: questIdeasText(enrichedSeed),
              expectedInput: "choice",
              choices: [...questPracticeChoiceLabels(enrichedSeed), "Make it a quest", "Keep talking", "Not now"]
            })
          ]
        });
        setAnswer("");
        return;
      }

      setCurrentSession({
        ...seededSession,
        messages: [
          ...seededSession.messages,
          makeClaraMessage({
            text: "That sounds like something worth practicing, not just thinking about. Want to turn it into a small quest for the week?",
            expectedInput: "choice",
            choices: ["Make it a quest", "Keep talking", "Not now"]
          })
        ]
      });
      setAnswer("");
      return;
    }

    if (shouldCloseForDepth(routedSession, trimmed)) {
      await closeSession(trimmed, "That's a good place to leave it for today.");
      return;
    }

    if (currentSession.awaitingThreadRedirect) {
      const redirectedSession: CurrentSession = {
        ...routedSession,
        activeThread: trimmed,
        threadSource: "user",
        threadConfidence: 1,
        awaitingThreadRedirect: false,
        threadCorrectionOffered: true
      };
      const claraResult = await generateClaraFromConversation(redirectedSession, profile, sessions, {
        userIntent: detectedUserIntent,
        decisionFrame,
        decisionFrameUpdate,
        responsibilityPlan,
        quest,
        routeClassification
      });
      setCurrentSession(
        finalizeGeneratedSession(
          {
            ...redirectedSession,
            messages: [
              ...redirectedSession.messages,
              makeClaraMessage({
                text: claraResult.text,
                expectedInput: "text"
              })
            ]
          },
          decisionFrame
        )
      );
      setAnswer("");
      return;
    }

    if (isThreadCorrectionChoice && (normalizeChoice(trimmed) === "yes, that" || normalizeChoice(trimmed) === "yes that")) {
      const claraResult = await generateClaraFromConversation(routedSession, profile, sessions, {
        userIntent: detectedUserIntent,
        decisionFrame,
        decisionFrameUpdate,
        responsibilityPlan,
        quest,
        routeClassification
      });
      setCurrentSession(
        finalizeGeneratedSession(
          {
            ...routedSession,
            awaitingThreadRedirect: false,
            messages: [
              ...routedSession.messages,
              makeClaraMessage({
                text: claraResult.text,
                expectedInput: "text"
              })
            ]
          },
          decisionFrame
        )
      );
      setAnswer("");
      return;
    }

    const claraResult = await generateClaraFromConversation(routedSession, profile, sessions, {
      userIntent: detectedUserIntent,
      decisionFrame,
      decisionFrameUpdate,
      responsibilityPlan,
      quest,
      routeClassification
    });
    setCurrentSession(
      finalizeGeneratedSession(
        {
          ...routedSession,
          messages: [
            ...routedSession.messages,
            makeClaraMessage({
              text: claraResult.text,
              expectedInput: "text"
            })
          ]
        },
        decisionFrame
      )
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

    const activeFrame = activeDecisionFrameForSession(decisionFrames, currentSession);
    const activeResponsibilityPlan = activeResponsibilityPlanForSession(responsibilityPlans, currentSession);
    const activeQuest = activeQuestForSession(quests, currentSession);
    const isDecisionSession = isDecisionRoute(currentSession.conversationRoute) || activeFrame !== null;
    const isResponsibilitySession = currentSession.conversationRoute === "responsibility_safety" || activeResponsibilityPlan !== null;
    const isQuestSession = currentSession.conversationRoute === "quest_goal" || activeQuest !== null;
    const finalClaraText =
      claraText ??
      (isQuestSession
        ? "Saved. You can find this under Map."
        : isDecisionSession || isResponsibilitySession
          ? "Saved. You can come back to this from Frames."
          : "That's a good place to leave it for today.");
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

    if (isDecisionSession) {
      if (activeFrame) {
        const pausedFrame: DecisionFrame = {
          ...activeFrame,
          stage: activeFrame.stage === "closed" ? "closed" : "paused"
        };
        const updatedFrame = updateDecisionFrameSourceSummary(pausedFrame, closedSession, choiceText ?? "");
        setDecisionFrames((current) => current.map((frame) => (frame.id === updatedFrame.id ? updatedFrame : frame)));
      }
      return;
    }

    if (isResponsibilitySession) {
      if (activeResponsibilityPlan) {
        setResponsibilityPlans((current) =>
          current.map((plan) =>
            plan.id === activeResponsibilityPlan.id
              ? {
                  ...plan,
                  status: plan.status === "resolved" ? "resolved" : "monitoring",
                  updatedAt: now
                }
              : plan
          )
        );
      }
      return;
    }

    if (isQuestSession) {
      if (activeQuest) {
        setQuests((current) =>
          current.map((quest) =>
            quest.id === activeQuest.id
              ? {
                  ...quest,
                  updatedAt: now
                }
              : quest
          )
        );
      }
      return;
    }

    if (currentSession.conversationRoute !== "meaning_moment") {
      return;
    }

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
      current.map((frame) => {
        if (frame.id !== id) return frame;

        const status: DecisionFrameStatus = frame.status === "open" ? "closed" : "open";
        return {
          ...frame,
          status,
          stage: status === "closed" ? "closed" : frame.stage === "closed" ? "paused" : frame.stage,
          updatedAt: new Date().toISOString()
        };
      })
    );
  }

  function updateDecisionFrame(id: string, updates: Partial<DecisionFrame>) {
    setDecisionFrames((current) =>
      current.map((frame) => {
        if (frame.id !== id) return frame;

        const researchQuestions = updates.researchQuestions ?? frame.researchQuestions;
        const researchTasks =
          updates.researchTasks ??
          mergeResearchTasks(
            frame.researchTasks,
            makeResearchTasks(researchQuestions.filter((question) => !frame.researchTasks.some((task) => task.question === question)))
          );

        return { ...frame, ...updates, researchQuestions, researchTasks, updatedAt: new Date().toISOString() };
      })
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

  function startDecisionFrameSession(frame: DecisionFrame) {
    if (!profile) return;

    const resumedFrame = applyDecisionControlToFrame(frame, frame.stage === "next_step" ? "next_step" : "keep_working");
    const shape = resumedFrame.frameSummary ? `${resumedFrame.frameSummary} ` : "";
    const opener = `You were looking at ${resumedFrame.question}. ${shape}Want to look at what we still don't know, name the next honest step, or keep mapping?`;

    setDecisionFrames((current) => current.map((item) => (item.id === resumedFrame.id ? resumedFrame : item)));
    setClosingMessage("");
    setAnswer("");
    setSelectedDecisionFrameId(null);
    const session = createSession(depthToEngine(profile.depth), {
      opener,
      touchpointType: "daily_check_in"
    });
    setCurrentSession({
      ...session,
      messages: [
        makeClaraMessage({
          text: opener,
          expectedInput: "choice",
          choices: decisionResumeChoices
        })
      ],
      conversationRoute: "decision_frame",
      activeDecisionFrameId: resumedFrame.id,
      awaitingRouteChoice: false
    });
    setTab("Today");
  }

  function selectDecisionMode(choice: string) {
    if (!currentSession) return;

    const activeFrame = activeDecisionFrameForSession(decisionFrames, currentSession);
    const controlChoice = activeFrame ? decisionControlChoice(choice) : null;
    if (!activeFrame || !controlChoice || controlChoice === "pause" || controlChoice === "keep_working") return;

    const updatedFrame = applyDecisionControlToFrame(activeFrame, controlChoice);
    setDecisionFrames((current) => current.map((frame) => (frame.id === updatedFrame.id ? updatedFrame : frame)));
    setCurrentSession({
      ...currentSession,
      conversationRoute: "decision_frame",
      activeDecisionFrameId: updatedFrame.id
    });
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
  const activeResponsibilityPlan = activeResponsibilityPlanForSession(responsibilityPlans, currentSession);
  const activeQuest = activeQuestForSession(quests, currentSession);
  const selectedDecisionFrame =
    selectedDecisionFrameId ? decisionFrames.find((frame) => frame.id === selectedDecisionFrameId) ?? null : null;

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
              {!activeDecisionFrame && activeResponsibilityPlan ? <ResponsibilityPlanSoFarCard plan={activeResponsibilityPlan} /> : null}
              {!activeDecisionFrame && !activeResponsibilityPlan && activeQuest ? <QuestSoFarCard quest={activeQuest} /> : null}

              <section className="space-y-4">
                {currentSession.messages.map((message, index) => (
                  <ConversationBubble message={message} key={`${message.timestamp}-${index}`} />
                ))}
              </section>

              {activeDecisionFrame && latestExpectedInput !== "none" ? (
                <div className="sticky bottom-24 z-10 -mx-1 rounded-md border border-pearl/10 bg-ink/95 p-3 shadow-2xl shadow-ink/50 backdrop-blur">
                  <DecisionModeChips
                    currentMode={activeDecisionFrame.currentDecisionMode}
                    currentFocus={activeDecisionFrame.currentFocus}
                    onSelect={selectDecisionMode}
                  />
                </div>
              ) : null}

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
          <section className="space-y-5 border-t border-pearl/10 pt-6">
            <div className="space-y-1">
              <p className="text-sm uppercase tracking-[0.2em] text-clay">Quests</p>
              <p className="text-base leading-6 text-fog">
                Small practices that turn what matters into something you can try.
              </p>
            </div>
            {quests.length === 0 ? (
              <EmptyState text="Quests will appear here when Clara helps turn an aspiration into a small practice." />
            ) : (
              quests.map((quest) => <QuestCard quest={quest} key={quest.id} />)
            )}
          </section>
        </section>
      )}

      {tab === "Frames" && (
        <section className="space-y-5">
          {selectedDecisionFrame ? (
            <DecisionFrameDetail
              frame={selectedDecisionFrame}
              onBack={() => setSelectedDecisionFrameId(null)}
              onContinue={startDecisionFrameSession}
              onToggleStatus={toggleDecisionFrameStatus}
            />
          ) : (
            <>
              <ViewTitle eyebrow="Frames" title="Messy questions, made visible." />
              <p className="text-lg leading-7 text-fog">
                Frames help you see the shape of a messy question before choosing what to do.
              </p>
              <p className="text-base leading-6 text-clay">
                Clara won't decide for you. She helps organize what matters, what's uncertain, and what the next honest
                step might be.
              </p>
              {decisionFrames.length === 0 && responsibilityPlans.length === 0 ? (
                <EmptyState text="Frames and responsibility plans will appear here when a check-in turns into something to organize." />
              ) : null}
              {decisionFrames.length > 0 ? (
                <section className="space-y-4">
                  <p className="text-sm uppercase tracking-[0.18em] text-clay">Decision Frames</p>
                  {decisionFrames.map((frame) => (
                    <DecisionFrameCard
                      frame={frame}
                      key={frame.id}
                      onOpen={(id) => setSelectedDecisionFrameId(id)}
                      onToggleStatus={toggleDecisionFrameStatus}
                      onUpdate={updateDecisionFrame}
                    />
                  ))}
                </section>
              ) : null}
              {responsibilityPlans.length > 0 ? (
                <section className="space-y-4 border-t border-pearl/10 pt-5">
                  <div className="space-y-2">
                    <p className="text-sm uppercase tracking-[0.18em] text-clay">Responsibility Plans</p>
                    <p className="text-base leading-6 text-fog">
                      For safety, duty-of-care, or misconduct concerns where the next step needs a careful process.
                    </p>
                  </div>
                  {responsibilityPlans.map((plan) => (
                    <ResponsibilityPlanCard plan={plan} key={plan.id} />
                  ))}
                </section>
              ) : null}
            </>
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

function QuestCard({ quest }: { quest: Quest }) {
  return (
    <article className="space-y-4 border-t border-pearl/10 pt-5">
      <div className="flex items-center justify-between gap-4 text-sm text-fog">
        <span>{formatDate(quest.createdAt)}</span>
        <span>{quest.status}</span>
      </div>
      <p className="text-sm uppercase tracking-[0.18em] text-clay">Quest</p>
      <p className="text-2xl leading-9 text-pearl">{quest.title}</p>
      <QuestText label="Direction" value={quest.direction} />
      <QuestText label="Why it matters" value={quest.whyItMatters} />
      <QuestText label="Practice" value={quest.practice} />
      <QuestText label="When to try it" value={formatQuestCadence(quest.cadence)} />
      <QuestText label="Check-in question" value={quest.checkInPrompt} />
      <QuestList label="What might get in the way" values={quest.obstacles} />
      <QuestList label="Evidence it's working" values={quest.evidence} />
      <QuestText label="Next step" value={quest.nextStep || "Not clear yet."} />
      <QuestText label="Status" value={quest.status} />
    </article>
  );
}

function QuestText({ label, value }: { label: string; value: string }) {
  return (
    <div className="space-y-1">
      <p className="text-sm text-clay">{label}</p>
      <p className="text-lg leading-7 text-fog">{value}</p>
    </div>
  );
}

function QuestList({ label, values }: { label: string; values: string[] }) {
  return (
    <div className="space-y-2">
      <p className="text-sm text-clay">{label}</p>
      {values.length === 0 ? (
        <p className="text-lg leading-7 text-fog">Not clear yet.</p>
      ) : (
        <TagList values={values} />
      )}
    </div>
  );
}

function FrameSoFarCard({ frame }: { frame: DecisionFrame }) {
  return (
    <details className="rounded-md border border-pearl/10 bg-pearl/7 p-4" open>
      <summary className="cursor-pointer text-sm uppercase tracking-[0.18em] text-clay">Frame so far</summary>
      <div className="mt-4 space-y-3">
        <p className="text-sm leading-6 text-fog">
          Frames help you see the shape of a messy question before choosing what to do.
        </p>
        <p className="text-lg leading-7 text-pearl">{frame.question}</p>
        <div className="space-y-1">
          <p className="text-sm text-clay">Shape of the question</p>
          <p className="text-base leading-6 text-fog">{frame.frameSummary || "Not clear yet."}</p>
        </div>
        <div className="space-y-1">
          <p className="text-sm text-clay">Current focus</p>
          <p className="text-base leading-6 text-fog">{frame.currentFocus || "Not clear yet."}</p>
        </div>
        <div className="space-y-1">
          <p className="text-sm text-clay">Thinking mode</p>
          <p className="text-base leading-6 text-fog">{formatDecisionMode(frame.currentDecisionMode)}</p>
        </div>
        <CompactFrameSection label="What's involved" values={frame.threads} />
        <CompactFrameSection label="Tensions" values={frame.tradeoffs} />
        <CompactFrameSection label="What we still don't know" values={frame.unknowns} />
        <div className="space-y-1">
          <p className="text-sm text-clay">Next honest step</p>
          <p className="text-base leading-6 text-fog">{frame.nextStep || "Not clear yet."}</p>
        </div>
      </div>
    </details>
  );
}

function ResponsibilityPlanSoFarCard({ plan }: { plan: ResponsibilityPlan }) {
  return (
    <details className="rounded-md border border-pearl/10 bg-pearl/7 p-4" open>
      <summary className="cursor-pointer text-sm uppercase tracking-[0.18em] text-clay">Plan so far</summary>
      <div className="mt-4 space-y-3">
        <p className="text-sm leading-6 text-fog">
          Clara is helping keep the next steps concrete: document, check policy, loop in the right people, and avoid
          handling serious safety concerns alone.
        </p>
        <div className="space-y-1">
          <p className="text-sm text-clay">Issue</p>
          <p className="text-base leading-6 text-pearl">{plan.issue || "Not clear yet."}</p>
        </div>
        <div className="space-y-1">
          <p className="text-sm text-clay">Immediate concern</p>
          <p className="text-base leading-6 text-fog">{plan.immediateConcern || "Not clear yet."}</p>
        </div>
        <CompactFrameSection label="Next steps" values={plan.nextSteps} />
        <CompactFrameSection label="People to contact" values={plan.peopleToContact} />
        <CompactFrameSection label="Policy to check" values={plan.policiesToCheck} />
      </div>
    </details>
  );
}

function QuestSoFarCard({ quest }: { quest: Quest }) {
  return (
    <details className="rounded-md border border-pearl/10 bg-pearl/7 p-4" open>
      <summary className="cursor-pointer text-sm uppercase tracking-[0.18em] text-clay">Quest so far</summary>
      <div className="mt-4 space-y-3">
        <p className="text-sm leading-6 text-fog">
          Quests are small meaning-aligned practices. No streaks, no pressure, just a way to try what matters.
        </p>
        <div className="space-y-1">
          <p className="text-sm text-clay">Quest</p>
          <p className="text-base leading-6 text-pearl">{quest.title}</p>
        </div>
        <div className="space-y-1">
          <p className="text-sm text-clay">Practice</p>
          <p className="text-base leading-6 text-fog">{quest.practice}</p>
        </div>
        <div className="space-y-1">
          <p className="text-sm text-clay">When to try it</p>
          <p className="text-base leading-6 text-fog">{formatQuestCadence(quest.cadence)}</p>
        </div>
        {quest.nextStep ? (
          <div className="space-y-1">
            <p className="text-sm text-clay">Next step</p>
            <p className="text-base leading-6 text-fog">{quest.nextStep}</p>
          </div>
        ) : null}
      </div>
    </details>
  );
}

function DecisionModeChips({
  currentMode,
  currentFocus,
  onSelect
}: {
  currentMode: DecisionMode;
  currentFocus: string | null;
  onSelect: (choice: string) => void;
}) {
  return (
    <section className="space-y-2">
      <p className="text-sm text-clay">Thinking mode</p>
      <div className="flex flex-wrap gap-2">
        {decisionModeChoices.map((choice) => {
          const active = isActiveDecisionModeChoice(choice, currentMode, currentFocus);

          return (
            <button
              className={`rounded-md border px-3 py-2 text-sm transition ${
                active
                  ? "border-clay bg-clay/20 text-pearl"
                  : "border-pearl/12 bg-pearl/7 text-fog hover:bg-pearl/10"
              }`}
              key={choice}
              onClick={() => onSelect(choice)}
              type="button"
            >
              {choice}
            </button>
          );
        })}
      </div>
    </section>
  );
}

function isActiveDecisionModeChoice(choice: string, currentMode: DecisionMode, currentFocus: string | null) {
  const controlChoice = decisionControlChoice(choice);
  const mode = decisionModeForControlChoice(controlChoice ?? "keep_working", currentMode);

  if (choice === "Find unknowns") return currentMode === "research" && currentFocus === "what we still don't know";
  if (choice === "Research") return currentMode === "research" && currentFocus !== "what we still don't know";
  return mode === currentMode;
}

function CompactFrameSection({ label, values }: { label: string; values: string[] }) {
  const [expanded, setExpanded] = useState(false);

  const visibleValues = expanded ? values : values.slice(0, 3);
  const hiddenCount = values.length - visibleValues.length;

  return (
    <div className="space-y-2">
      <p className="text-sm text-clay">{label}</p>
      {visibleValues.length === 0 ? <p className="text-base leading-6 text-fog">Not clear yet.</p> : <TagList values={visibleValues} />}
      {hiddenCount > 0 ? (
        <button
          className="text-sm text-fog underline decoration-pearl/30 underline-offset-4"
          onClick={() => setExpanded((current) => !current)}
          type="button"
        >
          {expanded ? "Show less" : `Show ${hiddenCount} more`}
        </button>
      ) : null}
    </div>
  );
}

function DecisionFrameDetail({
  frame,
  onBack,
  onContinue,
  onToggleStatus
}: {
  frame: DecisionFrame;
  onBack: () => void;
  onContinue: (frame: DecisionFrame) => void;
  onToggleStatus: (id: string) => void;
}) {
  return (
    <section className="space-y-5">
      <div className="flex flex-wrap gap-2">
        <button
          className="rounded-md border border-pearl/12 bg-pearl/7 px-4 py-3 text-sm text-fog transition hover:bg-pearl/10"
          onClick={onBack}
          type="button"
        >
          Back to Frames
        </button>
        <button
          className="rounded-md bg-clay px-4 py-3 text-sm font-medium text-ink transition hover:bg-[#cc9978]"
          onClick={() => onContinue(frame)}
          type="button"
        >
          Continue with Clara
        </button>
      </div>

      <div className="space-y-3">
        <p className="text-sm text-clay">{formatDecisionType(frame.decisionType)} Frame</p>
        <h2 className="text-3xl leading-tight text-pearl">{frame.question}</h2>
        <p className="text-base leading-6 text-fog">
          Clara won't decide for you. She helps organize what matters, what's uncertain, and what the next honest step
          might be.
        </p>
      </div>

      <section className="space-y-2 rounded-md border border-pearl/10 bg-pearl/7 p-4">
        <div className="flex items-center justify-between gap-4 text-sm text-fog">
          <span>Status</span>
          <span>{frame.status}</span>
        </div>
        <div className="flex items-center justify-between gap-4 text-sm text-fog">
          <span>Stage</span>
          <span>{formatFrameStage(frame.stage)}</span>
        </div>
        <div className="flex items-center justify-between gap-4 text-sm text-fog">
          <span>Thinking mode</span>
          <span>{formatDecisionMode(frame.currentDecisionMode)}</span>
        </div>
        <div className="flex items-center justify-between gap-4 text-sm text-fog">
          <span>Created</span>
          <span>{formatDate(frame.createdAt)}</span>
        </div>
        <div className="flex items-center justify-between gap-4 text-sm text-fog">
          <span>Updated</span>
          <span>{formatDate(frame.updatedAt)}</span>
        </div>
        <button
          className="mt-2 w-full rounded-md border border-pearl/12 bg-ink/30 px-4 py-3 text-sm text-fog transition hover:bg-pearl/10"
          onClick={() => onToggleStatus(frame.id)}
          type="button"
        >
          Mark {frame.status === "open" ? "closed" : "open"}
        </button>
      </section>

      <section className="space-y-1 border-t border-pearl/10 pt-5">
        <p className="text-sm text-clay">Shape of the question</p>
        <p className="text-lg leading-7 text-fog">{frame.frameSummary || "Not clear yet."}</p>
      </section>

      <section className="space-y-1 border-t border-pearl/10 pt-5">
        <p className="text-sm text-clay">What this needs next</p>
        <p className="text-lg leading-7 text-fog">{frameNeedsNext(frame)}</p>
      </section>

      {frame.currentFocus ? (
        <section className="space-y-1 border-t border-pearl/10 pt-5">
          <p className="text-sm text-clay">Current focus</p>
          <p className="text-lg leading-7 text-fog">{frame.currentFocus}</p>
        </section>
      ) : null}

      <FrameDetailSection label="What matters" values={frame.criteria} />
      <FrameDetailSection label="What we know" values={frame.knowns} />
      <FrameDetailSection label="What we still don't know" values={frame.unknowns} />
      <FrameDetailSection label="Possible paths" values={frame.possiblePaths} />
      <FrameDetailSection label="Tensions" values={frame.tradeoffs} />
      <FrameDetailSection label="Research questions" values={frame.researchQuestions} emptyText="Not started yet." />
      <ResearchTaskSection tasks={frame.researchTasks} />
      <FrameDetailSection label="Option notes" values={frame.optionNotes} />
      <FrameDetailSection label="Comparison notes" values={frame.comparisonNotes} />

      <section className="space-y-1 border-t border-pearl/10 pt-5">
        <p className="text-sm text-clay">Next honest step</p>
        <p className="text-lg leading-7 text-fog">{frame.nextStep || "Not clear yet."}</p>
      </section>

      <section className="space-y-1 border-t border-pearl/10 pt-5">
        <p className="text-sm text-clay">Source conversation summary</p>
        <p className="text-lg leading-7 text-fog">{frame.sourceSummary || "Not clear yet."}</p>
      </section>
    </section>
  );
}

function FrameDetailSection({
  label,
  values,
  emptyText = "Not clear yet."
}: {
  label: string;
  values: string[];
  emptyText?: string;
}) {
  return (
    <details className="border-t border-pearl/10 pt-5" open>
      <summary className="cursor-pointer text-sm text-clay">{label}</summary>
      {values.length === 0 ? (
        <p className="mt-3 text-lg leading-7 text-fog">{emptyText}</p>
      ) : (
        <ul className="mt-3 space-y-2 text-lg leading-7 text-fog">
          {values.map((value) => (
            <li key={value}>{value}</li>
          ))}
        </ul>
      )}
    </details>
  );
}

function ResearchTaskSection({ tasks }: { tasks: ResearchTask[] }) {
  return (
    <details className="border-t border-pearl/10 pt-5" open>
      <summary className="cursor-pointer text-sm text-clay">Research tasks</summary>
      {tasks.length === 0 ? (
        <p className="mt-3 text-lg leading-7 text-fog">Not started yet.</p>
      ) : (
        <ul className="mt-3 space-y-2 text-lg leading-7 text-fog">
          {tasks.map((task) => (
            <li className="space-y-1" key={task.id}>
              <span>{task.question}</span>
              <span className="block text-sm text-clay">{task.status}</span>
              {task.notes ? <span className="block text-base leading-6 text-fog">{task.notes}</span> : null}
            </li>
          ))}
        </ul>
      )}
    </details>
  );
}

function DecisionFrameCard({
  frame,
  onOpen,
  onToggleStatus,
  onUpdate
}: {
  frame: DecisionFrame;
  onOpen: (id: string) => void;
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
  const [possiblePaths, setPossiblePaths] = useState(frame.possiblePaths.join(", "));
  const [optionNotes, setOptionNotes] = useState(frame.optionNotes.join(", "));
  const [comparisonNotes, setComparisonNotes] = useState(frame.comparisonNotes.join(", "));
  const [researchQuestions, setResearchQuestions] = useState(frame.researchQuestions.join(", "));
  const [frameSummary, setFrameSummary] = useState(frame.frameSummary);
  const [currentFocus, setCurrentFocus] = useState(frame.currentFocus ?? "");
  const [nextStep, setNextStep] = useState(frame.nextStep ?? "");

  function cancelEdit() {
    setQuestion(frame.question);
    setThreads(frame.threads.join(", "));
    setCriteria(frame.criteria.join(", "));
    setTradeoffs(frame.tradeoffs.join(", "));
    setKnowns(frame.knowns.join(", "));
    setUnknowns(frame.unknowns.join(", "));
    setPossiblePaths(frame.possiblePaths.join(", "));
    setOptionNotes(frame.optionNotes.join(", "));
    setComparisonNotes(frame.comparisonNotes.join(", "));
    setResearchQuestions(frame.researchQuestions.join(", "));
    setFrameSummary(frame.frameSummary);
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
      possiblePaths: commaList(possiblePaths),
      optionNotes: commaList(optionNotes),
      comparisonNotes: commaList(comparisonNotes),
      researchQuestions: commaList(researchQuestions),
      frameSummary: frameSummary.trim(),
      currentFocus: currentFocus.trim() || null,
      nextStep: nextStep.trim() || null
    });
    setEditing(false);
  }

  return (
    <article className="space-y-4 border-t border-pearl/10 pt-5">
      <div className="flex items-center justify-between gap-4 text-sm text-fog">
        <span>{formatDate(frame.createdAt)}</span>
        <span>
          {frame.status} / {formatFrameStage(frame.stage)}
        </span>
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
          <MiniField label="What's involved" value={threads} onChange={setThreads} />
          <MiniField label="What matters" value={criteria} onChange={setCriteria} />
          <MiniField label="Tensions" value={tradeoffs} onChange={setTradeoffs} />
          <MiniField label="What we know" value={knowns} onChange={setKnowns} />
          <MiniField label="What we still don't know" value={unknowns} onChange={setUnknowns} />
          <MiniField label="Possible paths" value={possiblePaths} onChange={setPossiblePaths} />
          <MiniField label="Research questions" value={researchQuestions} onChange={setResearchQuestions} />
          <MiniField label="Option notes" value={optionNotes} onChange={setOptionNotes} />
          <MiniField label="Comparison notes" value={comparisonNotes} onChange={setComparisonNotes} />
          <MiniField label="Shape of the question" value={frameSummary} onChange={setFrameSummary} />
          <MiniField label="Current focus" value={currentFocus} onChange={setCurrentFocus} />
          <MiniField label="Next honest step" value={nextStep} onChange={setNextStep} />
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
          {frame.frameSummary ? (
            <div className="space-y-1">
              <p className="text-sm text-clay">Shape of the question</p>
              <p className="text-lg leading-7 text-fog">{frame.frameSummary}</p>
            </div>
          ) : null}
          {frame.currentFocus ? (
            <div className="space-y-1">
              <p className="text-sm text-clay">Current focus</p>
              <p className="text-lg leading-7 text-fog">{frame.currentFocus}</p>
            </div>
          ) : null}
          <div className="space-y-1">
            <p className="text-sm text-clay">Thinking mode</p>
            <p className="text-lg leading-7 text-fog">{formatDecisionMode(frame.currentDecisionMode)}</p>
          </div>
          {frame.threads.length > 0 ? (
            <div className="space-y-2">
              <p className="text-sm text-clay">What's involved</p>
              <TagList values={frame.threads.slice(0, 3)} />
            </div>
          ) : null}
          {frame.tradeoffs.length > 0 ? (
            <div className="space-y-2">
              <p className="text-sm text-clay">Tensions</p>
              <TagList values={frame.tradeoffs.slice(0, 3)} />
            </div>
          ) : null}
          {frame.possiblePaths.length > 0 ? (
            <div className="space-y-2">
              <p className="text-sm text-clay">Possible paths</p>
              <TagList values={frame.possiblePaths.slice(0, 3)} />
            </div>
          ) : null}
          {frame.nextStep ? (
            <div className="space-y-1">
              <p className="text-sm text-clay">Next honest step</p>
              <p className="text-lg leading-7 text-fog">{frame.nextStep}</p>
            </div>
          ) : null}
          <div className="flex flex-wrap gap-2">
            <button
              className="rounded-md bg-clay px-4 py-3 text-sm font-medium text-ink transition hover:bg-[#cc9978]"
              onClick={() => onOpen(frame.id)}
              type="button"
            >
              Open frame
            </button>
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

function ResponsibilityPlanCard({ plan }: { plan: ResponsibilityPlan }) {
  return (
    <article className="space-y-4 border-t border-pearl/10 pt-5">
      <div className="flex items-center justify-between gap-4 text-sm text-fog">
        <span>{formatDate(plan.createdAt)}</span>
        <span>{plan.status}</span>
      </div>
      <p className="text-sm uppercase tracking-[0.18em] text-clay">Responsibility Plan</p>
      <div className="space-y-1">
        <p className="text-sm text-clay">Issue</p>
        <p className="text-xl leading-8 text-pearl">{plan.issue || "Not clear yet."}</p>
      </div>
      <ResponsibilityPlanText label="Your role" value={plan.role} />
      <ResponsibilityPlanText label="Immediate concern" value={plan.immediateConcern} />
      <ResponsibilityPlanList label="Next steps" values={plan.nextSteps} />
      <ResponsibilityPlanList label="People to contact" values={plan.peopleToContact} />
      <ResponsibilityPlanList label="Policy to check" values={plan.policiesToCheck} />
      <ResponsibilityPlanList label="Messages to draft" values={plan.communicationsToDraft} />
      <ResponsibilityPlanText label="Status" value={plan.status} />
    </article>
  );
}

function ResponsibilityPlanText({ label, value }: { label: string; value: string }) {
  return (
    <div className="space-y-1">
      <p className="text-sm text-clay">{label}</p>
      <p className="text-lg leading-7 text-fog">{value || "Not clear yet."}</p>
    </div>
  );
}

function ResponsibilityPlanList({ label, values }: { label: string; values: string[] }) {
  return (
    <div className="space-y-2">
      <p className="text-sm text-clay">{label}</p>
      {values.length === 0 ? (
        <p className="text-lg leading-7 text-fog">Not clear yet.</p>
      ) : (
        <ul className="space-y-2 text-lg leading-7 text-fog">
          {values.map((value) => (
            <li key={value}>{value}</li>
          ))}
        </ul>
      )}
    </div>
  );
}

function formatDecisionType(type: DecisionFrameType) {
  return capitalize(type);
}

function formatQuestCadence(cadence: QuestCadence) {
  if (cadence === "once") return "Once";
  if (cadence === "daily") return "Daily";
  if (cadence === "weekly") return "Weekly";
  return "Custom";
}

function formatFrameStage(stage: DecisionFrameStage) {
  return stage.replace("_", " ");
}

function formatDecisionMode(mode: DecisionMode) {
  if (mode === "map") return "Map options";
  if (mode === "research") return "Research";
  if (mode === "compare") return "Compare paths";
  if (mode === "act") return "Next step";
  return "Reflect";
}

function frameNeedsNext(frame: DecisionFrame) {
  if (frame.currentDecisionMode === "reflect") return "More reflection";
  if (frame.currentDecisionMode === "map") return "More options";
  if (frame.currentDecisionMode === "research") return "More facts";
  if (frame.currentDecisionMode === "compare") return "Comparison";
  if (frame.currentDecisionMode === "act") return "Next honest step";

  if (frame.researchQuestions.length > 0 || frame.unknowns.length > 0) {
    return "More facts";
  }

  if (frame.possiblePaths.length < 2) {
    return "More options";
  }

  if (frame.possiblePaths.length > 1 && frame.criteria.length > 0) {
    return "Comparison";
  }

  if (frame.nextStep) {
    return "Next honest step";
  }

  return "More reflection";
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
