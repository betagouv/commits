#! /usr/bin/env -S pnpm tsx
import * as path from "path";
import { glob } from "glob";
import pAll from "p-all";

import { createSqlLite } from "./create-sqlite";

export function findAnalysedCommits(rootDir: string): Promise<string[]> {
  const pattern = path.join(
    rootDir,
    "*",
    "*",
    "repo-output",
    "commits-analysed.json"
  );
  return glob(pattern);
}

const createSqliteFromCommits = async (rootDir: string) => {
  const commitFiles = await findAnalysedCommits(rootDir);
  await pAll(
    commitFiles.map((f) => () => createSqlLite(f, ".")),
    { concurrency: 1, stopOnError: false }
  ).catch((e) => console.error(e));
  console.log("done");
};

createSqliteFromCommits("./.repos");
