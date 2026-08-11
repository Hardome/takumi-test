import { mkdir } from "node:fs/promises";
import { outDir, buildGallery } from "../gallery.js";
import { hero } from "./hero.js";
import { bento } from "./bento.js";
import { vector } from "./vector.js";
import { motion } from "./motion.js";

async function main() {
  await mkdir(outDir, { recursive: true });

  // Each example is independent — render them all.
  await hero();
  await bento();
  await vector();
  await motion();

  const files = await buildGallery();
  console.log(`\nDone. ${files.length} assets in ./out — open out/index.html to view.`);
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
