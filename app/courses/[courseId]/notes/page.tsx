"use client";

import { useParams } from "next/navigation";
import Link from "next/link";

const notes = [
  {
    title: "Introduction to Taxation",
    description:
      "Meaning, purpose, characteristics, and basic principles of taxation.",
  },
  {
    title: "Objectives of Taxation",
    description:
      "Revenue generation, redistribution, economic stability, and regulation.",
  },
  {
    title: "Types of Taxes",
    description:
      "Direct taxes, indirect taxes, progressive, proportional, and regressive taxes.",
  },
];

export default function NotesPage() {
  const params = useParams();
  const courseId = params.courseId as string;

  return (
    <main className="min-h-screen bg-gray-100 p-6">
      <div className="max-w-3xl mx-auto">
        <Link
          href={`/courses/${courseId}`}
          className="inline-block mb-5 text-green-700 font-semibold"
        >
          ← Back to Course
        </Link>

        <div className="bg-green-700 text-white rounded-2xl p-6">
          <h1 className="text-3xl font-bold">📖 Course Notes</h1>
          <p className="mt-2 text-green-100">
            Select a topic to begin studying.
          </p>
        </div>

        <div className="mt-6 space-y-4">
          {notes.map((note, index) => (
            <div
              key={note.title}
              className="bg-white rounded-2xl shadow p-6"
            >
              <p className="text-sm text-green-700 font-semibold">
                Topic {index + 1}
              </p>

              <h2 className="text-xl font-bold mt-1">
                {note.title}
              </h2>

              <p className="text-gray-600 mt-2">
                {note.description}
              </p>

              <button className="mt-4 bg-green-700 text-white px-5 py-2 rounded-xl">
                Start Reading
              </button>
            </div>
          ))}
        </div>
      </div>
    </main>
  );
}