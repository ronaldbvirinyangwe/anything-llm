// server/utils/agents/tools/definitions.js

const TOOL_DEFINITIONS = [
  {
    type: "function",
    function: {
      name: "flashcard_create_agent",
      description: "Creates a set of flashcards on a given topic for a student.",
      parameters: {
        type: "object",
        properties: {
          topic: {
            type: "string",
            description: "The subject or topic the flashcards should cover.",
          },
          numCards: {
            type: "integer",
            description: "How many flashcards to generate.",
            default: 5,
          },
        },
        required: ["topic"],
      },
    },
  },
  {
    type: "function",
    function: {
      name: "quiz_create",
      description: "Creates a quiz with questions on a given topic.",
      parameters: {
        type: "object",
        properties: {
          topic: { type: "string" },
          numQuestions: { type: "integer", default: 5 },
        },
        required: ["topic"],
      },
    },
  },
];

module.exports = { TOOL_DEFINITIONS };