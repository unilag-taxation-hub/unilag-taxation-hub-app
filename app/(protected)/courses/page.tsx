"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { onAuthStateChanged } from "firebase/auth";
import {
  collection,
  doc,
  getDoc,
  getDocs,
} from "firebase/firestore";

import { auth, db } from "@/lib/firebase";

interface Course {
  id: string;
  title: string;
  code: string;
  level: string | number;
  semester: string | number;
}

interface StudentProfile {
  level: string | number;
  semester: string | number;
}

function normalizeLevel(value: string | number | undefined) {
  return String(value ?? "")
    .toLowerCase()
    .replace("level", "")
    .trim();
}

function normalizeSemester(
  value: string | number | undefined
) {
  const normalizedValue = String(value ?? "")
    .toLowerCase()
    .trim();

  if (
    normalizedValue === "1" ||
    normalizedValue.includes("first")
  ) {
    return "1";
  }

  if (
    normalizedValue === "2" ||
    normalizedValue.includes("second")
  ) {
    return "2";
  }

  return normalizedValue;
}

function displayLevel(value: string | number) {
  const normalizedLevel = normalizeLevel(value);

  return normalizedLevel
    ? `${normalizedLevel} Level`
    : "Level not assigned";
}

function displaySemester(value: string | number) {
  const normalizedSemester = normalizeSemester(value);

  if (normalizedSemester === "1") {
    return "First Semester";
  }

  if (normalizedSemester === "2") {
    return "Second Semester";
  }

  return "Semester not assigned";
}

export default function CoursesPage() {
  const [courses, setCourses] = useState<Course[]>([]);
  const [studentProfile, setStudentProfile] =
    useState<StudentProfile | null>(null);

  const [loading, setLoading] = useState(true);
  const [message, setMessage] = useState("");

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(
      auth,
      async (user) => {
        if (!user) {
          setMessage(
            "Please log in to view your courses."
          );
          setLoading(false);
          return;
        }

        try {
          setLoading(true);
          setMessage("");

          const userReference = doc(
            db,
            "users",
            user.uid
          );

          const userSnapshot = await getDoc(
            userReference
          );

          if (!userSnapshot.exists()) {
            setMessage(
              "Your academic profile has not been completed. Please update your profile first."
            );
            setLoading(false);
            return;
          }

          const userData =
            userSnapshot.data();

          const profile: StudentProfile = {
            level: userData.level ?? "",
            semester: userData.semester ?? "",
          };

          if (
            !normalizeLevel(profile.level) ||
            !normalizeSemester(profile.semester)
          ) {
            setMessage(
              "Please select your current level and semester on your profile."
            );
            setLoading(false);
            return;
          }

          setStudentProfile(profile);

          const coursesSnapshot =
            await getDocs(
              collection(db, "courses")
            );

          const allCourses: Course[] =
            coursesSnapshot.docs.map(
              (courseDocument) => {
                const courseData =
                  courseDocument.data();

                return {
                  id: courseDocument.id,
                  title:
                    typeof courseData.title ===
                    "string"
                      ? courseData.title
                      : "",
                  code:
                    typeof courseData.code ===
                    "string"
                      ? courseData.code
                      : "",
                  level:
                    courseData.level ?? "",
                  semester:
                    courseData.semester ?? "",
                };
              }
            );

          const studentLevel =
            normalizeLevel(profile.level);

          const studentSemester =
            normalizeSemester(
              profile.semester
            );

          const matchingCourses =
            allCourses.filter((course) => {
              return (
                normalizeLevel(course.level) ===
                  studentLevel &&
                normalizeSemester(
                  course.semester
                ) === studentSemester
              );
            });

          matchingCourses.sort((a, b) =>
            `${a.code} ${a.title}`.localeCompare(
              `${b.code} ${b.title}`
            )
          );

          setCourses(matchingCourses);
        } catch (error) {
          console.error(
            "Unable to load courses:",
            error
          );

          setMessage(
            "Unable to load your courses. Please try again."
          );
        } finally {
          setLoading(false);
        }
      }
    );

    return () => unsubscribe();
  }, []);

  if (loading) {
    return (
      <main className="min-h-screen bg-gray-100 flex items-center justify-center px-4">
        <div className="text-center">
          <div className="w-10 h-10 border-4 border-green-700 border-t-transparent rounded-full animate-spin mx-auto" />

          <p className="mt-3 text-gray-600">
            Loading your courses...
          </p>
        </div>
      </main>
    );
  }

  return (
    <main className="min-h-screen bg-gray-100 px-4 py-8 sm:p-6">
      <div className="max-w-5xl mx-auto">
        <div className="mb-8">
          <p className="text-sm font-semibold uppercase tracking-wide text-green-700">
            UNILAG Taxation Hub
          </p>

          <h1 className="text-3xl font-bold text-gray-950 mt-1">
            My Courses
          </h1>

          {studentProfile && (
            <p className="mt-2 text-gray-600">
              {displayLevel(
                studentProfile.level
              )}{" "}
              •{" "}
              {displaySemester(
                studentProfile.semester
              )}
            </p>
          )}
        </div>

        {message ? (
          <section className="bg-white border border-yellow-200 rounded-2xl shadow-sm p-6 text-center">
            <p className="text-gray-800">
              {message}
            </p>

            <Link
              href="/profile"
              className="inline-block mt-5 bg-green-700 text-white px-5 py-3 rounded-xl font-semibold hover:bg-green-800 transition"
            >
              Update My Profile
            </Link>
          </section>
        ) : courses.length === 0 ? (
          <section className="bg-white rounded-2xl shadow-sm p-8 text-center">
            <h2 className="text-xl font-bold text-gray-950">
              No courses available yet
            </h2>

            <p className="mt-2 text-gray-600">
              Courses have not yet been added
              for your current level and
              semester.
            </p>
          </section>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-5">
            {courses.map((course) => (
              <Link
                key={course.id}
                href={`/courses/${course.id}`}
                className="group block bg-white border border-gray-200 rounded-2xl shadow-sm p-6 hover:border-green-300 hover:shadow-md hover:bg-green-50 transition"
              >
                <div className="flex items-start justify-between gap-4">
                  <div>
                    <p className="text-sm font-bold uppercase tracking-wide text-green-700">
                      {course.code}
                    </p>

                    <h2 className="text-xl font-bold text-gray-950 mt-2 group-hover:text-green-800">
                      {course.title}
                    </h2>
                  </div>

                  <span className="text-green-700 text-xl">
                    →
                  </span>
                </div>

                <p className="text-sm text-gray-600 mt-5">
                  {displayLevel(
                    course.level
                  )}{" "}
                  •{" "}
                  {displaySemester(
                    course.semester
                  )}
                </p>

                <p className="mt-4 text-sm font-semibold text-green-700">
                  Open course
                </p>
              </Link>
            ))}
          </div>
        )}
      </div>
    </main>
  );
}