"use client";

import { useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import {
  signInWithEmailAndPassword,
  setPersistence,
  browserLocalPersistence,
} from "firebase/auth";
import { auth } from "@/lib/firebase";

export default function LoginPage() {
  const router = useRouter();

  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState("");

  async function handleLogin(
    event: React.FormEvent<HTMLFormElement>
  ) {
    event.preventDefault();
    setMessage("");

    if (!email || !password) {
      setMessage("Please enter your email and password.");
      return;
    }

    try {
      setLoading(true);

      await setPersistence(auth, browserLocalPersistence);

await signInWithEmailAndPassword(
  auth,
  email.trim(),
  password
);

      const searchParams = new URLSearchParams(
        window.location.search
      );

      const requestedPage = searchParams.get("next");

      const destination =
        requestedPage && requestedPage.startsWith("/")
          ? requestedPage
          : "/dashboard";

      router.replace(destination);
    } catch (error: unknown) {
      console.error(error);
      setMessage("Incorrect email or password.");
    } finally {
      setLoading(false);
    }
  }

  return (
    <main className="min-h-screen flex items-center justify-center bg-gray-100 px-6">
      <div className="w-full max-w-md bg-white rounded-2xl shadow-lg p-8">
        <h1 className="text-3xl font-bold text-center text-green-700">
          UNILAG Taxation Hub
        </h1>

        <p className="text-center text-gray-500 mt-2">
          Welcome Back
        </p>

        <form onSubmit={handleLogin} className="mt-8 space-y-4">
          <div>
            <label className="block mb-1 font-medium">
              Email
            </label>

            <input
              type="email"
              placeholder="Enter your email"
              value={email}
              onChange={(event) => setEmail(event.target.value)}
              className="w-full border rounded-lg p-3"
              required
            />
          </div>

          <div>
            <label className="block mb-1 font-medium">
              Password
            </label>

            <input
              type="password"
              placeholder="Enter your password"
              value={password}
              onChange={(event) => setPassword(event.target.value)}
              className="w-full border rounded-lg p-3"
              required
            />
          </div>

          {message && (
            <p className="text-center text-sm text-red-600">
              {message}
            </p>
          )}

          <button
            type="submit"
            disabled={loading}
            className="w-full bg-green-700 text-white py-3 rounded-lg disabled:bg-gray-400"
          >
            {loading ? "Logging in..." : "Login"}
          </button>

          <p className="text-center text-sm mt-4">
            Don&apos;t have an account?{" "}
            <Link
              href="/signup"
              className="text-green-700 font-semibold"
            >
              Create one
            </Link>
          </p>
        </form>
      </div>
    </main>
  );
}