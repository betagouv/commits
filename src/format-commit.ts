#! /usr/bin/env -S pnpm tsx

import { generateObject } from "ai";
import { ollama } from "ollama-ai-provider";
import { z } from "zod";
import * as readline from "node:readline/promises";
import { stdin as input, stdout as output } from "node:process";

const tags = [
  "security",
  "accessibility",
  "frontend",
  "backend",
  "database",
  "devops",
  "maintenance",
  "bugfix",
  "feature",
  "map",
  "search",
  "ia",
  "data-science",
  "api",
  "documentation",
  "tests",
] as const;

const languages = [
  "JavaScript",
  "TypeScript",
  "Python",
  "Ruby",
  "Java",
  "PHP",
  "HTML",
  "Markdown",
  "Vue.js",
  "React",
  "Angular",
] as const;

const commitOutputSchema = z.object({
  description: z.string().describe("Overall description of the commit"),
  tags: z
    .array(z.union([z.string().min(1), z.enum(tags)]))
    .describe("Commit related tags"),
  languages: z
    .array(z.union([z.string().min(1), z.enum(languages)]))
    .describe("Commit related languages"),
});

export async function formatCommit(
  model: Parameters<typeof ollama>[0],
  commit: string
) {
  const result = await generateObject({
    mode: "json",
    maxRetries: 3,
    model: ollama(model),
    prompt: `Based on the following git diff, provide a structured answer using FRENCH ONLY. use only provided enums when possible \n\n\`\`\`\n${commit}\n\`\`\``,
    schema: commitOutputSchema,
  });
  return result.object;
}

// when script executes directly
if (import.meta.url === `file://${process.argv[1]}`) {
  const rl = readline.createInterface({ input, output });

  const readInput = async (): Promise<string> => {
    let input = "";
    for await (const line of rl) {
      input += line;
    }
    return input;
  };

  readInput()
    .then((input) => {
      return formatCommit("qwen2.5", input);
    })
    .then((r) => console.log(JSON.stringify(r, null, 2)));
}
