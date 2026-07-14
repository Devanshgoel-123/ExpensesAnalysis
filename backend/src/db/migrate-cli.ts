import { getStore } from "./index.js";

async function main() {
  const store = await getStore();
  console.log("Migration complete");
  process.exit(0);
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
