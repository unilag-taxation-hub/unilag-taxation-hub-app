"use client";

import Link from "next/link";
import { signOut } from "firebase/auth";
import { auth } from "@/lib/firebase";
import { useRouter } from "next/navigation";

export default function DashboardPage() {
  const router = useRouter();

  async function logout() {
    await signOut(auth);
    router.push("/login");
  }

  return (
    <main className="min-h-screen bg-gray-100">

      <div className="bg-green-700 text-white p-8 rounded-b-3xl">
        <h1 className="text-3xl font-bold">
          Welcome 👋
        </h1>

        <p className="mt-2">
          UNILAG Taxation Hub
        </p>
      </div>

      <div className="p-6 space-y-4">

        <Link
          href="/courses"
          className="block bg-white p-5 rounded-xl shadow"
        >
          📚 My Courses
        </Link>

        <Link
          href="/profile"
          className="block bg-white p-5 rounded-xl shadow"
        >
          👤 My Profile
        </Link>

        <button
          onClick={logout}
          className="w-full bg-red-600 text-white p-4 rounded-xl"
        >
          Logout
        </button>

      </div>

    </main>
  );
}