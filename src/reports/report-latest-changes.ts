#! /usr/bin/env -S pnpm tsx

import { generateObject } from "ai";
import { ollama } from "ollama-ai-provider";
import { z } from "zod";
import * as fs from "fs/promises";

const LLM_MODEL = process.env.LLM_MODEL || "qwen2.5big";

const reportOutputSchema = z.object({
  period: z.string().describe("Period of all the changes"),
  overall: z.string().describe("Summary of overall changes by the team"),
  features: z
    .string()
    .describe(
      "Summary of all new features as a markdown list. be as exhaustive as possible"
    )
    .optional(),
  fixes: z
    .string()
    .describe(
      "Summary of all new fixes as a markdown lis. be as exhaustive as possible "
    )
    .optional(),
});

export async function formatChanges(input: string) {
  const prompt = `Based on the below changes, provide a structured answer using FRENCH ONLY.\n\n${input}`;
  const result = await generateObject({
    mode: "json",
    maxRetries: 20,

    model: ollama(LLM_MODEL),
    prompt,
    schema: reportOutputSchema,
  });
  return result.object;
}

const smallFrDate = (strDate: string) =>
  new Date(strDate).toISOString().slice(0, 10).split("-").reverse().join("/");

export async function reportLatestChanges(input: any, title) {
  //console.log("input", input);
  const changes = input
    .slice(0, 50)
    .map(
      (commit) =>
        ` - ${smallFrDate(commit.date)} : par ${commit.author} (${commit.tags.join(", ")}): [${commit.description}](${commit.url})`
    )
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
