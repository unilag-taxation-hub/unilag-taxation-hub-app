"use client";

import { useEffect, useState } from "react";
import { useParams } from "next/navigation";
import Link from "next/link";
import { onAuthStateChanged } from "firebase/auth";
import {
  arrayRemove,
  arrayUnion,
  collection,
  doc,
  getDoc,
  getDocs,
  orderBy,
  query,
  serverTimestamp,
  setDoc,
} from "firebase/firestore";
import { auth, db } from "@/lib/firebase";
import { saveActivity } from "@/lib/activity";

interface Note {
  id: string;
  title: string;
  description: string;
  content: string;
  order: number;
}

interface CourseProgress {
  completedNoteIds?: string[];
}

interface Course {
  title?: string;
  code?: string;
}

export default function NotesPage() {
  const params = useParams<{ courseId: string }>();
  const courseId = params.courseId;

  const [notes, setNotes] = useState<Note[]>([]);
  const [course, setCourse] = useState<Course>({});
  const [selectedNote, setSelectedNote] = useState<Note | null>(null);
  const [completedNoteIds, setCompletedNoteIds] = useState<string[]>([]);

  const [userId, setUserId] = useState("");
  const [loading, setLoading] = useState(true);
  const [savingProgress, setSavingProgress] = useState(false);
  const [error, setError] = useState("");
  const [progressMessage, setProgressMessage] = useState("");

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, async (user) => {
      if (!user) {
        setError("Please log in to access course notes.");
        setLoading(false);
        return;
      }

      setUserId(user.uid);

      try {
        setLoading(true);
        setError("");

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

        const progressReference = doc(
          db,
          "users",
          user.uid,
          "progress",
          courseId
        );

        const courseReference = doc(
          db,
          "courses",
          courseId
        );

        const [
          notesSnapshot,
          progressSnapshot,
          courseSnapshot,
        ] = await Promise.all([
          getDocs(notesQuery),
          getDoc(progressReference),
          getDoc(courseReference),
        ]);

        const noteData: Note[] = notesSnapshot.docs.map(
          (noteDocument) => ({
            id: noteDocument.id,
            ...(noteDocument.data() as Omit<Note, "id">),
          })
        );

        setNotes(noteData);

        if (courseSnapshot.exists()) {
          setCourse(courseSnapshot.data() as Course);
        }

        if (progressSnapshot.exists()) {
          const progressData =
            progressSnapshot.data() as CourseProgress;

          setCompletedNoteIds(
            Array.isArray(progressData.completedNoteIds)
              ? progressData.completedNoteIds
              : []
          );
        }
      } catch (caughtError) {
        console.error(caughtError);
        setError("Unable to load course notes and progress.");
      } finally {
        setLoading(false);
      }
    });

    return unsubscribe;
  }, [courseId]);

  function isNoteCompleted(noteId: string) {
    return completedNoteIds.includes(noteId);
  }

  async function openNote(note: Note) {
    setSelectedNote(note);
    setProgressMessage("");

    await saveActivity({
      userId,
      type: "note_opened",
      courseId,
      courseCode: course.code || "",
      courseTitle: course.title || "",
      title: `Opened note: ${note.title}`,
      description: note.description,
    });
  }

  async function toggleNoteCompletion(note: Note) {
    if (!userId) {
      setProgressMessage("Please log in again.");
      return;
    }

    const alreadyCompleted = isNoteCompleted(note.id);

    try {
      setSavingProgress(true);
      setProgressMessage("");

      const progressReference = doc(
        db,
        "users",
        userId,
        "progress",
        courseId
      );

      await setDoc(
        progressReference,
        {
          courseId,
          completedNoteIds: alreadyCompleted
            ? arrayRemove(note.id)
            : arrayUnion(note.id),
          updatedAt: serverTimestamp(),
        },
        { merge: true }
      );

      setCompletedNoteIds((previousIds) => {
        if (alreadyCompleted) {
          return previousIds.filter(
            (completedId) => completedId !== note.id
          );
        }

        return [...previousIds, note.id];
      });

      await saveActivity({
        userId,
        type: alreadyCompleted
          ? "note_uncompleted"
          : "note_completed",
        courseId,
        courseCode: course.code || "",
        courseTitle: course.title || "",
        title: alreadyCompleted
          ? `Marked as incomplete: ${note.title}`
          : `Completed note: ${note.title}`,
        description: note.description,
      });

      setProgressMessage(
        alreadyCompleted
          ? `"${note.title}" marked as not completed.`
          : `"${note.title}" marked as completed.`
      );
    } catch (caughtError) {
      console.error(caughtError);
      setProgressMessage("Unable to update your progress.");
    } finally {
      setSavingProgress(false);
    }
  }

  const completedNotesCount = notes.filter((note) =>
    completedNoteIds.includes(note.id)
  ).length;

  const progressPercentage =
    notes.length > 0
      ? Math.round((completedNotesCount / notes.length) * 100)
      : 0;

  if (loading) {
    return (
      <main className="min-h-screen flex items-center justify-center bg-gray-100">
        <div className="text-center">
          <div className="w-12 h-12 border-4 border-green-700 border-t-transparent rounded-full animate-spin mx-auto" />

          <p className="mt-4 text-gray-600">
            Loading notes and progress...
          </p>
        </div>
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
    const selectedNoteCompleted =
      isNoteCompleted(selectedNote.id);

    return (
      <main className="min-h-screen bg-gray-100 p-6">
        <div className="max-w-3xl mx-auto">
          <button
            type="button"
            onClick={() => {
              setSelectedNote(null);
              setProgressMessage("");
            }}
            className="mb-5 text-green-700 font-semibold"
          >
            ← Back to Notes
          </button>

          <article className="bg-white rounded-2xl shadow-lg p-8">
            <div className="flex flex-wrap items-center justify-between gap-3">
              <div>
                <p className="text-sm text-green-700 font-semibold">
                  Course Note
                </p>

                {course.code && (
                  <p className="text-sm text-gray-500 mt-1">
                    {course.code}
                  </p>
                )}
              </div>

              <span
                className={`text-sm font-semibold px-3 py-1 rounded-full ${
                  selectedNoteCompleted
                    ? "bg-green-100 text-green-800"
                    : "bg-gray-100 text-gray-600"
                }`}
              >
                {selectedNoteCompleted
                  ? "✅ Completed"
                  : "⭕ Not completed"}
              </span>
            </div>

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

            <div className="mt-8 border-t pt-6">
              <button
                type="button"
                onClick={() =>
                  toggleNoteCompletion(selectedNote)
                }
                disabled={savingProgress}
                className={`w-full py-3 rounded-xl font-semibold text-white disabled:bg-gray-400 ${
                  selectedNoteCompleted
                    ? "bg-gray-600"
                    : "bg-green-700"
                }`}
              >
                {savingProgress
                  ? "Saving Progress..."
                  : selectedNoteCompleted
                    ? "Mark as Not Completed"
                    : "Mark as Completed"}
              </button>

              {progressMessage && (
                <p className="text-center text-sm text-green-700 mt-3">
                  {progressMessage}
                </p>
              )}
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
          {course.code && (
            <p className="text-green-100 text-sm">
              {course.code}
            </p>
          )}

          <h1 className="text-3xl font-bold mt-1">
            📖 Course Notes
          </h1>

          <p className="mt-2 text-green-100">
            Select a topic to begin studying.
          </p>

          <div className="mt-6">
            <div className="flex items-center justify-between text-sm">
              <span>
                {completedNotesCount} of {notes.length} topics completed
              </span>

              <span className="font-bold">
                {progressPercentage}%
              </span>
            </div>

            <div className="w-full bg-white/25 rounded-full h-3 mt-2 overflow-hidden">
              <div
                className="bg-white h-3 rounded-full transition-all duration-300"
                style={{
                  width: `${progressPercentage}%`,
                }}
              />
            </div>
          </div>
        </div>

        {progressMessage && (
          <p className="mt-4 text-center text-sm text-green-700 font-medium">
            {progressMessage}
          </p>
        )}

        <div className="mt-6 space-y-4">
          {notes.map((note, index) => {
            const completed = isNoteCompleted(note.id);

            return (
              <div
                key={note.id}
                className={`bg-white rounded-2xl shadow p-6 border-2 ${
                  completed
                    ? "border-green-200"
                    : "border-transparent"
                }`}
              >
                <div className="flex items-start justify-between gap-4">
                  <div>
                    <p className="text-sm text-green-700 font-semibold">
                      Topic {index + 1}
                    </p>

                    <h2 className="text-xl font-bold mt-1">
                      {note.title}
                    </h2>
                  </div>

                  <span
                    className={`text-sm font-semibold px-3 py-1 rounded-full whitespace-nowrap ${
                      completed
                        ? "bg-green-100 text-green-800"
                        : "bg-gray-100 text-gray-600"
                    }`}
                  >
                    {completed ? "✅ Completed" : "⭕ Pending"}
                  </span>
                </div>

                <p className="text-gray-600 mt-2">
                  {note.description}
                </p>

                <div className="flex flex-col sm:flex-row gap-3 mt-4">
                  <button
                    type="button"
                    onClick={() => openNote(note)}
                    className="flex-1 bg-green-700 text-white px-5 py-2 rounded-xl"
                  >
                    {completed ? "Read Again" : "Start Reading"}
                  </button>

                  <button
                    type="button"
                    onClick={() => toggleNoteCompletion(note)}
                    disabled={savingProgress}
                    className={`flex-1 px-5 py-2 rounded-xl font-medium disabled:bg-gray-300 ${
                      completed
                        ? "bg-gray-200 text-gray-700"
                        : "bg-green-100 text-green-800"
                    }`}
                  >
                    {completed
                      ? "Undo Completion"
                      : "Mark Completed"}
                  </button>
                </div>
              </div>
            );
          })}
        </div>
      </div>
    </main>
  );
}