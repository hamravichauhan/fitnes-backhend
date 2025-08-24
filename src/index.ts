import 'dotenv/config';
import express from 'express';
import http from 'http';
import cors from 'cors';
import { ApolloServer } from '@apollo/server';
import { expressMiddleware } from '@as-integrations/express5';
import { ApolloServerPluginDrainHttpServer } from '@apollo/server/plugin/drainHttpServer';

import { typeDefs } from './schema';
import resolvers from './resolvers';
import { connectMongo } from './adapters/mongo/connect';
import { authMiddleware } from './middleware/auth';
import { makeContext } from './context';

async function main() {
  await connectMongo(process.env.MONGO_URL!);

  const app = express();
  const httpServer = http.createServer(app);

  app.use(cors({ origin: process.env.CORS_ORIGIN?.split(',') || true, credentials: true }));
  app.use(express.json());
  app.use(authMiddleware);

  const server = new ApolloServer({
    typeDefs,
    resolvers,
    plugins: [ApolloServerPluginDrainHttpServer({ httpServer })],
  });
  await server.start();

  app.use('/graphql', expressMiddleware(server, {
    context: async ({ req }) => makeContext(req),
  }));

  const port = Number(process.env.PORT || 4000);
  await new Promise<void>(resolve => httpServer.listen({ port }, resolve));
  console.log(`🚀 GraphQL ready at http://localhost:${port}/graphql`);
}

main().catch(err => {
  console.error(err);
  process.exit(1);
});
