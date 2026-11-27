import { createApp } from "./app.js";
import { config } from "./config.js";
const { app, db, scheduled } = createApp();
const server = app.listen(config.port, process.env.HOST || "127.0.0.1", () => {
  console.log(`FinanceTrack API: http://localhost:${config.port}`);
  try {
    scheduled.run();
  } catch {
    console.error("Scheduler startup failed.");
  }
});
const interval = setInterval(
  () => {
    try {
      scheduled.run();
    } catch {
      console.error("Scheduler cycle failed.");
    }
  },
  Math.max(1000, Number(process.env.SCHEDULER_INTERVAL_MS || 60000)),
);
interval.unref();
for (const signal of ["SIGINT", "SIGTERM"])
  process.on(signal, () => {
    clearInterval(interval);
    server.close(() => {
      db.close();
      process.exit(0);
    });
  });
