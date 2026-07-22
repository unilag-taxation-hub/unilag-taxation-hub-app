"use client";

import { useState } from "react";
import {
  createUserWithEmailAndPassword,
  updateProfile,
} from "firebase/auth";
import {
  doc,
  serverTimestamp,
  setDoc,
} from "firebase/firestore";
import { auth, db } from "@/lib/firebase";

export default function SignUpPage() {
  const [fullName, setFullName] = useState("");
  const [email, setEmail] = useState("");
  const [level, setLevel] = useState("200");
  const [semester, setSemester] = useState("1");
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");

  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState("");
  const [success, setSuccess] = useState(false);

  async function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();

    setMessage("");
    setSuccess(false);

    const cleanName = fullName.trim();
    const cleanEmail = email.trim().toLowerCase();

    if (
      !cleanName ||
      !cleanEmail ||
      !level ||
      !semester ||
      !password ||
      !confirmPassword
    ) {
      setMessage("Please fill in all fields.");
      return;
    }

    if (password.length < 6) {
      setMessage("Password must contain at least 6 characters.");
      return;
    }

    if (password !== confirmPassword) {
      setMessage("Passwords do not match.");
      return;
    }

    try {
      setLoading(true);

      const userCredential = await createUserWithEmailAndPassword(
        auth,
        cleanEmail,
        password
      );

      await updateProfile(userCredential.user, {
        displayName: cleanName,
      });

      await setDoc(doc(db, "users", userCredential.user.uid), {
        uid: userCredential.user.uid,
        fullName: cleanName,
        email: cleanEmail,
        level: Number(level),
        semester: Number(semester),
        createdAt: serverTimestamp(),
      });

      setSuccess(true);
      setMessage("Account created successfully!");

      setFullName("");
      setEmail("");
      setLevel("200");
      setSemester("1");
      setPassword("");
      setConfirmPassword("");
    } catch (error: unknown) {
      setSuccess(false);

      if (
        typeof error === "object" &&
        error !== null &&
        "code" in error
      ) {
        const firebaseError = error as {
          code: string;
          message?: string;
        };

        if (firebaseError.code === "auth/email-already-in-use") {
          setMessage("An account already exists with this email.");
        } else if (firebaseError.code === "auth/invalid-email") {
          setMessage("Please enter a valid email address.");
        } else if (firebaseError.code === "auth/weak-password") {
          setMessage("Please choose a stronger password.");
        } else {
          setMessage(
            firebaseError.message ||
              "Account creation failed. Please try again."
          );
        }
      } else {
        setMessage("Account creation failed. Please try again.");
      }
    } finally {
      setLoading(false);
    }
  }

  return (
    <main className="min-h-screen flex items-center justify-center bg-gray-100 px-4 py-8">
      <div className="w-full max-w-md bg-white rounded-2xl shadow-lg p-6 sm:p-8">
        <h1 className="text-3xl font-bold text-center text-green-700">
          UNILAG Taxation Hub
        </h1>

        <p className="text-center text-gray-500 mt-2">
          Create your student account
        </p>

        <form onSubmit={handleSubmit} className="mt-8 space-y-4">
          <div>
            <label
              htmlFor="fullName"
              className="block mb-1 font-medium text-gray-700"
            >
              Full Name
            </label>

            <input
              id="fullName"
              type="text"
              placeholder="Enter your full name"
              value={fullName}
              onChange={(e) => setFullName(e.target.value)}
              disabled={loading}
              autoComplete="name"
              className="w-full border rounded-lg p-3 focus:outline-none focus:ring-2 focus:ring-green-600 disabled:bg-gray-100"
            />
          </div>

          <div>
            <label
              htmlFor="email"
              className="block mb-1 font-medium text-gray-700"
            >
              Email
            </label>

            <input
              id="email"
              type="email"
              placeholder="Enter your email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              disabled={loading}
              autoComplete="email"
              className="w-full border rounded-lg p-3 focus:outline-none focus:ring-2 focus:ring-green-600 disabled:bg-gray-100"
            />
          </div>

          <div>
            <label
              htmlFor="level"
              className="block mb-1 font-medium text-gray-700"
            >
              Current Level
            </label>

            <select
              id="level"
              value={level}
              onChange={(e) => setLevel(e.target.value)}
              disabled={loading}
              className="w-full border rounded-lg p-3 bg-white focus:outline-none focus:ring-2 focus:ring-green-600 disabled:bg-gray-100"
            >
              <option value="100">100 Level</option>
              <option value="200">200 Level</option>
              <option value="300">300 Level</option>
              <option value="400">400 Level</option>
            </select>
          </div>

          <div>
            <label
              htmlFor="semester"
              className="block mb-1 font-medium text-gray-700"
            >
              Current Semester
            </label>

            <select
              id="semester"
              value={semester}
              onChange={(e) => setSemester(e.target.value)}
              disabled={loading}
              className="w-full border rounded-lg p-3 bg-white focus:outline-none focus:ring-2 focus:ring-green-600 disabled:bg-gray-100"
            >
              <option value="1">First Semester</option>
              <option value="2">Second Semester</option>
            </select>
          </div>

          <div>
            <label
              htmlFor="password"
              className="block mb-1 font-medium text-gray-700"
            >
              Password
            </label>

            <input
              id="password"
              type="password"
              placeholder="Create a password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              disabled={loading}
              autoComplete="new-password"
              className="w-full border rounded-lg p-3 focus:outline-none focus:ring-2 focus:ring-green-600 disabled:bg-gray-100"
            />

            <p className="mt-1 text-xs text-gray-500">
              Password must contain at least 6 characters.
            </p>
          </div>

          <div>
            <label
              htmlFor="confirmPassword"
              className="block mb-1 font-medium text-gray-700"
            >
              Confirm Password
            </label>

            <input
              id="confirmPassword"
              type="password"
              placeholder="Enter the password again"
              value={confirmPassword}
              onChange={(e) => setConfirmPassword(e.target.value)}
              disabled={loading}
              autoComplete="new-password"
              className="w-full border rounded-lg p-3 focus:outline-none focus:ring-2 focus:ring-green-600 disabled:bg-gray-100"
            />
          </div>

          {message && (
            <p
              role="alert"
              className={`text-center text-sm ${
                success ? "text-green-700" : "text-red-600"
              }`}
            >
              {success ? "✅ " : ""}
              {message}
            </p>
          )}

          <button
            type="submit"
            disabled={loading}
            className="w-full bg-green-700 text-white py-3 rounded-lg font-medium hover:bg-green-800 transition disabled:bg-gray-400 disabled:cursor-not-allowed"
          >
            {loading ? "Creating Account..." : "Create Account"}
          </button>
        </form>
      </div>
    </main>
  );
}
