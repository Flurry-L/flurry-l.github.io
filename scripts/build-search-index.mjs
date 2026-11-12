// Index published SSG pages directly, preserving their rendered heading anchors.
// Run the build before dev to refresh search; both servers use dist/pagefind.
// UI/navigation exclusions live in data-pagefind-ignore attributes on the pages.
import * as pagefind from "pagefind";

function checkErrors(result, operation) {
  if (result.errors?.length) {
    throw new Error(`${operation}: ${result.errors.join("\n")}`);
  }
  return result;
}

try {
  const { index } = checkErrors(
    await pagefind.createIndex({ forceLanguage: "zh" }),
    "Creating Pagefind index"
  );
  if (!index) throw new Error("Pagefind did not return an index");

  const { page_count: count } = checkErrors(
    await index.addDirectory({
      path: "dist",
      glob: "{posts/*/index.html,about/index.html}",
    }),
    "Indexing published pages"
  );

  checkErrors(
    await index.writeFiles({ outputPath: "dist/pagefind" }),
    "Writing Pagefind index"
  );
  console.log(`build-search-index: ${count} HTML documents → dist/pagefind`);
} finally {
  await pagefind.close();
}
