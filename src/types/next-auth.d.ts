import "next-auth";

declare module "next-auth" {
  interface Session {
    user: {
      id: string;
      status: string;
      role: string;
      name?: string | null;
      email?: string | null;
      image?: string | null;
    };
  }
}

declare module "next-auth/jwt" {
  interface JWT {
    id?: string;
    status?: string;
    role?: string;
  }
}
