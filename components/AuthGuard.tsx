"use client";

import { ReactNode, useEffect, useState } from "react";
import { onAuthStateChanged } from "firebase/auth";
import { usePathname, useRouter } from "next/navigation";
import { auth } from "@/lib/firebase";

interface AuthGuardProps {
  children: ReactNode;
}

export default function AuthGuard({
  children,
}: AuthGuardProps) {
  const router = useRouter();
  const pathname = usePathname();

  const [checkingAuth, setCheckingAuth] = useState(true);
  const [authenticated, setAuthenticated] = useState(false);

  useEffect(() => {
    let active = true;
    let unsubscribe = () => {};

    async function checkAuthentication() {
      try {
        await auth.authStateReady();

        if (!active) {
          return;
        }

        unsubscribe = onAuthStateChanged(auth, (user) => {
          if (!active) {
            return;
          }

          if (user) {
            setAuthenticated(true);
            setCheckingAuth(false);
            return;
          }

          setAuthenticated(false);
          setCheckingAuth(false);

          const destination = encodeURIComponent(
            pathname || "/dashboard"
          );

          router.replace(`/login?next=${destination}`);
        });
      } catch (error) {
        console.error("Authentication check failed:", error);

        if (active) {
          setAuthenticated(false);
          setCheckingAuth(false);
          router.replace("/login");
        }
      }
    }

    checkAuthentication();

    return () => {
      active = false;
      unsubscribe();
    };
  }, [pathname, router]);

  if (checkingAuth) {
    return (
      <main className="min-h-screen bg-gray-100 flex items-center justify-center">
        <div className="text-center">
          <div className="w-12 h-12 border-4 border-green-700 border-t-transparent rounded-full animate-spin mx-auto" />

          <p className="mt-4 text-gray-600">
            Checking your account...
          </p>
        </div>
      </main>
    );
  }

  if (!authenticated) {
    return null;
  }

  return <>{children}</>;
}