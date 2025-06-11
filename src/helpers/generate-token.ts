import jwt from "jsonwebtoken";

// use user._id to generate token
export function generateToken(userId: string) {
  return jwt.sign({ _id: userId }, process.env.JWT_SECRET!, {
    expiresIn: "7d",
  });
}
