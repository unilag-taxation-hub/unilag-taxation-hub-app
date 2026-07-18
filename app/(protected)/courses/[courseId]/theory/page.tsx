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

interface TheoryQuestion {
  id: string;
  question: string;
  answerGuide: string;
  order: number;
}

export default function TheoryQuestionsPage() {
  const params = useParams<{ courseId: string }>();
  const courseId = params.courseId;

  const [questions, setQuestions] = useState<TheoryQuestion[]>([]);
  const [currentQuestion, setCurrentQuestion] = useState(0);
  const [studentAnswer, setStudentAnswer] = useState("");
  const [showGuide, setShowGuide] = useState(false);
  const [finished, setFinished] = useState(false);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  useEffect(() => {
    async function loadQuestions() {
      try {
        const questionsReference = collection(
          db,
          "courses",
          courseId,
          "theoryQuestions"
        );

        const questionsQuery = query(
          questionsReference,
          orderBy("order", "asc")
        );

        const snapshot = await getDocs(questionsQuery);

        const questionData: TheoryQuestion[] = snapshot.docs.map(
          (questionDocument) => ({
            id: questionDocument.id,
            ...(questionDocument.data() as Omit<TheoryQuestion, "id">),
          })
        );

        setQuestions(questionData);
      } catch (caughtError) {
        console.error(caughtError);
        setError("Unable to load theory questions.");
      } finally {
        setLoading(false);
      }
    }

    if (courseId) {
      loadQuestions();
    }
  }, [courseId]);

  function handleNext() {
    if (!studentAnswer.trim()) {
      alert("Please write your answer.");
      return;
    }

    if (!showGuide) {
      setShowGuide(true);
      return;
    }

    if (currentQuestion === questions.length - 1) {
      setFinished(true);
      return;
    }

    setCurrentQuestion((previous) => previous + 1);
    setStudentAnswer("");
    setShowGuide(false);
  }

  if (loading) {
    return (
      <main className="min-h-screen flex items-center justify-center bg-gray-100">
        <p>Loading theory questions...</p>
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

  if (questions.length === 0) {
    return (
      <main className="min-h-screen flex items-center justify-center bg-gray-100 p-6">
        <div className="bg-white p-8 rounded-2xl shadow text-center">
          <h1 className="text-2xl font-bold">
            No theory questions available
          </h1>

          <p className="mt-2 text-gray-600">
            Questions have not been added to this course yet.
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

  if (finished) {
    return (
      <main className="min-h-screen bg-gray-100 flex items-center justify-center p-6">
        <div className="w-full max-w-lg bg-white rounded-2xl shadow-lg p-8 text-center">
          <h1 className="text-3xl font-bold text-purple-700">
            Theory Practice Completed
          </h1>

          <p className="mt-4 text-gray-600">
            You have completed all theory questions.
          </p>

          <Link
            href={`/courses/${courseId}`}
            className="inline-block mt-6 bg-green-700 text-white px-6 py-3 rounded-xl"
          >
            Back to Course
          </Link>
        </div>
      </main>
    );
  }

  const current = questions[currentQuestion];

  return (
    <main className="min-h-screen bg-gray-100 p-6">
      <div className="max-w-3xl mx-auto">
        <Link
          href={`/courses/${courseId}`}
          className="inline-block mb-5 text-green-700 font-semibold"
        >
          ← Back to Course
        </Link>

        <div className="bg-white rounded-2xl shadow-lg p-8">
          <p className="text-sm text-gray-500">
            Theory Question {currentQuestion + 1} of {questions.length}
          </p>

          <h1 className="text-2xl font-bold mt-4">
            {current.question}
          </h1>

          <textarea
            value={studentAnswer}
            onChange={(event) =>
              setStudentAnswer(event.target.value)
            }
            placeholder="Write your detailed answer here..."
            rows={12}
            className="w-full mt-6 border rounded-xl p-4"
          />

          {showGuide && (
            <div className="mt-5 bg-purple-50 border border-purple-200 rounded-xl p-4">
              <h2 className="font-bold text-purple-700">
                Answer Guide
              </h2>

              <div
  className="rich-text-content mt-3 overflow-x-auto text-gray-700"
  dangerouslySetInnerHTML={{
    __html: current.answerGuide,
  }}
/>
            </div>
          )}

          <button
            onClick={handleNext}
            className="w-full mt-6 bg-purple-600 text-white py-3 rounded-xl font-semibold"
          >
            {!showGuide
              ? "View Answer Guide"
              : currentQuestion === questions.length - 1
              ? "Finish"
              : "Next Question"}
          </button>
        </div>
      </div>
    </main>
  );
}