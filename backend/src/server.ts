import path from "node:path";
import { createApp } from "./app.js";
import { FileSaveStore } from "./store.js";

const port = Number(process.env.PORT ?? 4000);
const savesDir = path.resolve(process.env.SAVES_DIR ?? "./data/saves");
const corsOrigin = process.env.CORS_ORIGIN ?? "http://localhost:3000";

createApp({ store: new FileSaveStore(savesDir), corsOrigin }).listen(port, () => {
  console.log(`API do Rastro em http://localhost:${port} (saves em ${savesDir}, CORS: ${corsOrigin})`);
});
