"use client";

import { useParams } from "next/navigation";
import Link from "next/link";

export default function CBTPage() {
  const params = useParams();
  const courseId = params.courseId as string;

  return (
    <main className="min-h-screen bg-gray-100 flex items-center justify-center p-6">
      <div className="w-full max-w-lg bg-white rounded-2xl shadow-lg p-8 text-center">
        <h1 className="text-3xl font-bold text-red-600">
          🎯 CBT Exam
        </h1>

        <p className="mt-4 text-gray-600">
          CBT Exam Mode is coming soon.
        </p>

        <p className="mt-2 text-sm text-gray-500">
          This section will combine questions from this course into a timed exam.
        </p>

        <Link
          href={`/courses/${courseId}`}
          className="inline-block mt-6 bg-green-700 text-white px-6 py-3 rounded-xl font-semibold"
        >
          Back to Course
        </Link>
      </div>
    </main>
  );
}