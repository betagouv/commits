#! /usr/bin/env -S pnpm tsx
import pAll from "p-all";

const orgs = [
  "betagouv",
  "socialgouv",
  "mtes-mct",
  "incubateur-territoires",
  "incubateur-ademe",
  "numerique-gouv",
  "suitenumerique",
  "etalab",
  "etalab-ia",
  "datagouv",
  "demarches-simplifiees",
  "codegouvfr",
  "gouvernementfr",
  "disic",
];

const repos = pAll(
  orgs.flatMap((org) => () => {
    return fetch(
      `https://repos.ecosyste.ms/api/v1/hosts/GitHub/owners/${org}/repositories?sort=updated_at&order=desc&page=1&per_page=100`
    ).then((r) => r.json());
  }),
  { concurrency: 1 }
);

const blockedRepos = [
  "betagouv/dashlord",
  "MTES-MCT/dashlord",
  "incubateur-territoires/dashlord",
  "incubateur-ademe/dashlord",
  "socialgouv/dashlord",
];

const isValidRepo = (repo) => !blockedRepos.includes(repo);

repos.then((r) => {
  const validRepos = r
    .flatMap((r) => r)
    .map((r) => r.html_url)
    .filter(isValidRepo)
    .map((r) => `./run.ts ${r}`)
    .join("\n");
  console.log(validRepos);
});
