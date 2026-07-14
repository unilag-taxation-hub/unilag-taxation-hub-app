"use client";

import { FormEvent, useEffect, useState } from "react";
import Link from "next/link";
import {
  addDoc,
  collection,
  getDocs,
  serverTimestamp,
} from "firebase/firestore";
import { auth, db } from "@/lib/firebase";

const ADMIN_EMAIL = "problematitzbest@gmail.com";

interface Course {
  id: string;
  title: string;
  code: string;
}

export default function AddNotesPage() {
  const [courses, setCourses] = useState<Course[]>([]);
  const [selectedCourse, setSelectedCourse] = useState("");

  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [content, setContent] = useState("");
  const [order, setOrder] = useState("1");

  const [loadingCourses, setLoadingCourses] = useState(true);
  const [publishing, setPublishing] = useState(false);
  const [message, setMessage] = useState("");
  const [success, setSuccess] = useState(false);

  useEffect(() => {
    async function loadCourses() {
      try {
        const snapshot = await getDocs(collection(db, "courses"));

        const courseData: Course[] = snapshot.docs.map(
          (courseDocument) => ({
            id: courseDocument.id,
            ...(courseDocument.data() as Omit<Course, "id">),
          })
        );

        courseData.sort((a, b) =>
          `${a.code} ${a.title}`.localeCompare(
            `${b.code} ${b.title}`
          )
        );

        setCourses(courseData);

        if (courseData.length > 0) {
          setSelectedCourse(courseData[0].id);
        }
      } catch (error) {
        console.error(error);
        setMessage("Unable to load courses.");
        setSuccess(false);
      } finally {
        setLoadingCourses(false);
      }
    }

    loadCourses();
  }, []);

  async function handleSubmit(
    event: FormEvent<HTMLFormElement>
  ) {
    event.preventDefault();

    setMessage("");
    setSuccess(false);

    const user = auth.currentUser;
    const userEmail = user?.email?.trim().toLowerCase();

    if (!user || userEmail !== ADMIN_EMAIL) {
      setMessage("You are not authorized to publish notes.");
      return;
    }

    if (
      !selectedCourse ||
      !title.trim() ||
      !description.trim() ||
      !content.trim()
    ) {
      setMessage("Please complete all required fields.");
      return;
    }

    const orderNumber = Number(order);

    if (!Number.isInteger(orderNumber) || orderNumber < 1) {
      setMessage(
        "Topic order must be a whole number starting from 1."
      );
      return;
    }

    try {
      setPublishing(true);

      await addDoc(
        collection(db, "courses", selectedCourse, "notes"),
        {
          title: title.trim(),
          description: description.trim(),
          content: content.trim(),
          order: orderNumber,
          createdAt: serverTimestamp(),
          createdBy: user.uid,
        }
      );

      setTitle("");
      setDescription("");
      setContent("");
      setOrder("1");

      setMessage("Note published successfully.");
      setSuccess(true);
    } catch (error) {
      console.error(error);
      setMessage("Failed to publish note.");
      setSuccess(false);
    } finally {
      setPublishing(false);
    }
  }

  return (
    <main className="min-h-screen bg-gray-100 p-6">
      <div className="max-w-3xl mx-auto">
        <Link
          href="/admin"
          className="inline-block mb-6 text-green-700 font-semibold"
        >
          ← Back to Admin Dashboard
        </Link>

        <section className="bg-white rounded-2xl shadow-lg p-7">
          <h1 className="text-3xl font-bold text-green-700">
            📖 Add Course Note
          </h1>

          <p className="mt-2 text-gray-600">
            Select a course and publish a new study note directly to
            Firestore.
          </p>

          <form onSubmit={handleSubmit} className="mt-7 space-y-5">
            <div>
              <label className="block mb-1 font-medium">
                Select Course
              </label>

              {loadingCourses ? (
                <p className="text-gray-500">
                  Loading courses...
                </p>
              ) : courses.length === 0 ? (
                <p className="text-red-600">
                  No courses found. Add a course first.
                </p>
              ) : (
                <select
                  value={selectedCourse}
                  onChange={(event) =>
                    setSelectedCourse(event.target.value)
                  }
                  className="w-full border rounded-xl p-3 bg-white"
                >
                  {courses.map((course) => (
                    <option key={course.id} value={course.id}>
                      {course.code} — {course.title}
                    </option>
                  ))}
                </select>
              )}
            </div>

            <div>
              <label className="block mb-1 font-medium">
                Note Title
              </label>

              <input
                type="text"
                value={title}
                onChange={(event) => setTitle(event.target.value)}
                placeholder="Example: Meaning and Purpose of Taxation"
                className="w-full border rounded-xl p-3"
                required
              />
            </div>

            <div>
              <label className="block mb-1 font-medium">
                Short Description
              </label>

              <textarea
                value={description}
                onChange={(event) =>
                  setDescription(event.target.value)
                }
                placeholder="Briefly describe what this topic covers."
                rows={3}
                className="w-full border rounded-xl p-3"
                required
              />
            </div>

            <div>
              <label className="block mb-1 font-medium">
                Full Note Content
              </label>

              <textarea
                value={content}
                onChange={(event) =>
                  setContent(event.target.value)
                }
                placeholder="Write or paste the complete study note here..."
                rows={16}
                className="w-full border rounded-xl p-3"
                required
              />
            </div>

            <div>
              <label className="block mb-1 font-medium">
                Topic Order
              </label>

              <input
                type="number"
                min="1"
                step="1"
                value={order}
                onChange={(event) => setOrder(event.target.value)}
                className="w-full border rounded-xl p-3"
                required
              />

              <p className="mt-1 text-sm text-gray-500">
                Use 1 for the first topic, 2 for the second topic,
                and so on.
              </p>
            </div>

            {message && (
              <p
                className={`text-center font-medium ${
                  success ? "text-green-700" : "text-red-600"
                }`}
              >
                {message}
              </p>
            )}

            <button
              type="submit"
              disabled={publishing || courses.length === 0}
              className="w-full bg-green-700 text-white py-3 rounded-xl font-semibold disabled:bg-gray-400"
            >
              {publishing ? "Publishing Note..." : "Publish Note"}
            </button>
          </form>
        </section>
      </div>
    </main>
  );
}