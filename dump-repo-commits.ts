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
  githubRepoPath: string
): boolean {
  if (commit.sha) {
    const commitInfo: CommitInfo = {
      date: commit.date || "",
      repository: commit.repository || "",
      author: commit.author || "",
      message: commit.message || "",
      sha: commit.sha || "",
      url: `https://github.com/${githubRepoPath}/commit/${commit.sha}`,
      diff: diffBuffer,
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
export function extractRepoCommits(repoPath: string, outputFile: string) {
  const gitLog = spawn("git", [
    "-C",
    repoPath,
    "log",
    "-n",
    "500",
    "--pretty=format:%x1e%H%x1f%an%x1f%ad%x1f%s",
    "-p",
  ]);

  // org/repo
  const githuRepoPath = repoPath
    .split("/")
    .reverse()
    .slice(0, 2)
    .reverse()
    .join("/");

  const rl = readline.createInterface({
    input: gitLog.stdout,
    terminal: false,
  });
  const outputStream = fs.createWriteStream(outputFile, { encoding: "utf8" });

  outputStream.write("[\n");

  let isFirst = true;
  let currentCommit: Partial<CommitInfo> = {
    repository: repoPath.split("/").pop() || "",
  };
  let diffBuffer = "";

  rl.on("line", (line) => {
    if (line.startsWith("\x1e")) {
      isFirst = writeCommit(
        outputStream,
        currentCommit,
        diffBuffer,
        isFirst,
        githuRepoPath
      );
      diffBuffer = "";
      const parts = line.slice(1).split("\x1f");
      currentCommit = {
        sha: parts[0],
        author: parts[1],
        date: parts[2],
        message: parts[3],
        repository: repoPath.split("/").pop() || "",
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
      githuRepoPath
    );
    outputStream.write("\n]\n");
    outputStream.end();
    console.log("Export terminé vers", outputFile);
  });

  gitLog.on("error", (error) => {
    console.error("Erreur lors de l'exécution de git log :", error);
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
  extractRepoCommits(repo, output);
}
