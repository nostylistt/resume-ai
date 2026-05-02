require('dotenv').config();
const { fetchMarketRequirements } = require('./services/marketResearch');

async function test() {
  console.log("--- FIRST RUN (Should Scrape & LLM) ---");
  console.time('First Run');
  await fetchMarketRequirements("Project Manager", ["Project Manager"]);
  console.timeEnd('First Run');

  console.log("\n--- SECOND RUN (Should hit SQLite Cache) ---");
  console.time('Second Run');
  await fetchMarketRequirements("Project Manager", ["Project Manager"]);
  console.timeEnd('Second Run');
}

test();
