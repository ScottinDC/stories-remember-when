import type { MemoryNode } from "./types";

export const BIOGRAPHY = {
  profile: {
    gender: "Male",
    age: 79,
    race: "White",
    ancestry: "Norwegian",
    hometownRegion: "North Dakota",
    siblings: "Two older sisters",
    father: "Inventor",
    mother: "School teacher",
    career: "Worked most of his career at Kodak",
    home: "Centerville, Ohio",
    wife: "Christine",
    children: 5,
    grandchildren: 6,
    greatGrandchildren: 1
  },
  interests: [
    "Family",
    "Travel",
    "Photography and cameras",
    "Trains",
    "Reading",
    "History",
    "Politics",
    "Visiting with friends"
  ]
};

export const INITIAL_QUESTIONS = [
  "When you look back over your life, what are the moments that made you who you are?",
  "What are your earliest memories of growing up in North Dakota and your family?",
  "What do you remember most about your parents, and what did they teach you?",
  "How did your years at Kodak shape your life, both professionally and personally?",
  "If your children, grandchildren, and great-grandchild could only know a handful of lessons from your life, what would you want them to remember?"
];

export function buildOralHistorianPrompt(nodes: MemoryNode[], answeredNode: MemoryNode) {
  const answered = nodes
    .filter((node) => node.status === "answered" && node.transcript)
    .map((node, index) => ({
      turn: index + 1,
      questionId: node.id,
      parentQuestionId: node.parentQuestionId,
      question: node.question,
      transcript: node.transcript
    }));

  const pendingQuestions = nodes
    .filter((node) => node.status === "pending")
    .map((node) => ({ questionId: node.id, question: node.question }));

  return [
    {
      role: "system" as const,
      content:
        "You are an experienced oral historian interviewing a 79-year-old father for his family archive. Ask exactly one question. Prefer open-ended story prompts. Follow emotional, historically significant, or vivid details. Avoid repeating previous questions. Prioritize stories over facts. Be warm, plainspoken, and easy to answer. Keep the question under 35 words."
    },
    {
      role: "user" as const,
      content: JSON.stringify(
        {
          biography: BIOGRAPHY,
          mostRecentAnswer: {
            questionId: answeredNode.id,
            sequenceOrder: answeredNode.sequenceOrder,
            depth: answeredNode.depth,
            treePath: answeredNode.treePath,
            question: answeredNode.question,
            transcript: answeredNode.transcript
          },
          answeredConversation: answered,
          unansweredFoundationalQuestions: pendingQuestions,
          instruction:
            "Return the single best follow-up question only, guided by the most recent answer and where it sits in the question tree. Do not include labels, explanation, numbering, or quotation marks."
        },
        null,
        2
      )
    }
  ];
}

export function normalizeQuestion(text: string) {
  const trimmed = text.trim().replace(/^["']|["']$/g, "");
  return trimmed.endsWith("?") ? trimmed : `${trimmed}?`;
}
