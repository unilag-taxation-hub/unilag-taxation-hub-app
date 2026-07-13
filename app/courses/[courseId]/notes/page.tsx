"use client";

import { useEffect, useState } from "react";
import { useParams } from "next/navigation";
import {
  collection,
  getDocs,
  orderBy,
  query,
} from "firebase/firestore";
import { db } from "@/lib/firebase";
import Link from "next/link";

interface Note {
  id: string;
  title: string;
  description: string;
  content: string;
  order: number;
}

export default function NotesPage() {
  const params = useParams<{ courseId: string }>();
  const courseId = params.courseId;

  const [notes, setNotes] = useState<Note[]>([]);
  const [selectedNote, setSelectedNote] = useState<Note | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  useEffect(() => {
    async function loadNotes() {
      try {
        const notesReference = collection(
          db,
          "courses",
          courseId,
          "notes"
        );

        const notesQuery = query(
          notesReference,
          orderBy("order", "asc")
        );

        const snapshot = await getDocs(notesQuery);

        const noteData: Note[] = snapshot.docs.map((noteDocument) => ({
          id: noteDocument.id,
          ...(noteDocument.data() as Omit<Note, "id">),
        }));

        setNotes(noteData);
      } catch (caughtError) {
        console.error(caughtError);
        setError("Unable to load course notes.");
      } finally {
        setLoading(false);
      }
    }

    if (courseId) {
      loadNotes();
    }
  }, [courseId]);

  if (loading) {
    return (
      <main className="min-h-screen flex items-center justify-center bg-gray-100">
        <p>Loading notes...</p>
      </main>
    );
  }

  if (error) {
    return (
      <main className="min-h-screen flex items-center justify-center bg-gray-100 p-6">
        <div className="bg-white p-8 rounded-2xl shadow text-center">
          <p className="text-red-600">{error}</p>

          <Link
            href={`/courses/${courseId}`}
            className="inline-block mt-5 text-green-700 font-semibold"
          >
            ← Back to Course
          </Link>
        </div>
      </main>
    );
  }

  if (notes.length === 0) {
    return (
      <main className="min-h-screen flex items-center justify-center bg-gray-100 p-6">
        <div className="bg-white p-8 rounded-2xl shadow text-center">
          <h1 className="text-2xl font-bold">
            No notes available
          </h1>

          <p className="mt-2 text-gray-600">
            Notes have not been added to this course yet.
          </p>

          <Link
            href={`/courses/${courseId}`}
            className="inline-block mt-5 text-green-700 font-semibold"
          >
            ← Back to Course
          </Link>
        </div>
      </main>
    );
  }

  if (selectedNote) {
    return (
      <main className="min-h-screen bg-gray-100 p-6">
        <div className="max-w-3xl mx-auto">
          <button
            onClick={() => setSelectedNote(null)}
            className="mb-5 text-green-700 font-semibold"
          >
            ← Back to Notes
          </button>

          <article className="bg-white rounded-2xl shadow-lg p-8">
            <p className="text-sm text-green-700 font-semibold">
              Course Note
            </p>

            <h1 className="text-3xl font-bold mt-2">
              {selectedNote.title}
            </h1>

            <p className="mt-3 text-gray-600">
              {selectedNote.description}
            </p>

            <div className="mt-8 border-t pt-6">
              <p className="text-gray-800 leading-8 whitespace-pre-line">
                {selectedNote.content}
              </p>
            </div>
          </article>
        </div>
      </main>
    );
  }

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
          <h1 className="text-3xl font-bold">
            📖 Course Notes
          </h1>

          <p className="mt-2 text-green-100">
            Select a topic to begin studying.
          </p>
        </div>

        <div className="mt-6 space-y-4">
          {notes.map((note, index) => (
            <div
              key={note.id}
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

              <button
                onClick={() => setSelectedNote(note)}
                className="mt-4 bg-green-700 text-white px-5 py-2 rounded-xl"
              >
                Start Reading
              </button>
            </div>
          ))}
        </div>
      </div>
    </main>
  );
}