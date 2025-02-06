#! /usr/bin/env -S pnpm tsx

import { generateObject } from "ai";
import { ollama } from "ollama-ai-provider";
import { z } from "zod";
import * as fs from "fs/promises";

const reportOutputSchema = z.object({
  period: z.string().describe("Period of all the changes"),
  overall: z.string().describe("Summmary of all the changes"),
  features: z
    .string()
    .describe("Summary of new features as a markdown list ")
    .optional(),
  fixes: z
    .string()
    .describe("Summary of new fixes as a markdown list ")
    .optional(),
});

export async function formatChanges(input: string) {
  const prompt = `Based on the below changes, provide a structured answer using FRENCH ONLY.\n\n\`\`\`\n${input}\n\`\`\``;
  const result = await generateObject({
    mode: "json",
    maxRetries: 20,
    model: ollama("qwen2.5big"),
    prompt,
    schema: reportOutputSchema,
  });
  return result.object;
}

export async function reportLatestChanges(input: any, title) {
  //console.log("input", input);
  const changes = input
    .slice(0, 50)
    .map((commit) => {
      //console.log(commit);
      return ` - ${new Date(commit.date).toISOString().slice(0, 10)} : par ${commit.author} : [${commit.description}](${commit.url})
  tags: ${commit.tags.join(", ")}
  languages: ${commit.languages.join(", ")}
  `;
    })
    .join("\n");

  const obj = await formatChanges(changes);

  return `# ${title} 

${obj.period}: ${obj.overall}

## Features

${obj.features}

## Corrections

${obj.fixes}

## Derniers commits

${changes}

`;
}

// when script executes directly
if (import.meta.url === `file://${process.argv[1]}`) {
  fs.readFile(process.argv[process.argv.length - 1])
    .then((content) => {
      const commits = JSON.parse(content.toString());
      return reportLatestChanges(commits, "project-x");
    })
    .then((report) => {
      console.log(report);
    });
}
