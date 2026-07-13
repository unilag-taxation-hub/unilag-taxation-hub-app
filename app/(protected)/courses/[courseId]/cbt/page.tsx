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

interface MCQ {
  id: string;
  question: string;
  options: string[];
  correctAnswer: string;
  order: number;
}

export default function CBTPage() {
  const params = useParams<{ courseId: string }>();
  const courseId = params.courseId;

  const [questions, setQuestions] = useState<MCQ[]>([]);
  const [answers, setAnswers] = useState<Record<number, string>>({});
  const [currentQuestion, setCurrentQuestion] = useState(0);
  const [timeLeft, setTimeLeft] = useState(300);
  const [loading, setLoading] = useState(true);
  const [submitted, setSubmitted] = useState(false);
  const [score, setScore] = useState(0);

  useEffect(() => {
    async function loadQuestions() {
      const questionsReference = collection(
        db,
        "courses",
        courseId,
        "mcqs"
      );

      const questionsQuery = query(
        questionsReference,
        orderBy("order", "asc")
      );

      const snapshot = await getDocs(questionsQuery);

      const questionData: MCQ[] = snapshot.docs.map((document) => ({
        id: document.id,
        ...(document.data() as Omit<MCQ, "id">),
      }));

      setQuestions(questionData);
      setLoading(false);
    }

    if (courseId) {
      loadQuestions();
    }
  }, [courseId]);

  useEffect(() => {
    if (submitted || loading) return;

    const timer = setInterval(() => {
      setTimeLeft((previous) => {
        if (previous <= 1) {
          clearInterval(timer);
          submitExam();
          return 0;
        }

        return previous - 1;
      });
    }, 1000);

    return () => clearInterval(timer);
  }, [submitted, loading]);

  function submitExam() {
    let totalScore = 0;

    questions.forEach((question, index) => {
      if (answers[index] === question.correctAnswer) {
        totalScore += 1;
      }
    });

    setScore(totalScore);
    setSubmitted(true);
  }

  function formatTime(seconds: number) {
    const minutes = Math.floor(seconds / 60);
    const remainingSeconds = seconds % 60;

    return `${minutes}:${remainingSeconds
      .toString()
      .padStart(2, "0")}`;
  }

  if (loading) {
    return (
      <main className="min-h-screen flex items-center justify-center bg-gray-100">
        Loading CBT exam...
      </main>
    );
  }

  if (questions.length === 0) {
    return (
      <main className="min-h-screen flex items-center justify-center bg-gray-100 p-6">
        <div className="bg-white p-8 rounded-2xl shadow text-center">
          <h1 className="text-2xl font-bold">
            No CBT questions available
          </h1>

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

  if (submitted) {
    return (
      <main className="min-h-screen bg-gray-100 flex items-center justify-center p-6">
        <div className="w-full max-w-lg bg-white rounded-2xl shadow-lg p-8 text-center">
          <h1 className="text-3xl font-bold text-green-700">
            CBT Completed
          </h1>

          <p className="mt-4 text-xl">
            You scored {score} out of {questions.length}
          </p>

          <p className="mt-2 text-gray-600">
            {Math.round((score / questions.length) * 100)}%
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
        <div className="flex justify-between items-center mb-5">
          <Link
            href={`/courses/${courseId}`}
            className="text-green-700 font-semibold"
          >
            ← Exit Exam
          </Link>

          <div className="bg-red-100 text-red-700 px-4 py-2 rounded-xl font-bold">
            Time: {formatTime(timeLeft)}
          </div>
        </div>

        <div className="bg-white rounded-2xl shadow-lg p-8">
          <p className="text-sm text-gray-500">
            Question {currentQuestion + 1} of {questions.length}
          </p>

          <h1 className="text-2xl font-bold mt-4">
            {current.question}
          </h1>

          <div className="mt-6 space-y-3">
            {current.options.map((option) => (
              <label
                key={option}
                className="flex items-center gap-3 border rounded-xl p-4 cursor-pointer"
              >
                <input
                  type="radio"
                  name={`question-${currentQuestion}`}
                  value={option}
                  checked={answers[currentQuestion] === option}
                  onChange={(event) =>
                    setAnswers({
                      ...answers,
                      [currentQuestion]: event.target.value,
                    })
                  }
                />

                <span>{option}</span>
              </label>
            ))}
          </div>

          <div className="flex gap-3 mt-8">
            <button
              onClick={() =>
                setCurrentQuestion((previous) =>
                  Math.max(previous - 1, 0)
                )
              }
              disabled={currentQuestion === 0}
              className="flex-1 bg-gray-300 py-3 rounded-xl disabled:opacity-50"
            >
              Previous
            </button>

            {currentQuestion === questions.length - 1 ? (
              <button
                onClick={submitExam}
                className="flex-1 bg-red-600 text-white py-3 rounded-xl font-semibold"
              >
                Submit Exam
              </button>
            ) : (
              <button
                onClick={() =>
                  setCurrentQuestion((previous) => previous + 1)
                }
                className="flex-1 bg-green-700 text-white py-3 rounded-xl font-semibold"
              >
                Next
              </button>
            )}
          </div>
        </div>
      </div>
    </main>
  );
}