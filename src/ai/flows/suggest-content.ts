'use server';

/**
 * @fileOverview Suggests content based on user viewing behavior.
 *
 * - suggestContent - A function that suggests content based on viewing behavior.
 * - SuggestContentInput - The input type for the suggestContent function.
 * - SuggestContentOutput - The return type for the suggestContent function.
 */

import {ai} from '@/ai/genkit';
import {z} from 'genkit';

const SuggestContentInputSchema = z.object({
  viewingHistory: z
    .array(z.string())
    .describe('An array of content IDs representing the user viewing history.'),
  availableContent: z
    .array(z.string())
    .describe('An array of content IDs representing the available content.'),
  numberOfSuggestions: z
    .number()
    .default(3)
    .describe('The number of content suggestions to return.'),
});
export type SuggestContentInput = z.infer<typeof SuggestContentInputSchema>;

const SuggestContentOutputSchema = z.object({
  suggestions: z
    .array(z.string())
    .describe('An array of content IDs representing the content suggestions.'),
});
export type SuggestContentOutput = z.infer<typeof SuggestContentOutputSchema>;

export async function suggestContent(input: SuggestContentInput): Promise<SuggestContentOutput> {
  return suggestContentFlow(input);
}

const prompt = ai.definePrompt({
  name: 'suggestContentPrompt',
  input: {schema: SuggestContentInputSchema},
  output: {schema: SuggestContentOutputSchema},
  prompt: `You are a content recommendation expert for a digital signage platform.

Based on the user's viewing history, suggest content from the available content pool.

Viewing History: {{viewingHistory}}
Available Content: {{availableContent}}

Only suggest content IDs from the Available Content list.  Suggest {{numberOfSuggestions}} content IDs.

Return the suggestions as a JSON array of content IDs.

Ensure you do not include duplicates in the suggestions.`,
});

const suggestContentFlow = ai.defineFlow(
  {
    name: 'suggestContentFlow',
    inputSchema: SuggestContentInputSchema,
    outputSchema: SuggestContentOutputSchema,
  },
  async input => {
    const {output} = await prompt(input);
    return output!;
  }
);
