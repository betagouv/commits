import { spawn } from "child_process";

// todo: update only if already exist
export const clone = (url, outputDir) =>
  new Promise((resolve, reject) => {
    const gitClone = spawn("git", ["clone", url, outputDir]);
    gitClone.on("error", (error) => {
      console.error("Erreur lors de l'exécution de git log :", error);
      reject(error);
    });
    gitClone.on("close", () => resolve(true));
  });
