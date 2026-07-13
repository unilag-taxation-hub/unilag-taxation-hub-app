"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { collection, getDocs } from "firebase/firestore";
import { db } from "@/lib/firebase";

interface Course {
  id: string;
  title: string;
  code: string;
  level: string;
  semester: string;
}

export default function CoursesPage() {
  const [courses, setCourses] = useState<Course[]>([]);

  useEffect(() => {
    async function fetchCourses() {
      const querySnapshot = await getDocs(collection(db, "courses"));

      const data = querySnapshot.docs.map((doc) => ({
        id: doc.id,
        ...(doc.data() as Omit<Course, "id">),
      }));

      setCourses(data);
    }

    fetchCourses();
  }, []);

  return (
    <main className="min-h-screen bg-gray-100 p-6">

      <h1 className="text-3xl font-bold text-green-700 mb-6">
        My Courses
      </h1>

      <div className="space-y-4">

        {courses.map((course) => (
          <Link
            key={course.id}
            href={`/courses/${course.id}`}
            className="block bg-white rounded-xl shadow p-5 hover:bg-green-50"
          >
            <h2 className="text-xl font-bold">
              {course.code}
            </h2>

            <p>{course.title}</p>

            <p className="text-gray-500 text-sm">
              {course.level} • {course.semester}
            </p>
          </Link>
        ))}

      </div>

    </main>
  );
}