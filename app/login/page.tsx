"use client";

import { useState } from "react";
import { signInWithEmailAndPassword } from "firebase/auth";
import { auth } from "@/lib/firebase";
import { useRouter } from "next/navigation";
import Link from "next/link";

export default function LoginPage() {
  const router = useRouter();

  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");

  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState("");

  async function handleLogin(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();

    setMessage("");

    try {
      setLoading(true);

      await signInWithEmailAndPassword(auth, email, password);

      setMessage("Login successful!");

      router.push("/dashboard");
    } catch (error: any) {
      setMessage(error.message);
    } finally {
      setLoading(false);
    }
  }

  return (
    <main className="min-h-screen flex items-center justify-center bg-gray-100">
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
              onChange={(e) => setEmail(e.target.value)}
              className="w-full border rounded-lg p-3"
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
              onChange={(e) => setPassword(e.target.value)}
              className="w-full border rounded-lg p-3"
            />
          </div>

          {message && (
            <p className="text-center text-red-600">
              {message}
            </p>
          )}

          <button
            type="submit"
            disabled={loading}
            className="w-full bg-green-700 text-white py-3 rounded-lg"
          >
            {loading ? "Logging in..." : "Login"}
          </button>

          <p className="text-center text-sm mt-4">
            Don't have an account?{" "}
            <Link href="/signup" className="text-green-700 font-semibold">
              Create one
            </Link>
          </p>

        </form>

      </div>
    </main>
  );
}