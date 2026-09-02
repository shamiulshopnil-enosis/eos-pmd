import "reflect-metadata";
import { NestFactory } from "@nestjs/core";
import { Logger } from "@nestjs/common";
import { AppModule } from "./app.module";

async function bootstrap() {
  const app = await NestFactory.create(AppModule, { bufferLogs: false });

  // All routes are served under /api so the Next.js app can proxy or call
  // directly without path collisions.
  app.setGlobalPrefix("api");

  const origins = (process.env.CORS_ORIGINS ?? "")
    .split(",")
    .map((s) => s.trim())
    .filter(Boolean);
  if (origins.length > 0) {
    app.enableCors({ origin: origins, credentials: true });
  }

  const port = Number.parseInt(process.env.PORT ?? "4000", 10);
  // Bind 0.0.0.0 so the container platform (Render, etc.) can route to it.
  await app.listen(port, "0.0.0.0");
  new Logger("Bootstrap").log(`eos-pmd API listening on port ${port} (prefix /api)`);
}

void bootstrap();
