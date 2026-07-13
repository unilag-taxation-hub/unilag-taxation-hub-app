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

interface GermanQuestion {
  id: string;
  question: string;
  correctAnswer: string;
  explanation?: string;
  order: number;
}

export default function GermanQuestionsPage() {
  const params = useParams<{ courseId: string }>();
  const courseId = params.courseId;

  const [questions, setQuestions] = useState<GermanQuestion[]>([]);
  const [currentQuestion, setCurrentQuestion] = useState(0);
  const [studentAnswer, setStudentAnswer] = useState("");
  const [showAnswer, setShowAnswer] = useState(false);
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
          "germanQuestions"
        );

        const questionsQuery = query(
          questionsReference,
          orderBy("order", "asc")
        );

        const snapshot = await getDocs(questionsQuery);

        const questionData: GermanQuestion[] = snapshot.docs.map(
          (questionDocument) => ({
            id: questionDocument.id,
            ...(questionDocument.data() as Omit<
              GermanQuestion,
              "id"
            >),
          })
        );

        setQuestions(questionData);
      } catch (caughtError) {
        console.error(caughtError);
        setError("Unable to load German questions.");
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
      alert("Please type your answer.");
      return;
    }

    if (!showAnswer) {
      setShowAnswer(true);
      return;
    }

    if (currentQuestion === questions.length - 1) {
      setFinished(true);
      return;
    }

    setCurrentQuestion((previous) => previous + 1);
    setStudentAnswer("");
    setShowAnswer(false);
  }

  if (loading) {
    return (
      <main className="min-h-screen flex items-center justify-center bg-gray-100">
        <p>Loading questions...</p>
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
            No German questions available
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
          <h1 className="text-3xl font-bold text-green-700">
            German Practice Completed
          </h1>

          <p className="mt-4 text-gray-600">
            You have completed all questions.
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
      <div className="max-w-2xl mx-auto">
        <Link
          href={`/courses/${courseId}`}
          className="inline-block mb-5 text-green-700 font-semibold"
        >
          ← Back to Course
        </Link>

        <div className="bg-white rounded-2xl shadow-lg p-8">
          <p className="text-sm text-gray-500">
            Question {currentQuestion + 1} of {questions.length}
          </p>

          <h1 className="text-2xl font-bold mt-4">
            {current.question}
          </h1>

          <textarea
            value={studentAnswer}
            onChange={(event) =>
              setStudentAnswer(event.target.value)
            }
            placeholder="Type your answer here..."
            rows={6}
            className="w-full mt-6 border rounded-xl p-4"
          />

          {showAnswer && (
            <div className="mt-5 bg-yellow-50 border border-yellow-200 rounded-xl p-4">
              <h2 className="font-bold text-yellow-700">
                Model Answer
              </h2>

              <p className="mt-2 text-gray-700">
                {current.correctAnswer}
              </p>

              {current.explanation && (
                <p className="mt-3 text-sm text-gray-600">
                  {current.explanation}
                </p>
              )}
            </div>
          )}

          <button
            onClick={handleNext}
            className="w-full mt-6 bg-yellow-500 text-white py-3 rounded-xl font-semibold"
          >
            {!showAnswer
              ? "Check Answer"
              : currentQuestion === questions.length - 1
              ? "Finish"
              : "Next Question"}
          </button>
        </div>
      </div>
    </main>
  );
}