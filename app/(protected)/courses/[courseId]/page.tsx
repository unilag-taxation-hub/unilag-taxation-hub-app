"use client";

import { useEffect, useState } from "react";
import { useParams } from "next/navigation";
import { doc, getDoc } from "firebase/firestore";
import { db } from "@/lib/firebase";
import Link from "next/link";

interface Course {
  title: string;
  code: string;
  level: string;
  semester: string;
  description: string;
}

export default function CourseDetailsPage() {
  const params = useParams();
  const courseId = params.courseId as string;

  const [course, setCourse] = useState<Course | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  useEffect(() => {
    async function loadCourse() {
      try {
        const courseReference = doc(db, "courses", courseId);
        const courseDocument = await getDoc(courseReference);

        if (courseDocument.exists()) {
          setCourse(courseDocument.data() as Course);
        } else {
          setError("Course not found.");
        }
      } catch {
        setError("Unable to load this course.");
      } finally {
        setLoading(false);
      }
    }

    if (courseId) {
      loadCourse();
    }
  }, [courseId]);

  if (loading) {
    return (
      <main className="min-h-screen flex items-center justify-center">
        Loading course...
      </main>
    );
  }

  if (error || !course) {
    return (
      <main className="min-h-screen flex items-center justify-center">
        <p className="text-red-600">{error || "Course not found."}</p>
      </main>
    );
  }

  return (
    <main className="min-h-screen bg-gray-100 p-6">
      <div className="max-w-3xl mx-auto">
        <Link
          href="/courses"
          className="inline-block mb-5 text-green-700 font-semibold"
        >
          ← Back to My Courses
        </Link>

        <div className="bg-white rounded-2xl shadow-lg p-8">
          <h1 className="text-3xl font-bold text-green-700">
            {course.code}
          </h1>

          <h2 className="text-2xl font-semibold mt-2">
            {course.title}
          </h2>

          <p className="text-gray-500 mt-2">
            {course.level} • {course.semester}
          </p>

          <p className="mt-6 text-gray-700">
            {course.description}
          </p>

          <div className="grid gap-4 mt-8">
            <Link
              href={`/courses/${courseId}/notes`}
              className="bg-green-700 text-white p-4 rounded-xl text-center font-semibold"
            >
              📖 Notes
            </Link>

            <Link
              href={`/courses/${courseId}/mcq`}
              className="bg-blue-600 text-white p-4 rounded-xl text-center font-semibold"
            >
              📝 MCQ Practice
            </Link>

            <Link
              href={`/courses/${courseId}/german`}
              className="bg-yellow-500 text-white p-4 rounded-xl text-center font-semibold"
            >
              ✍️ German Questions
            </Link>

            <Link
              href={`/courses/${courseId}/theory`}
              className="bg-purple-600 text-white p-4 rounded-xl text-center font-semibold"
            >
              📚 Theory Questions
            </Link>

            <Link
              href={`/courses/${courseId}/cbt`}
              className="bg-red-600 text-white p-4 rounded-xl text-center font-semibold"
            >
              🎯 Take CBT Exam
            </Link>
          </div>
        </div>
      </div>
    </main>
  );
}