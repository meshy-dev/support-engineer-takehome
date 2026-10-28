import { createApp } from "./app.js";
import { loadSeed } from "./db.js";

const port = Number(process.env.PORT ?? 3000);

createApp(loadSeed()).listen(port, () => {
  console.log(`Mock API listening on http://localhost:${port}`);
});
