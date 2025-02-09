#! /usr/bin/env -S pnpm tsx

import * as fs from "fs/promises";

import { reportTags } from "./report-tags";

export function findSqliteDbs(rootDir: string): Promise<string[]> {
  const pattern = path.join(rootDir, "*", "*", "repo-output", "commits.sqlite");
  return glob(pattern);
}

const createTagsReport = async (sqlitePath: string) => {
  const report = await reportTags(sqlitePath);
  const reportTagsPath = `./examples/tags.md`;
  await fs.writeFile(reportTagsPath, report);
  return reportTagsPath;
};

// when script executes directly
if (import.meta.url === `file://${process.argv[1]}`) {
  createTagsReport("./commits.sqlite").then(console.log);
}
