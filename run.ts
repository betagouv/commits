#! /usr/bin/env -S pnpm tsx

import * as fs from "node:fs/promises";
import { extractRepoCommits } from "./dump-repo-commits";
import { analyseCommits } from "./analyse-commits";
import { reportLatestChanges } from "./report-latest-changes";
import { reportTags } from "./report-tags";
import { createSqlLite } from "./create-sqlite";
import { clone } from "./git-clone";

const CACHE_DIR = ".repos";

const runForRepo = async (url: string) => {
  const parts = url.split("/");
  const org = parts[parts.length - 2];
  const name = parts[parts.length - 1];
  const host = url.replace(/^(https:\/\/[^/]+)\/.*/, "$1");
  const repositoryName = `${org}/${name}`;
  const commitUrlPrefix = `${host}/${repositoryName}/commit`;

  console.log("host", host, commitUrlPrefix);
  const cacheDir = `${CACHE_DIR}/${repositoryName}`;
  const outputDir = `${CACHE_DIR}/${repositoryName}/repo-output`;

  // clone repo
  await clone(url, cacheDir);
  await fs.mkdir(outputDir).catch((e) => {});

  // extract structured commits
  const outputCommitsFile = `${outputDir}/commits.json`;
  await extractRepoCommits(cacheDir, outputCommitsFile, commitUrlPrefix);
  console.log(`Export terminé vers ${outputCommitsFile}`);

  // analyse commits
  const outputAnalysedCommitsFile = `${outputDir}/commits-analysed.json`;
  await analyseCommits(
    outputCommitsFile,
    outputAnalysedCommitsFile,
    repositoryName
  );
  console.log(`Export terminé vers ${outputAnalysedCommitsFile}`);

  // build sqlite
  await createSqlLite(outputAnalysedCommitsFile, outputDir);
  console.log(`Export terminé vers ${outputDir}/commits.sqlite`);

  // create reports
  const reportLatestPath = `${outputDir}/report-latest.md`;
  const commitsContent = await fs.readFile(outputAnalysedCommitsFile);
  const commits = JSON.parse(commitsContent.toString());
  const latest = await reportLatestChanges(commits, repositoryName);
  await fs.writeFile(reportLatestPath, latest);
  console.log(`Export terminé vers ${reportLatestPath}`);

  const reportTagsPath = `${outputDir}/report-tags.md`;
  const tags = await reportTags(`${outputDir}/commits.sqlite`);
  await fs.writeFile(reportTagsPath, tags);
  console.log(`Export terminé vers ${reportTagsPath}`);
};

if (import.meta.url === `file://${process.argv[1]}`) {
  if (process.argv.length < 3) {
    throw new Error("USAGE: run.ts https://github.com/datagouv/data.gouv.fr");
  }
  const url = process.argv[process.argv.length - 1];
  runForRepo(url);
}
