#! /usr/bin/env -S pnpm tsx

// use streams

import { createReadStream, createWriteStream } from "node:fs";
import { pipeline } from "node:stream/promises";
import { parser } from "stream-json";
import { streamArray } from "stream-json/streamers/StreamArray";
import { Transform } from "node:stream";
import * as fs from "fs/promises";

import { formatCommit } from "./format-commit";

const LLM_MODEL = process.env.LLM_MODEL || "qwen2.5";

async function exists(f) {
  try {
    await fs.stat(f);
    return true;
  } catch {
    return false;
  }
}

//
// todo: this process wipes old commits from commits-analysed.json output
// should we also store older commits there ?
//

/**
 * Traite les commits lus en streaming depuis un fichier JSON.
 * Pour chaque commit, on construit le fullDiff et on appelle formatCommit.
 */
export async function analyseCommits(
  inputFile: string,
  outputFile: string,
  repositoryName: string
): Promise<void> {
  // Création des streams de lecture et d'écriture
  const readStream = createReadStream(inputFile);
  const outputExists = await exists(outputFile);
  const existingCommits = [];
  if (outputExists) {
    const existingResult = (await fs.readFile(outputFile)).toString();
    try {
      existingCommits.push(...JSON.parse(existingResult));
    } catch (e) {
      try {
        existingCommits.push(...JSON.parse(existingResult + "]"));
      } catch (e) {
        //throw e;
        //existingCommits = [];
      }
      // invalid JSON
      console.log("e", e);
    }
  }

  const streamOutputFile = outputFile;
  const writeStream = createWriteStream(streamOutputFile);

  // On décompose le JSON grâce à stream-json.
  // "parser" lit le JSON, "streamArray" se place sur le tableau.
  const jsonParser = parser();
  const jsonArrayStream = streamArray();

  const commitTransform = new Transform({
    objectMode: true,
    async transform({ key, value }, _encoding, callback) {
      try {
        const commit = value;
        const fullDiff = `commit ${commit.sha}
Author: ${commit.author}
Date: ${commit.date}

${commit.message}

${commit.diff}`; // todo: resumé ?

        //  ensure we dont have it already
        const existingCommit = existingCommits.find(
          (c) => c.sha === commit.sha
        );
        if (!existingCommit) {
          try {
            console.log(`analyse: ${commit.sha}`);
            const result = await formatCommit(LLM_MODEL, fullDiff);
            callback(null, {
              ...result,
              repository: repositoryName,
              author: commit.author,
              message: commit.message,
              sha: commit.sha,
              date: new Date(commit.date).toISOString(),
              url: commit.url,
            });
          } catch (e) {
            console.log(
              `SKIP analyse: bad object reiceved for ${commit.sha} - ${inputFile}`
            );
            callback(null, null);
            //callback(new Error(`bad object reiceved for ${commit.sha}`));
          }
        } else {
          console.log("skip analyse: existing", commit.sha);
          callback(null, existingCommit);
        }
      } catch (error) {
        callback(error);
      }
    },
  });

  // Ce transform permet d'envelopper les résultats dans un tableau JSON.
  // Il écrit le crochet ouvrant, les éléments séparés par des virgules, puis le crochet fermant.
  let isFirst = true;
  const jsonArrayWrapper = new Transform({
    writableObjectMode: true,
    transform(chunk, _encoding, callback) {
      let str = "";
      if (isFirst) {
        str += "[";
        isFirst = false;
      } else {
        str += ",";
      }
      str += JSON.stringify(chunk);
      callback(null, str);
    },
    flush(callback) {
      // Si aucun élément n'a été traité, on renvoie un tableau vide.
      if (isFirst) {
        this.push("[");
      }
      this.push("]");
      callback();
    },
  });

  // On connecte tous les streams avec pipeline pour gérer proprement les erreurs.
  await pipeline(
    readStream,
    jsonParser,
    jsonArrayStream,
    commitTransform,
    jsonArrayWrapper,
    writeStream
  );
}

// when script executes directly
if (import.meta.url === `file://${process.argv[1]}`) {
  if (process.argv.length < 4) {
    throw new Error("USAGE: script.ts /path/to/commits.json output.json");
  }
  const inputFile = process.argv[process.argv.length - 2];
  const outputFile = process.argv[process.argv.length - 1];

  analyseCommits(inputFile, outputFile, "plip/plop")
    .then(() => console.log("Traitement terminé avec succès"))
    .catch((err) => {
      console.error("Erreur lors du traitement :", err);
      process.exit(1);
    });
}
