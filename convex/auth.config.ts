// Convex validates Clerk-issued JWTs (JWT template / Convex integration named "convex").
const authConfig = {
  providers: [
    {
      domain: process.env.CLERK_JWT_ISSUER_DOMAIN!,
      applicationID: "convex",
    },
  ],
};

export default authConfig;
