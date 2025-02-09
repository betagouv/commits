#! /usr/bin/env -S pnpm tsx

import { generateObject } from "ai";
import { ollama } from "ollama-ai-provider";
import { z } from "zod";
import * as fs from "fs/promises";
import sqlite3 from "sqlite3";
import { open } from "sqlite";

const tagsQuery = `
WITH user_tag_count AS (
  -- On décompose le tableau JSON en lignes, et on compte les occurrences par utilisateur et par tag.
  SELECT 
    author AS author,
    json_each.value AS tag,
    COUNT(*) AS cnt
  FROM commits, json_each(tags)
  GROUP BY author, json_each.value
),
ranked AS (
  -- Pour chaque tag, on classe les utilisateurs par nombre d'occurrences (du plus grand au plus petit)
  SELECT 
    tag,
    author,
    cnt,
    RANK() OVER (PARTITION BY tag ORDER BY cnt DESC) AS rnk
  FROM user_tag_count
  WHERE cnt > 1
)
-- On récupère, pour chaque tag, les utilisateurs ayant le rang 1 (c'est-à-dire le(s) plus nombreux)
SELECT 
  lower(tag) as tag,
  author,
  group_concat(author) AS author2,
  cnt
FROM ranked
GROUP BY tag, author order by tag,cnt desc,author;
`;

export const reportTags = async (inputSqlite) => {
  const db = await open({
    filename: inputSqlite,
    driver: sqlite3.Database,
  });
  const result = await db.all(tagsQuery);
  const tags = Array.from(new Set(result.reduce((a, c) => [...a, c.tag], [])));
  const md = `# Tags
  
${tags
  .map(
    (tag) => `## ${tag}

${result
  .filter((r) => r.tag === tag)
  .map((r) => ` - ${r.author} (${r.cnt})`)
  .join("\n")}
`
  )
  .join("\n")}`;
  db.close();
  return md;
};

// when script executes directly
if (import.meta.url === `file://${process.argv[1]}`) {
  reportTags("./commits.sqlite").then(console.log);
}
