import GraphQLJSON from 'graphql-type-json';
import auth from './auth.resolver';
import activity from './activity.resolver';
import territory from './territory.resolver';
import leaderboard from './leaderboard.resolver';

// Debug at boot to verify resolver structure
console.log('[resolvers] activity.Mutation =', Object.keys(activity?.Mutation ?? {}));
console.log('[resolvers] auth.Mutation =', Object.keys(auth?.Mutation ?? {}));
console.log('[resolvers] territory.Mutation =', Object.keys(territory?.Mutation ?? {}));
console.log('[resolvers] Query =', Object.keys({
  ...(territory.Query ?? {}),
  ...(leaderboard.Query ?? {}),
  ...(auth.Query ?? {}),
}));

export default {
  JSON: GraphQLJSON,
  Query: {
    ...(territory.Query ?? {}),
    ...(leaderboard.Query ?? {}),
    ...(auth.Query ?? {}),
  },
  Mutation: {
    ...(auth.Mutation ?? {}),
    ...(activity.Mutation ?? {}),
    ...(territory.Mutation ?? {}),
  },
  ...(territory.Territory ? { Territory: territory.Territory } : {}),
};