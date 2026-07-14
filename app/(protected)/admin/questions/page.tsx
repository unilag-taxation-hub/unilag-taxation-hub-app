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

type QuestionType = "german" | "theory";

export default function AddQuestionsPage() {
  const [courses, setCourses] = useState<Course[]>([]);
  const [selectedCourse, setSelectedCourse] = useState("");
  const [questionType, setQuestionType] =
    useState<QuestionType>("german");

  const [question, setQuestion] = useState("");
  const [modelAnswer, setModelAnswer] = useState("");
  const [explanation, setExplanation] = useState("");
  const [answerGuide, setAnswerGuide] = useState("");
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

  function clearQuestionFields() {
    setQuestion("");
    setModelAnswer("");
    setExplanation("");
    setAnswerGuide("");
    setOrder("1");
  }

  async function handleSubmit(
    event: FormEvent<HTMLFormElement>
  ) {
    event.preventDefault();

    setMessage("");
    setSuccess(false);

    const user = auth.currentUser;
    const userEmail = user?.email?.trim().toLowerCase();

    if (!user || userEmail !== ADMIN_EMAIL) {
      setMessage("You are not authorized to add questions.");
      return;
    }

    if (!selectedCourse || !question.trim()) {
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

    if (questionType === "german" && !modelAnswer.trim()) {
      setMessage("Please enter the model answer.");
      return;
    }

    if (questionType === "theory" && !answerGuide.trim()) {
      setMessage("Please enter the answer guide.");
      return;
    }

    try {
      setSaving(true);

      if (questionType === "german") {
        await addDoc(
          collection(
            db,
            "courses",
            selectedCourse,
            "germanQuestions"
          ),
          {
            question: question.trim(),
            correctAnswer: modelAnswer.trim(),
            explanation: explanation.trim(),
            order: orderNumber,
            createdAt: serverTimestamp(),
            createdBy: user.uid,
          }
        );

        setMessage("German question added successfully.");
      } else {
        await addDoc(
          collection(
            db,
            "courses",
            selectedCourse,
            "theoryQuestions"
          ),
          {
            question: question.trim(),
            answerGuide: answerGuide.trim(),
            order: orderNumber,
            createdAt: serverTimestamp(),
            createdBy: user.uid,
          }
        );

        setMessage("Theory question added successfully.");
      }

      clearQuestionFields();
      setSuccess(true);
    } catch (error) {
      console.error(error);
      setMessage("Failed to add question.");
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
            ✍️ Add German or Theory Question
          </h1>

          <p className="mt-2 text-gray-600">
            Select the question type and publish it directly to a course.
          </p>

          <div className="grid grid-cols-2 gap-3 mt-7">
            <button
              type="button"
              onClick={() => {
                setQuestionType("german");
                clearQuestionFields();
                setMessage("");
              }}
              className={`p-3 rounded-xl font-semibold ${
                questionType === "german"
                  ? "bg-yellow-500 text-white"
                  : "bg-gray-200 text-gray-700"
              }`}
            >
              German Question
            </button>

            <button
              type="button"
              onClick={() => {
                setQuestionType("theory");
                clearQuestionFields();
                setMessage("");
              }}
              className={`p-3 rounded-xl font-semibold ${
                questionType === "theory"
                  ? "bg-purple-600 text-white"
                  : "bg-gray-200 text-gray-700"
              }`}
            >
              Theory Question
            </button>
          </div>

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
                placeholder={
                  questionType === "german"
                    ? "Enter the question without options..."
                    : "Enter the theory question..."
                }
                rows={5}
                className="w-full border rounded-xl p-3"
                required
              />
            </div>

            {questionType === "german" ? (
              <>
                <div>
                  <label className="block mb-1 font-medium">
                    Model Answer
                  </label>

                  <textarea
                    value={modelAnswer}
                    onChange={(event) =>
                      setModelAnswer(event.target.value)
                    }
                    placeholder="Enter the expected answer..."
                    rows={6}
                    className="w-full border rounded-xl p-3"
                    required
                  />
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
                    placeholder="Explain the important points students should mention."
                    rows={4}
                    className="w-full border rounded-xl p-3"
                  />
                </div>
              </>
            ) : (
              <div>
                <label className="block mb-1 font-medium">
                  Answer Guide
                </label>

                <textarea
                  value={answerGuide}
                  onChange={(event) =>
                    setAnswerGuide(event.target.value)
                  }
                  placeholder="Enter the major points expected in the answer..."
                  rows={8}
                  className="w-full border rounded-xl p-3"
                  required
                />
              </div>
            )}

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
              className={`w-full text-white py-3 rounded-xl font-semibold disabled:bg-gray-400 ${
                questionType === "german"
                  ? "bg-yellow-500"
                  : "bg-purple-600"
              }`}
            >
              {saving
                ? "Saving Question..."
                : questionType === "german"
                  ? "Add German Question"
                  : "Add Theory Question"}
            </button>
          </form>
        </section>
      </div>
    </main>
  );
}