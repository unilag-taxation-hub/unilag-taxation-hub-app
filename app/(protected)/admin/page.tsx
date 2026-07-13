"use client";

import { useEffect, useState } from "react";
import { onAuthStateChanged } from "firebase/auth";
import Link from "next/link";
import { auth } from "@/lib/firebase";

export default function AdminPage() {
  const [checking, setChecking] = useState(true);
  const [isAdmin, setIsAdmin] = useState(false);

  useEffect(() => {
    const adminEmail =
      process.env.NEXT_PUBLIC_ADMIN_EMAIL?.trim().toLowerCase();

    const unsubscribe = onAuthStateChanged(auth, (user) => {
      const userEmail = user?.email?.trim().toLowerCase();

      setIsAdmin(
        Boolean(
          userEmail &&
            adminEmail &&
            userEmail === adminEmail
        )
      );

      setChecking(false);
    });

    return unsubscribe;
  }, []);

  if (checking) {
    return (
      <main className="min-h-screen bg-gray-100 flex items-center justify-center">
        <p className="text-gray-600">
          Checking admin access...
        </p>
      </main>
    );
  }

  if (!isAdmin) {
    return (
      <main className="min-h-screen bg-gray-100 flex items-center justify-center p-6">
        <div className="w-full max-w-md bg-white rounded-2xl shadow-lg p-8 text-center">
          <h1 className="text-3xl font-bold text-red-600">
            Access Denied
          </h1>

          <p className="mt-3 text-gray-600">
            This page is available only to the platform
            administrator.
          </p>

          <Link
            href="/dashboard"
            className="inline-block mt-6 bg-green-700 text-white px-6 py-3 rounded-xl"
          >
            Return to Dashboard
          </Link>
        </div>
      </main>
    );
  }

  return (
    <main className="min-h-screen bg-gray-100 p-6">
      <div className="max-w-5xl mx-auto">
        <div className="bg-green-700 text-white rounded-2xl p-8 shadow-lg">
          <p className="text-green-100">
            Administrator
          </p>

          <h1 className="text-3xl font-bold mt-1">
            UNILAG Taxation Hub Admin
          </h1>

          <p className="mt-2 text-green-100">
            Manage courses, notes and practice questions.
          </p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-5 mt-8">
          <Link
            href="/admin/courses"
            className="block bg-white rounded-2xl shadow p-6 hover:shadow-lg transition"
          >
            <h2 className="text-xl font-bold">
              📚 Manage Courses
            </h2>

            <p className="mt-2 text-gray-600">
              Add and update Taxation courses.
            </p>
          </Link>

          <Link
            href="/admin/notes"
            className="block bg-white rounded-2xl shadow p-6 hover:shadow-lg transition"
          >
            <h2 className="text-xl font-bold">
              📖 Add Notes
            </h2>

            <p className="mt-2 text-gray-600">
              Publish course notes directly to Firestore.
            </p>
          </Link>

          <Link
            href="/admin/mcqs"
            className="block bg-white rounded-2xl shadow p-6 hover:shadow-lg transition"
          >
            <h2 className="text-xl font-bold">
              📝 Add MCQs
            </h2>

            <p className="mt-2 text-gray-600">
              Add options, correct answers and explanations.
            </p>
          </Link>

          <Link
            href="/admin/questions"
            className="block bg-white rounded-2xl shadow p-6 hover:shadow-lg transition"
          >
            <h2 className="text-xl font-bold">
              ✍️ Add German and Theory Questions
            </h2>

            <p className="mt-2 text-gray-600">
              Add model answers and answer guides.
            </p>
          </Link>
        </div>

        <Link
          href="/dashboard"
          className="inline-block mt-8 text-green-700 font-semibold"
        >
          ← Back to Dashboard
        </Link>
      </div>
    </main>
  );
}