export type ClaraEvalCase = {
  id: string;
  title: string;
  opener: string;
  memory?: string;
  transcript: string;
};

export const CLARA_EVAL_CASES: ClaraEvalCase[] = [
  {
    id: "coaching-energy",
    title: "Coaching baseball / kids / energy",
    opener: "What gave you energy today?",
    transcript: "Clara: What gave you energy today?\nUser: Coaching baseball and spending time with my kids."
  },
  {
    id: "work-annoying",
    title: "Work was annoying",
    opener: "How was your day?",
    transcript: "Clara: How was your day?\nUser: Work was annoying today."
  },
  {
    id: "vague-fine",
    title: "Vague fine",
    opener: "How was your day?",
    transcript: "Clara: How was your day?\nUser: Fine."
  },
  {
    id: "mixed-work-family",
    title: "Mixed work stress + family joy",
    opener: "What stood out today?",
    transcript:
      "Clara: What stood out today?\nUser: Work was chaotic, but dinner with the kids was really good. I was actually present."
  },
  {
    id: "correction-didnt-say",
    title: "User correction: I didn't say",
    opener: "What actually mattered today?",
    transcript:
      "Clara: What actually mattered today?\nUser: They are learning what a team is.\nClara: What does it feel like when the teamwork part isn't clicking yet?\nUser: I didn't say it wasn't clicking. They're just 5 and 6 years old."
  },
  {
    id: "go-deeper",
    title: "User wants to go deeper",
    opener: "What actually mattered today?",
    transcript:
      "Clara: What actually mattered today?\nUser: I think coaching matters more to me than I expected.\nClara: What part of it has surprised you?\nUser: Keep going."
  },
  {
    id: "wants-stop",
    title: "User wants to stop",
    opener: "What stood out today?",
    transcript:
      "Clara: What stood out today?\nUser: A hard conversation with my boss.\nClara: What made it hard?\nUser: Done for today."
  },
  {
    id: "values-work-family",
    title: "Values tension: work vs family",
    opener: "What actually mattered today?",
    transcript:
      "Clara: What actually mattered today?\nUser: I'm trying to balance work, family, and personal interests, and I can feel work taking too much."
  },
  {
    id: "positive-anchor",
    title: "Positive anchor",
    opener: "What gave you energy today?",
    transcript: "Clara: What gave you energy today?\nUser: A long laugh with an old friend. It reset something in me."
  },
  {
    id: "repeated-stress",
    title: "Repeated stress pattern",
    opener: "What took energy from you today?",
    memory: "Work stress has appeared in three recent check-ins.",
    transcript:
      "Clara: What took energy from you today?\nUser: Same thing as last week. Too many meetings and no room to think."
  },
  {
    id: "creative-avoidance",
    title: "Creative project avoidance",
    opener: "What actually mattered today?",
    transcript:
      "Clara: What actually mattered today?\nUser: I kept avoiding the writing project, even though I know I care about it."
  },
  {
    id: "service-leadership",
    title: "Service / leadership moment",
    opener: "What gave you energy today?",
    transcript:
      "Clara: What gave you energy today?\nUser: Just being around all the kids and seeing how much of an impact I can make by being a positive leader and role model."
  },
  {
    id: "presence-stillness",
    title: "Presence / stillness moment",
    opener: "What stood out today?",
    transcript:
      "Clara: What stood out today?\nUser: I sat outside for ten minutes after everyone went to bed. Nothing happened, which was kind of the point."
  },
  {
    id: "belonging-team",
    title: "Belonging / team moment",
    opener: "What actually mattered today?",
    transcript:
      "Clara: What actually mattered today?\nUser: At young ages, it's about learning what a team is. Learning how to work together."
  },
  {
    id: "overlong-emotional",
    title: "Overlong emotional input",
    opener: "How was your day?",
    transcript:
      "Clara: How was your day?\nUser: Honestly, it was a lot. I felt proud and guilty at the same time. I got through work, made dinner, helped with homework, answered more messages after the kids went down, and still felt like I didn't really give anyone my full attention. I don't know if I'm tired, stretched thin, or just expecting too much from myself."
  }
];
