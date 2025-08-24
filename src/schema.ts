import { gql } from 'graphql-tag';

export const typeDefs = gql`
  scalar JSON
  enum ActivityType { RUN WALK RIDE }

  type User { id: ID!, email: String!, displayName: String!, color: String!, tilesOwned: Int! }

  type Activity {
    id: ID!, type: ActivityType!, startTs: String!, endTs: String
    distanceM: Int!, durationS: Int!, private: Boolean!, geojson: JSON
  }

  type Territory { h3: ID!, owner: User, claimedAt: String, seasonId: ID }

  input BBoxInput { north: Float!, south: Float!, east: Float!, west: Float! }

  type ViewportTerritories { cells: [Territory!]! }

  type Query {
    me: User
    viewportTerritories(bbox: BBoxInput!, res: Int!): ViewportTerritories!
    leaderboard(seasonId: ID): [User!]!
    h3At(lat: Float!, lon: Float!, res: Int!): ID!

  }

  type Mutation {
    signup(email: String!, password: String!, displayName: String!): String!  # returns JWT
    login(email: String!, password: String!): String!                          # returns JWT

    startActivity(type: ActivityType!): Activity!
    endActivity(activityId: ID!, geojson: JSON!, distanceM: Int!, durationS: Int!): Activity!

    claimTerritory(activityId: ID!, seasonId: ID, cells: [ID!]!): Boolean!
  }
`;
