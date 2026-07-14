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
  level: string;
  semester: string;
  description: string;
}

export default function ManageCoursesPage() {
  const [title, setTitle] = useState("");
  const [code, setCode] = useState("");
  const [level, setLevel] = useState("200 LEVEL");
  const [semester, setSemester] = useState("First Semester");
  const [description, setDescription] = useState("");

  const [courses, setCourses] = useState<Course[]>([]);
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState("");
  const [success, setSuccess] = useState(false);

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
        `${a.code} ${a.title}`.localeCompare(`${b.code} ${b.title}`)
      );

      setCourses(courseData);
    } catch (error) {
      console.error(error);
      setMessage("Unable to load courses.");
      setSuccess(false);
    }
  }

  useEffect(() => {
    loadCourses();
  }, []);

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();

    setMessage("");
    setSuccess(false);

    const user = auth.currentUser;
    const userEmail = user?.email?.trim().toLowerCase();

    if (!user || userEmail !== ADMIN_EMAIL) {
      setMessage("You are not authorized to add courses.");
      return;
    }

    if (!title.trim() || !code.trim() || !description.trim()) {
      setMessage("Please complete all required fields.");
      return;
    }

    try {
      setLoading(true);

      await addDoc(collection(db, "courses"), {
        title: title.trim(),
        code: code.trim().toUpperCase(),
        level,
        semester,
        description: description.trim(),
        createdAt: serverTimestamp(),
        createdBy: user.uid,
      });

      setTitle("");
      setCode("");
      setDescription("");

      setMessage("Course added successfully.");
      setSuccess(true);

      await loadCourses();
    } catch (error) {
      console.error(error);
      setMessage("Failed to add course.");
      setSuccess(false);
    } finally {
      setLoading(false);
    }
  }

  return (
    <main className="min-h-screen bg-gray-100 p-6">
      <div className="max-w-5xl mx-auto">
        <Link
          href="/admin"
          className="inline-block mb-6 text-green-700 font-semibold"
        >
          ← Back to Admin Dashboard
        </Link>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          <section className="bg-white rounded-2xl shadow p-7">
            <h1 className="text-3xl font-bold text-green-700">
              Add Course
            </h1>

            <p className="mt-2 text-gray-600">
              Create a new course for students.
            </p>

            <form onSubmit={handleSubmit} className="mt-7 space-y-4">
              <div>
                <label className="block mb-1 font-medium">
                  Course Title
                </label>

                <input
                  type="text"
                  value={title}
                  onChange={(event) => setTitle(event.target.value)}
                  placeholder="Example: Business Taxation"
                  className="w-full border rounded-xl p-3"
                  required
                />
              </div>

              <div>
                <label className="block mb-1 font-medium">
                  Course Code
                </label>

                <input
                  type="text"
                  value={code}
                  onChange={(event) => setCode(event.target.value)}
                  placeholder="Example: TAX-CM 223"
                  className="w-full border rounded-xl p-3"
                  required
                />
              </div>

              <div>
                <label className="block mb-1 font-medium">
                  Level
                </label>

                <select
                  value={level}
                  onChange={(event) => setLevel(event.target.value)}
                  className="w-full border rounded-xl p-3 bg-white"
                >
                  <option value="100 LEVEL">100 LEVEL</option>
                  <option value="200 LEVEL">200 LEVEL</option>
                  <option value="300 LEVEL">300 LEVEL</option>
                  <option value="400 LEVEL">400 LEVEL</option>
                </select>
              </div>

              <div>
                <label className="block mb-1 font-medium">
                  Semester
                </label>

                <select
                  value={semester}
                  onChange={(event) => setSemester(event.target.value)}
                  className="w-full border rounded-xl p-3 bg-white"
                >
                  <option value="First Semester">
                    First Semester
                  </option>

                  <option value="Second Semester">
                    Second Semester
                  </option>
                </select>
              </div>

              <div>
                <label className="block mb-1 font-medium">
                  Description
                </label>

                <textarea
                  value={description}
                  onChange={(event) =>
                    setDescription(event.target.value)
                  }
                  placeholder="Brief course description"
                  rows={5}
                  className="w-full border rounded-xl p-3"
                  required
                />
              </div>

              {message && (
                <p
                  className={`text-sm text-center font-medium ${
                    success ? "text-green-700" : "text-red-600"
                  }`}
                >
                  {message}
                </p>
              )}

              <button
                type="submit"
                disabled={loading}
                className="w-full bg-green-700 text-white py-3 rounded-xl font-semibold disabled:bg-gray-400"
              >
                {loading ? "Adding Course..." : "Add Course"}
              </button>
            </form>
          </section>

          <section className="bg-white rounded-2xl shadow p-7">
            <h2 className="text-2xl font-bold">
              Existing Courses
            </h2>

            <p className="mt-2 text-gray-600">
              Courses currently available on the platform.
            </p>

            <div className="mt-5 space-y-4">
              {courses.length === 0 ? (
                <p className="text-gray-500">
                  No courses found.
                </p>
              ) : (
                courses.map((course) => (
                  <div
                    key={course.id}
                    className="border rounded-xl p-4"
                  >
                    <p className="font-bold text-green-700">
                      {course.code}
                    </p>

                    <h3 className="font-semibold mt-1">
                      {course.title}
                    </h3>

                    <p className="text-sm text-gray-500 mt-1">
                      {course.level} • {course.semester}
                    </p>

                    {course.description && (
                      <p className="text-sm text-gray-600 mt-2">
                        {course.description}
                      </p>
                    )}
                  </div>
                ))
              )}
            </div>
          </section>
        </div>
      </div>
    </main>
  );
}