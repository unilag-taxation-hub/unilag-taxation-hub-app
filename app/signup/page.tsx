"use client";

import { useState } from "react";
import { createUserWithEmailAndPassword, updateProfile } from "firebase/auth";
import { auth } from "@/lib/firebase";

export default function SignUpPage() {
  const [fullName, setFullName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");

  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState("");

  async function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();

    setMessage("");

    if (!fullName || !email || !password) {
      setMessage("Please fill in all fields.");
      return;
    }

    try {
      setLoading(true);

      const userCredential = await createUserWithEmailAndPassword(
        auth,
        email,
        password
      );

      await updateProfile(userCredential.user, {
        displayName: fullName,
      });

      setMessage("✅ Account created successfully!");

      setFullName("");
      setEmail("");
      setPassword("");
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
          Create your account
        </p>

        <form onSubmit={handleSubmit} className="mt-8 space-y-4">

          <div>
            <label className="block mb-1 font-medium">
              Full Name
            </label>

            <input
              type="text"
              placeholder="Enter your full name"
              value={fullName}
              onChange={(e) => setFullName(e.target.value)}
              className="w-full border rounded-lg p-3 focus:outline-none focus:ring-2 focus:ring-green-600"
            />
          </div>

          <div>
            <label className="block mb-1 font-medium">
              Email
            </label>

            <input
              type="email"
              placeholder="Enter your email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              className="w-full border rounded-lg p-3 focus:outline-none focus:ring-2 focus:ring-green-600"
            />
          </div>

          <div>
            <label className="block mb-1 font-medium">
              Password
            </label>

            <input
              type="password"
              placeholder="Create a password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              className="w-full border rounded-lg p-3 focus:outline-none focus:ring-2 focus:ring-green-600"
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
            className="w-full bg-green-700 text-white py-3 rounded-lg hover:bg-green-800 transition disabled:bg-gray-400"
          >
            {loading ? "Creating Account..." : "Create Account"}
          </button>

        </form>

      </div>
    </main>
  );
}