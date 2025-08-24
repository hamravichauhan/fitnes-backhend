import "dotenv/config";
import express, { Request, Response, NextFunction } from "express";
import http from "http";
import cors from "cors";
import { ApolloServer } from "@apollo/server";
import { expressMiddleware } from "@as-integrations/express5";
import { ApolloServerPluginDrainHttpServer } from "@apollo/server/plugin/drainHttpServer";

import { typeDefs } from "./schema";
import resolvers from "./resolvers";
import { connectMongo } from "./adapters/mongo/connect";
import { authMiddleware } from "./middleware/auth";
import { makeContext } from "./context";

async function main() {
  // --- 1. Connect to MongoDB ---
  const mongoUrl = process.env.MONGO_URL;
  if (!mongoUrl) {
    throw new Error("❌ Missing MONGO_URL in environment variables");
  }
  await connectMongo(mongoUrl);

  // --- 2. Initialize Express & HTTP server ---
  const app = express();
  const httpServer = http.createServer(app);

  // --- 3. Global middlewares ---
  app.use(
    cors({
      origin: process.env.CORS_ORIGIN?.split(",") || "*",
      credentials: true,
    })
  );
  app.use(express.json());

  // Attach user from JWT (sets req.authUser)
  app.use(authMiddleware);

  // Health check endpoint (useful for monitoring/deployment)
  app.get("/health", (_req: Request, res: Response) => {
    res.json({ status: "ok" });
  });

  // --- 4. Apollo Server setup ---
  const server = new ApolloServer({
    typeDefs,
    resolvers,
    plugins: [ApolloServerPluginDrainHttpServer({ httpServer })],
  });

  await server.start();

  // Attach GraphQL endpoint
  app.use(
    "/graphql",
    expressMiddleware(server, {
      context: async ({ req }) => makeContext(req),
    })
  );

  // --- 5. Start server ---
  const port = Number(process.env.PORT || 4000);
  await new Promise<void>((resolve) =>
    httpServer.listen({ port }, resolve)
  );

  console.log(`🚀 GraphQL server ready at http://localhost:${port}/graphql`);
  console.log(`💚 Health check available at http://localhost:${port}/health`);
}

// --- 6. Handle startup errors ---
main().catch((err: unknown) => {
  console.error("❌ Server startup failed:", err);
  process.exit(1);
});
