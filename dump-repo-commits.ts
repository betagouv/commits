#! /usr/bin/env -S pnpm tsx

import { spawn } from "child_process";
import * as readline from "readline";
import * as fs from "fs";

interface CommitInfo {
  date: string;
  repository: string;
  author: string;
  message: string;
  sha: string;
  url: string;
  diff: string;
}

/**
 * Fonction pour écrire un commit dans le fichier JSON en stream
 */
function writeCommit(
  outputStream: fs.WriteStream,
  commit: Partial<CommitInfo>,
  diffBuffer: string,
  isFirst: boolean,
  commitUrlPrefix: string
): boolean {
  if (commit.sha) {
    const commitInfo: CommitInfo = {
      date: commit.date || "",
      repository: commit.repository || "",
      author: commit.author || "",
      message: commit.message || "",
      sha: commit.sha || "",
      url: commitUrlPrefix && `${commitUrlPrefix}/${commit.sha}`,
      diff: diffBuffer.slice(0, 1000).replace(/[\u{0080}-\u{FFFF}]/gu, ""),
    };
    const jsonCommit = JSON.stringify(commitInfo, null, 2);
    if (!isFirst) {
      outputStream.write(",\n");
    }
    outputStream.write(jsonCommit);
    return false; // Après le premier commit, on met isFirst à false
  }
  return isFirst;
}

/**
 * Cette fonction stream les commits d'un dépôt Git et les écrit progressivement
 * dans un fichier JSON.
 */
export function extractRepoCommits(
  repoPath: string,
  outputFile: string,
  commitUrlPrefix?: string | undefined
) {
  const gitLog = spawn("git", [
    "-C",
    repoPath,
    "log",
    "-n",
    "100",
    "--no-merges",
    "--pretty=format:|||||%H_____%an_____%ad_____%s",
    "-p",
  ]);

  const rl = readline.createInterface({
    input: gitLog.stdout,
    terminal: false,
  });

  const outputStream = fs.createWriteStream(outputFile, { encoding: "utf8" });

  outputStream.write("[\n");

  const defaultRepository = repoPath.split("/").slice(-2).join("/") || "";

  let isFirst = true;
  let currentCommit: Partial<CommitInfo> = {
    repository: defaultRepository,
  };

  let diffBuffer = "";

  return new Promise(async (resolve, reject) => {
    rl.on("line", (line) => {
      const cleanLine = line.replaceAll("\ufffd", "");
      if (cleanLine.startsWith("|||||")) {
        isFirst = writeCommit(
          outputStream,
          currentCommit,
          diffBuffer,
          isFirst,
          commitUrlPrefix
        );
        diffBuffer = "";
        const parts = cleanLine.slice(5).split("_____");
        currentCommit = {
          sha: parts[0],
          author: parts[1],
          date: parts[2],
          message: parts[3],
          repository: defaultRepository,
        };
      } else {
        diffBuffer += line + "\n";
      }
    });

    rl.on("close", () => {
      isFirst = writeCommit(
        outputStream,
        currentCommit,
        diffBuffer,
        isFirst,
        commitUrlPrefix
      );
      outputStream.write("\n]\n");
      outputStream.end();
      console.log("Export terminé vers", outputFile);
      resolve(outputFile);
    });

    gitLog.on("error", (error) => {
      console.error("Erreur lors de l'exécution de git log :", error);
      reject(error);
    });
  });
}

// // when script executes directly
if (import.meta.url === `file://${process.argv[1]}`) {
  if (process.argv.length < 4) {
    throw new Error("USAGE: dump.ts /path/to/repo output.json");
  }
  const repo = process.argv[process.argv.length - 2];
  const output = process.argv[process.argv.length - 1];
  console.log("repo", repo);
  extractRepoCommits(repo, output).then(console.log);
}
