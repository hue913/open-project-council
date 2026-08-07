import { existsSync, readdirSync, readFileSync } from "node:fs";
import { join } from "node:path";

const outputDirectory = new URL("../apps/web/dist/", import.meta.url);
const indexFile = new URL("index.html", outputDirectory);
const forbiddenTerms = ["/api/", "agent-seats", "model-api-key", "apiKey", "ENVELOPE_KEK_BASE64"];

function collectFiles(directory) {
  return readdirSync(directory, { withFileTypes: true }).flatMap((entry) => {
    const path = join(directory, entry.name);
    return entry.isDirectory() ? collectFiles(path) : [path];
  });
}

if (!existsSync(indexFile)) {
  throw new Error("Public demo build did not produce apps/web/dist/index.html.");
}

const leakedTerm = collectFiles(outputDirectory.pathname)
  .filter((path) => /\.(?:html|js)$/.test(path))
  .flatMap((path) => {
    const content = readFileSync(path, "utf8");
    return forbiddenTerms.filter((term) => content.includes(term)).map((term) => ({ path, term }));
  })[0];

if (leakedTerm) {
  throw new Error(`Public demo contains forbidden private-workspace term "${leakedTerm.term}" in ${leakedTerm.path}.`);
}

console.log("Public demo artifact contains no private API routes or credential form identifiers.");
