import CredentialsProvider from "next-auth/providers/credentials";
import type { NextAuthOptions } from "next-auth";
import supadata from "@/app/lib/supabaseclient";
import GoogleProvider from "next-auth/providers/google";

interface Credentials {
  username?: string;
  password?: string;
  email?: string;
  mode?: string;
}

export const options: NextAuthOptions = {
  providers: [
    CredentialsProvider({
      name: "Credentials",
      credentials: {
        username: { label: "Username", type: "text" },
        password: { label: "Password", type: "password" },
        email: { label: "Email", type: "email" },
        mode: { label: "Mode", type: "text" },
      },
      async authorize(credentials: Credentials | undefined) {
        if (!credentials) return null;
        
        const { username, password, email, mode } = credentials;
        console.log("Received credentials in authorize:", credentials);

        if (mode === "resetpassword") {
          try {
            const { error } = await supadata.auth.resetPasswordForEmail(email!, {
              redirectTo: `${process.env.NEXT_PUBLIC_BASE_URL}/resetpassword`,
            });

            if (error) {
              console.error("[ResetPassword] Supabase error:", error.message);
              throw new Error(error.message);
            }

            console.log("[ResetPassword] Email sent");
            return null;
          } catch (err) {
            console.error("[ResetPassword] Unexpected error:", err);
            throw new Error("Something went wrong while sending reset email.");
          }
        }

        if (!username || !password) {
          console.log("[Auth] Missing credentials");
          return null;
        }

        try {
          const { data, error } = await supadata
            .from("Users_Accounts")
            .select("userId, username, password, email, role")
            .eq("username", username)
            .single();

          if (error || !data) {
            console.log("[Auth] User not found or Supabase error:", error?.message);
            return null;
          }

          const passwordsMatch = data.password === password;
          if (!passwordsMatch) {
            console.log("[Auth] Incorrect password");
            return null;
          }

          await supadata
            .from("Users_Accounts")
            .update({ last_login: new Date().toISOString() })
            .eq("userId", data.userId);

          return {
            id: data.userId,
            name: data.username,
            email: data.email ?? null,
            role: data.role ?? "user",
          };
        } catch (err) {
          console.error("[Auth] Unexpected error:", err);
          return null;
        }
      },
    }),

    GoogleProvider({
      clientId: process.env.GOOGLE_CLIENT_ID!,
      clientSecret: process.env.GOOGLE_CLIENT_SECRET!,
    }),
  ],

  pages: {
    signIn: "/login",
  },

  session: {
    strategy: "jwt",
  },

  callbacks: {
    async signIn({ user, account }) {
      if (account?.provider === "google") {
        try {
          const { data: existingUser, error: _error } = await supadata
            .from("Users_Accounts")
            .select("userId")
            .eq("email", user.email)
            .single();

          if (!existingUser) {
            // No user yet — allow sign in and let jwt() insert
            return true;
          }

          // Email exists — assume same user, allow login
          return true;
        } catch (err) {
          console.error("[SignIn] Google account linking error:", err);
          return false;
        }
      }

      return true; // allow credentials-based login
    },

        async jwt({ token, user, account }) {
      if (user && account?.provider === "google") {
        try {
          const email = user.email?.toLowerCase().trim();

          const { data: existingUser, error: selectError } = await supadata
            .from("Users_Accounts")
            .select("userId, role, username") // include username
            .eq("email", email)
            .single();

          if (selectError && selectError.code !== "PGRST116") {
            console.error("Supabase select error:", selectError);
          }

          if (!existingUser) {
            const { data: newUser, error: insertError } = await supadata
              .from("Users_Accounts")
              .insert([
                {
                  username: user.name || email?.split("@")[0],
                  email,
                  role: "user",
                  created_at: new Date().toISOString(),
                  last_login: new Date().toISOString(),
                },
              ])
              .select("userId, role, username")
              .single();

            if (insertError) {
              console.error("Supabase insert error:", insertError.message);
            } else if (newUser) {
              token.id = newUser.userId;
              token.role = newUser.role;
              token.name = newUser.username;
            }
          } else {
            await supadata
              .from("Users_Accounts")
              .update({ last_login: new Date().toISOString() })
              .eq("userId", existingUser.userId);

            token.id = existingUser.userId;
            token.role = existingUser.role;
            token.name = existingUser.username;
          }
        } catch (err) {
          console.error("Error handling Google user in Supabase:", err);
        }
      }

      // For credentials-based users
      if (user && !token.id) {
        token.id = user.id;
        token.role = (user as any).role;
        token.email = user.email;
        token.name = user.name;
      }

      return token;
    },

    async session({ session, token }) {
      if (token?.id) {
        session.user.id = token.id as string;
        (session.user as any).role = token.role as string;
        session.user.name = token.name as string; // ✅ Add the correct username to the session
      }
      return session;
    },

  },
};
