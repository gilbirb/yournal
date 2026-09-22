import { GoogleGenAI } from '@google/genai';

const ai = new GoogleGenAI({});

const PLAN_SCHEMA = {
  type: 'object',
  properties: {
    terms: {
      type: 'array',
      items: { type: 'string' },
      description: 'Words likely to appear in the matching journal entries. Empty if the question is only about a time period.',
    },
    from: { type: 'string', description: 'Start of the date range, YYYY-MM-DD, inclusive. Omit if the question names no time.' },
    to: { type: 'string', description: 'End of the date range, YYYY-MM-DD, inclusive. Omit if the question names no time.' },
  },
  required: ['terms'],
};

const instruction = (today) => `You turn a question about someone's personal journal into a search plan. You never see the journal itself, only the question.

Today is ${today}.

terms: single words the person would likely have written in the entries that answer the question. Include the key words from the question and close synonyms or related words a person would actually write in a diary. For "when did I go to the beach": beach, ocean, swim, sand, surf. Use 2 to 8 lowercase single words. Never use phrases, and never use generic words such as day, time, thing, activity, event, journal, entry, feel.

If the question is only about when, with no topic (for example "what did I do last week"), return an empty terms array.

from and to: only if the question refers to a time. Convert it to an inclusive range relative to today, in YYYY-MM-DD. A single day has from equal to to. "Last week" is the previous Monday to Sunday. A month without a year is its most recent occurrence that is not after today. If the question names no time, omit both. "Last time" or "when did I" are not times. Never guess a date you cannot work out from the question, such as a birthday.`;


export const planSearch = async (question, today) => {
  const interaction = await ai.interactions.create({
    model: "gemini-3.5-flash-lite",
    input: question,
    system_instruction: instruction(today),
    response_format: [
      {
        type: "text",
        mime_type: "application/json",
        schema: PLAN_SCHEMA,
      },
    ],
  });

  
  return JSON.parse(interaction.output_text);
};
