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

export default function AddMCQPage() {
  const [courses, setCourses] = useState<Course[]>([]);
  const [selectedCourse, setSelectedCourse] = useState("");

  const [question, setQuestion] = useState("");
  const [optionA, setOptionA] = useState("");
  const [optionB, setOptionB] = useState("");
  const [optionC, setOptionC] = useState("");
  const [optionD, setOptionD] = useState("");
  const [correctAnswer, setCorrectAnswer] = useState("A");
  const [explanation, setExplanation] = useState("");
  const [order, setOrder] = useState("1");

  const [loadingCourses, setLoadingCourses] = useState(true);
  const [saving, setSaving] = useState(false);
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
      setMessage("You are not authorized to add MCQs.");
      return;
    }

    if (
      !selectedCourse ||
      !question.trim() ||
      !optionA.trim() ||
      !optionB.trim() ||
      !optionC.trim() ||
      !optionD.trim()
    ) {
      setMessage("Please complete all required fields.");
      return;
    }

    const orderNumber = Number(order);

    if (!Number.isInteger(orderNumber) || orderNumber < 1) {
      setMessage(
        "Question order must be a whole number starting from 1."
      );
      return;
    }

    const options = [
      optionA.trim(),
      optionB.trim(),
      optionC.trim(),
      optionD.trim(),
    ];

    const answerPositions: Record<string, number> = {
      A: 0,
      B: 1,
      C: 2,
      D: 3,
    };

    const selectedCorrectAnswer =
      options[answerPositions[correctAnswer]];

    try {
      setSaving(true);

      await addDoc(
        collection(db, "courses", selectedCourse, "mcqs"),
        {
          question: question.trim(),
          options,
          correctAnswer: selectedCorrectAnswer,
          explanation: explanation.trim(),
          order: orderNumber,
          createdAt: serverTimestamp(),
          createdBy: user.uid,
        }
      );

      setQuestion("");
      setOptionA("");
      setOptionB("");
      setOptionC("");
      setOptionD("");
      setCorrectAnswer("A");
      setExplanation("");
      setOrder("1");

      setMessage("MCQ added successfully.");
      setSuccess(true);
    } catch (error) {
      console.error(error);
      setMessage("Failed to add MCQ.");
      setSuccess(false);
    } finally {
      setSaving(false);
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
            📝 Add MCQ
          </h1>

          <p className="mt-2 text-gray-600">
            Select a course and add a multiple-choice question.
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
                Question
              </label>

              <textarea
                value={question}
                onChange={(event) =>
                  setQuestion(event.target.value)
                }
                placeholder="Enter the MCQ here..."
                rows={4}
                className="w-full border rounded-xl p-3"
                required
              />
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="block mb-1 font-medium">
                  Option A
                </label>

                <input
                  type="text"
                  value={optionA}
                  onChange={(event) =>
                    setOptionA(event.target.value)
                  }
                  className="w-full border rounded-xl p-3"
                  required
                />
              </div>

              <div>
                <label className="block mb-1 font-medium">
                  Option B
                </label>

                <input
                  type="text"
                  value={optionB}
                  onChange={(event) =>
                    setOptionB(event.target.value)
                  }
                  className="w-full border rounded-xl p-3"
                  required
                />
              </div>

              <div>
                <label className="block mb-1 font-medium">
                  Option C
                </label>

                <input
                  type="text"
                  value={optionC}
                  onChange={(event) =>
                    setOptionC(event.target.value)
                  }
                  className="w-full border rounded-xl p-3"
                  required
                />
              </div>

              <div>
                <label className="block mb-1 font-medium">
                  Option D
                </label>

                <input
                  type="text"
                  value={optionD}
                  onChange={(event) =>
                    setOptionD(event.target.value)
                  }
                  className="w-full border rounded-xl p-3"
                  required
                />
              </div>
            </div>

            <div>
              <label className="block mb-1 font-medium">
                Correct Answer
              </label>

              <select
                value={correctAnswer}
                onChange={(event) =>
                  setCorrectAnswer(event.target.value)
                }
                className="w-full border rounded-xl p-3 bg-white"
              >
                <option value="A">Option A</option>
                <option value="B">Option B</option>
                <option value="C">Option C</option>
                <option value="D">Option D</option>
              </select>
            </div>

            <div>
              <label className="block mb-1 font-medium">
                Explanation (Optional)
              </label>

              <textarea
                value={explanation}
                onChange={(event) =>
                  setExplanation(event.target.value)
                }
                placeholder="Explain why the selected answer is correct."
                rows={4}
                className="w-full border rounded-xl p-3"
              />
            </div>

            <div>
              <label className="block mb-1 font-medium">
                Question Order
              </label>

              <input
                type="number"
                min="1"
                step="1"
                value={order}
                onChange={(event) =>
                  setOrder(event.target.value)
                }
                className="w-full border rounded-xl p-3"
                required
              />
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
              disabled={saving || courses.length === 0}
              className="w-full bg-green-700 text-white py-3 rounded-xl font-semibold disabled:bg-gray-400"
            >
              {saving ? "Adding MCQ..." : "Add MCQ"}
            </button>
          </form>
        </section>
      </div>
    </main>
  );
}