import jwt, { Secret, SignOptions, VerifyOptions } from 'jsonwebtoken';

const SECRET = process.env.JWT_SECRET as string; // ✅ assert it’s always a string

if (!SECRET) {
  throw new Error("JWT_SECRET environment variable is required");
}

export interface JwtUser {
  id: string;
  email: string;
  displayName: string;
  color: string;
}

const signOptions: SignOptions = {
  expiresIn: "30d",
  algorithm: "HS256",
};

const verifyOptions: VerifyOptions = {
  algorithms: ["HS256"],
};

export function signToken(user: JwtUser): string {
  if (!user.id || !user.email || !user.displayName || !user.color) {
    throw new Error("Invalid user data for JWT signing");
  }

  return jwt.sign(user, SECRET as Secret, signOptions);
}

export function verifyToken(token: string): JwtUser {
  if (!token) {
    throw new Error("JWT token is required");
  }

  try {
    const decoded = jwt.verify(token, SECRET as Secret, verifyOptions) as JwtUser;

    if (!decoded.id || !decoded.email || !decoded.displayName || !decoded.color) {
      throw new Error("Invalid JWT payload");
    }

    return decoded;
  } catch (error) {
    throw new Error(
      `JWT verification failed: ${error instanceof Error ? error.message : "Unknown error"}`
    );
  }
}
