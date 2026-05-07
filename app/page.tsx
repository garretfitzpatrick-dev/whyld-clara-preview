"use client";

import { FormEvent, useEffect, useMemo, useState } from "react";

type Depth = "Light" | "Thoughtful" | "Deep";
type EngineDepth = "light" | "thoughtful" | "deep";
type Tab = "Today" | "History" | "Recap" | "Settings";
type LengthBucket = "short" | "medium" | "long";
type Sentiment = "positive" | "neutral" | "negative";
type MessageRole = "clara" | "user";
type SessionStatus = "active" | "closed";
type ExpectedInput = "choice" | "text" | "none";
type ThreadSource = "clara" | "user";
type UserDepthSignal = "low" | "medium" | "high";
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
};

type CompletedSession = CurrentSession & {
  endedAt: string;
  tags: ThemeTag[];
  summary: string;
};

type LegacyEntry = {
  id: string;
  createdAt: string;
  question: string;
  response: string;
  tags: ThemeTag[];
  depth: Depth;
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
  legacyEntries: "whyld-world-clara-entries"
};

const APP_STORAGE_PREFIXES = ["whyld-world-", "whyld-", "clara-"];

const openers = [
  "How was your day?",
  "What stood out today?",
  "What actually mattered today?",
  "What gave you energy today?",
  "What took energy from you today?"
];

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
  depth: "Thoughtful"
};

function todayOpener() {
  const start = new Date(new Date().getFullYear(), 0, 0);
  const diff = Number(new Date()) - Number(start);
  const day = Math.floor(diff / 86400000);
  return openers[day % openers.length];
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

function createSession(depth: EngineDepth): CurrentSession {
  return {
    sessionId: crypto.randomUUID(),
    startedAt: new Date().toISOString(),
    messages: [
      makeClaraMessage({
        text: todayOpener(),
        expectedInput: "text"
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
    userDepthSignal: "low"
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
  if (selectedDepth === "deep" || classification.suggestedDepth === "deep") return "offer_depth_choice";
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
  return ["that's it", "thats it", "nothing else", "done", "i'm done", "im done", "all good"].includes(
    normalizeChoice(text)
  );
}

function shouldCloseForDepth(session: CurrentSession, latestReply: string) {
  if (isStoppingSignal(latestReply)) return true;
  return false;
}

function maybeApplyDepthCheck(session: CurrentSession) {
  if (session.userDepthSignal === "low" || session.turnCount < 3) return session;
  const lastUserText = [...session.messages].reverse().find((message) => message.role === "user")?.text ?? "";
  if (isCorrectionSignal(lastUserText) || normalizeChoice(lastUserText) === "keep going") return session;

  const shouldCheck =
    (session.userDepthSignal === "medium" && session.turnCount === 4) ||
    (session.userDepthSignal === "high" && session.turnCount > 0 && session.turnCount % 5 === 0);

  if (!shouldCheck) return session;

  const messages = [...session.messages];
  const lastMessage = messages[messages.length - 1];
  if (!lastMessage || lastMessage.role !== "clara" || lastMessage.expectedInput !== "text") return session;

  messages[messages.length - 1] = makeClaraMessage({
    text: "Do you want to stay with this a bit longer?",
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
    /\bi didn'?t say\b/.test(lower) ||
    /\bthat's not what i meant\b/.test(lower) ||
    /\bthats not what i meant\b/.test(lower) ||
    /\bnot exactly\b/.test(lower) ||
    /\bi mean\b/.test(lower) ||
    /^no[, ]/.test(lower) ||
    /\bno,? actually\b/.test(lower) ||
    /\bactually\b/.test(lower)
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
  if (sentiment === "negative" && lengthBucket === "long") return "light";
  if (hasPattern && repeatedThemes.includes("stress")) return "thoughtful";
  if (lengthBucket === "long" || hasPattern) return "deep";
  if (lengthBucket === "short") return "light";
  return "thoughtful";
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
  previousSessions: CompletedSession[]
): Promise<ClaraTextResult> {
  const transcript = sessionTranscript(session, 10);
  const opener = sessionOpener(session);
  const memory = profileMemory(profile, previousSessions);

  try {
    console.log("Calling Clara lab-style route", { opener, transcript, memory, depth: session.currentDepth });
    const response = await fetch("/api/clara-lab", {
      method: "POST",
      headers: {
        "Content-Type": "application/json"
      },
      body: JSON.stringify({
        opener,
        transcript,
        memory,
        depth: session.currentDepth
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

  if (normalizeChoice(latestUser) === "keep going") {
    return "Okay. What feels worth staying with from here?";
  }

  if (isCorrectionSignal(latestUser)) {
    return "Right - fair correction. What would be the better way to say it?";
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
  return ["save this", "save it", "yes", "mark that", "keep it close"].includes(normalizeChoice(text));
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

function isToday(value: string) {
  return new Date(value).toDateString() === new Date().toDateString();
}

function depthToEngine(depth: Depth): EngineDepth {
  return depth.toLowerCase() as EngineDepth;
}

function engineToDepth(depth: EngineDepth): Depth {
  if (depth === "light") return "Light";
  if (depth === "deep") return "Deep";
  return "Thoughtful";
}

function sessionText(session: CurrentSession) {
  return session.messages
    .filter((message) => message.role === "user")
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
    lines.push(`Preferred depth: ${profile.depth}`);
  }

  sessions
    .slice(0, 3)
    .filter((session) => session.summary)
    .forEach((session) => lines.push(`Recent check-in: ${session.summary}`));

  return lines.join("\n");
}

function sessionTags(session: CurrentSession): ThemeTag[] {
  return Array.from(new Set(inferTags(sessionText(session))));
}

function sessionOpenerFrame(session: CurrentSession) {
  const opener = session.messages.find((message) => message.role === "clara")?.text.toLowerCase() ?? "";

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
  const firstUserMessage = session.messages.find((message) => message.role === "user")?.text;
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
  return value === "light" || value === "thoughtful" || value === "deep";
}

function isSessionStatus(value: unknown): value is SessionStatus {
  return value === "active" || value === "closed";
}

function isExpectedInput(value: unknown): value is ExpectedInput {
  return value === "choice" || value === "text" || value === "none";
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

function normalizeSession(session: CurrentSession): CurrentSession {
  return {
    ...session,
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
  const profile = parseStoredJson<Profile>(window.localStorage.getItem(STORAGE_KEYS.profile));

  if (
    profile &&
    typeof profile.wantsMore === "string" &&
    typeof profile.drainsEnergy === "string" &&
    ["Light", "Thoughtful", "Deep"].includes(profile.depth)
  ) {
    return profile;
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
  const [answer, setAnswer] = useState("");
  const [tab, setTab] = useState<Tab>("Today");
  const [closingMessage, setClosingMessage] = useState("");

  useEffect(() => {
    const parsedProfile = readProfileFromStorage();
    const parsedSessions = readSessionsFromStorage();
    const parsedSession = readCurrentSessionFromStorage();

    if (parsedProfile) {
      setProfile(parsedProfile);
      setDraftProfile(parsedProfile);
    }

    setSessions(parsedSessions);

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
    if (!ready) return;

    if (currentSession?.status === "active") {
      window.localStorage.setItem(STORAGE_KEYS.currentSession, JSON.stringify(currentSession));
    }

    if (!currentSession) {
      window.localStorage.removeItem(STORAGE_KEYS.currentSession);
    }
  }, [currentSession, ready]);

  function saveProfile(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const nextProfile = { ...draftProfile };
    setProfile(nextProfile);
    window.localStorage.setItem(STORAGE_KEYS.profile, JSON.stringify(nextProfile));

    if (!currentSession) {
      setCurrentSession(createSession(depthToEngine(nextProfile.depth)));
    }
  }

  async function continueConversation(reply: string) {
    const trimmed = reply.trim();
    if (!trimmed || !currentSession) return;
    const latestClara = [...currentSession.messages].reverse().find((message) => message.role === "clara");
    const isThreadCorrectionChoice = latestClara?.choices?.includes("Something else") ?? false;

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
      const claraResult = await generateClaraFromConversation(redirectedSession, profile, sessions);
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
      const claraResult = await generateClaraFromConversation(sessionWithReply, profile, sessions);
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

    const claraResult = await generateClaraFromConversation(sessionWithReply, profile, sessions);
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
        depth: "thoughtful",
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
          currentDepth: "thoughtful",
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
        depth: "deep",
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
          currentDepth: "deep",
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
        depth: "light",
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
          currentDepth: "light",
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
  }

  function updateDepth(depth: Depth) {
    if (!profile) return;
    const nextProfile = { ...profile, depth };
    setProfile(nextProfile);
    setDraftProfile(nextProfile);
    window.localStorage.setItem(STORAGE_KEYS.profile, JSON.stringify(nextProfile));

    if (currentSession) {
      setCurrentSession({
        ...currentSession,
        currentDepth: depthToEngine(depth)
      });
    }
  }

  function startNewSession() {
    if (!profile) return;
    setClosingMessage("");
    setCurrentSession(createSession(depthToEngine(profile.depth)));
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

  const weeklyCounts = useMemo(() => sessionTagCounts(weeklySessions), [weeklySessions]);
  const topTags = useMemo(
    () =>
      (Object.entries(weeklyCounts) as [ThemeTag, number][])
        .sort((a, b) => b[1] - a[1])
        .slice(0, 3),
    [weeklyCounts]
  );
  const latestClaraMessage = [...(currentSession?.messages ?? [])].reverse().find((message) => message.role === "clara");
  const latestExpectedInput = latestClaraMessage?.expectedInput ?? "none";
  const latestChoices = latestExpectedInput === "choice" ? (latestClaraMessage?.choices ?? []) : [];

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
          <a className="rounded-md border border-pearl/15 px-3 py-2 text-sm text-fog" href="/lab">
            Lab
          </a>
          <button
            className="rounded-md border border-pearl/15 px-3 py-2 text-sm text-fog"
            onClick={() => setTab("Settings")}
          >
            {currentSession ? engineToDepth(currentSession.currentDepth) : profile.depth}
          </button>
        </div>
      </header>

      {tab === "Today" && (
        <section className="space-y-6">
          <div className="space-y-3">
            <p className="text-sm text-clay">Today</p>
            <h2 className="text-4xl leading-tight text-pearl">A check-in with Clara.</h2>
          </div>

          {currentSession ? (
            <>
              <section className="space-y-4">
                {currentSession.messages.map((message, index) => (
                  <ConversationBubble message={message} key={`${message.timestamp}-${index}`} />
                ))}
              </section>

              {latestExpectedInput === "choice" && latestChoices.length > 0 && (
                <div className="flex flex-wrap gap-2">
                  {latestChoices.map((choice) => (
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
          <ViewTitle eyebrow="This week" title="A small pattern map." />
          {weeklySessions.length === 0 || topTags.length === 0 ? (
            <EmptyState text="A recap appears after you complete at least one check-in this week." />
          ) : (
            <>
              <p className="text-2xl leading-9 text-pearl">
                {topTags.length > 1
                  ? `${capitalize(topTags[0][0])} and ${topTags[1][0]} have both shown up this week.`
                  : `${capitalize(topTags[0][0])} has shown up this week.`}
              </p>
              <div className="space-y-3">
                {topTags.map(([tag, count]) => (
                  <div className="flex items-center justify-between border-b border-pearl/10 py-3" key={tag}>
                    <span className="text-xl text-pearl">{capitalize(tag)}</span>
                    <span className="text-sm text-fog">{count} session{count === 1 ? "" : "s"}</span>
                  </div>
                ))}
              </div>
              <div className="space-y-3 border-t border-pearl/10 pt-6">
                <p className="text-sm text-clay">A question for later</p>
                <p className="text-2xl leading-9 text-pearl">{tagQuestions[topTags[0][0]]}</p>
              </div>
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
              onChange={(depth) => setDraftProfile((current) => ({ ...current, depth }))}
            />
            <button className="w-full rounded-md bg-pearl px-5 py-4 text-base font-medium text-ink transition hover:bg-white">
              Save settings
            </button>
          </form>
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
        <div className="mx-auto grid max-w-md grid-cols-5 gap-1">
          {(["Today", "History", "Recap", "Settings"] as Tab[]).map((item) => (
            <button
              className={`rounded-md px-2 py-3 text-sm transition ${
                tab === item ? "bg-pearl text-ink" : "text-fog hover:bg-pearl/8"
              }`}
              key={item}
              onClick={() => setTab(item)}
            >
              {item}
            </button>
          ))}
          <a className="rounded-md px-2 py-3 text-center text-sm text-fog transition hover:bg-pearl/8" href="/lab">
            Lab
          </a>
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

function DepthPicker({ value, onChange }: { value: Depth; onChange: (depth: Depth) => void }) {
  return (
    <div className="space-y-3">
      <p className="text-base text-fog">How deep should Clara usually go?</p>
      <div className="grid grid-cols-3 gap-2">
        {(["Light", "Thoughtful", "Deep"] as Depth[]).map((depth) => (
          <button
            className={`rounded-md border px-3 py-3 text-sm transition ${
              value === depth
                ? "border-clay bg-clay text-ink"
                : "border-pearl/12 bg-pearl/7 text-fog hover:bg-pearl/10"
            }`}
            key={depth}
            onClick={() => onChange(depth)}
            type="button"
          >
            {depth}
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

function TagRow({ tags }: { tags: ThemeTag[] }) {
  return (
    <div className="flex flex-wrap gap-2">
      {tags.map((tag) => (
        <span className="rounded-md bg-pearl/8 px-3 py-2 text-sm text-fog" key={tag}>
          {tag}
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
