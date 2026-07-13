"use client";

import { ReactNode, useEffect, useState } from "react";
import { onAuthStateChanged } from "firebase/auth";
import { usePathname, useRouter } from "next/navigation";
import { auth } from "@/lib/firebase";

interface AuthGuardProps {
  children: ReactNode;
}

export default function AuthGuard({ children }: AuthGuardProps) {
  const router = useRouter();
  const pathname = usePathname();
  const [checkingAuth, setCheckingAuth] = useState(true);

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, (user) => {
      if (!user) {
        const destination = encodeURIComponent(pathname);
        router.replace(`/login?next=${destination}`);
        return;
      }

      setCheckingAuth(false);
    });

    return unsubscribe;
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

  return <>{children}</>;
}