import fs from "node:fs";
import path from "node:path";

const from = path.resolve("dist");
const to = path.resolve("docs/lib");
fs.rmSync(to, { recursive: true, force: true });
fs.mkdirSync(to, { recursive: true });
for (const file of fs.readdirSync(from)) {
  if (file.endsWith(".js") || file.endsWith(".js.map")) {
    fs.copyFileSync(path.join(from, file), path.join(to, file));
  }
}
