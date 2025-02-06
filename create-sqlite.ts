import { spawn } from "child_process";

export const createSqlLite = (inputJsonFile, outputDir) =>
  new Promise((resolve, reject) => {
    const sqlFile = `${outputDir}/commits.sqlite`;

    const sqlCommands = `
CREATE TABLE IF NOT EXISTS commits(
  date TEXT,
  repository TEXT,
  sha TEXT unique,
  author TEXT,
  message TEXT,
  description TEXT,
  tags JSON,
  languages JSON,
  url TEXT
);
BEGIN TRANSACTION;
INSERT OR IGNORE INTO commits
SELECT json_extract(value, '$.date'),
  json_extract(value, '$.repository'),
  json_extract(value, '$.sha'),
  json_extract(value, '$.author'),
  json_extract(value, '$.message'),
  json_extract(value, '$.description'),
  json_extract(value, '$.tags'),
  json_extract(value, '$.languages'),
  json_extract(value, '$.url')
FROM json_each(
    readfile('${inputJsonFile}')
);
COMMIT;
`;

    const sqlite3 = spawn("sqlite3", [sqlFile], {
      //    cwd: outputDir,
    });
    sqlite3.stdin.write(sqlCommands);
    sqlite3.stdin.end();
    sqlite3.stderr.on("data", (data) => {
      console.error(`stderr: ${data}`);
      reject(data);
    });
    sqlite3.stdout.on("data", (data) => {
      console.log(`stdout: ${data}`);
    });
    sqlite3.on("close", () => resolve(true));
  });
