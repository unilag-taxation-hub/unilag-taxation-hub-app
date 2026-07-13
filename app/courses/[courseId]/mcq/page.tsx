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
  explanation?: string;
  order: number;
}

export default function MCQPage() {
  const params = useParams<{ courseId: string }>();
  const courseId = params.courseId;

  const [questions, setQuestions] = useState<MCQ[]>([]);
  const [currentQuestion, setCurrentQuestion] = useState(0);
  const [selectedAnswer, setSelectedAnswer] = useState("");
  const [score, setScore] = useState(0);
  const [finished, setFinished] = useState(false);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  useEffect(() => {
    async function loadQuestions() {
      try {
        setLoading(true);
        setError("");

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

        const questionData: MCQ[] = snapshot.docs.map((questionDocument) => ({
          id: questionDocument.id,
          ...(questionDocument.data() as Omit<MCQ, "id">),
        }));

        setQuestions(questionData);
      } catch (caughtError) {
        console.error(caughtError);
        setError("Unable to load MCQ questions.");
      } finally {
        setLoading(false);
      }
    }

    if (courseId) {
      loadQuestions();
    }
  }, [courseId]);

  function handleNext() {
    if (!selectedAnswer) {
      alert("Please select an answer.");
      return;
    }

    const isCorrect =
      selectedAnswer === questions[currentQuestion].correctAnswer;

    if (isCorrect) {
      setScore((previousScore) => previousScore + 1);
    }

    if (currentQuestion === questions.length - 1) {
      setFinished(true);
      return;
    }

    setCurrentQuestion((previousQuestion) => previousQuestion + 1);
    setSelectedAnswer("");
  }

  if (loading) {
    return (
      <main className="min-h-screen flex items-center justify-center bg-gray-100">
        <p className="text-lg font-medium">Loading questions...</p>
      </main>
    );
  }

  if (error) {
    return (
      <main className="min-h-screen flex items-center justify-center bg-gray-100 p-6">
        <div className="bg-white rounded-2xl shadow p-8 text-center">
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
        <div className="bg-white rounded-2xl shadow p-8 text-center">
          <h1 className="text-2xl font-bold">No MCQs available</h1>

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
            MCQ Completed
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

          <div className="mt-6 space-y-3">
            {current.options.map((option) => (
              <label
                key={option}
                className="flex items-center gap-3 border rounded-xl p-4 cursor-pointer hover:bg-gray-50"
              >
                <input
                  type="radio"
                  name="answer"
                  value={option}
                  checked={selectedAnswer === option}
                  onChange={(event) =>
                    setSelectedAnswer(event.target.value)
                  }
                />

                <span>{option}</span>
              </label>
            ))}
          </div>

          <button
            onClick={handleNext}
            className="w-full mt-6 bg-green-700 text-white py-3 rounded-xl font-semibold"
          >
            {currentQuestion === questions.length - 1
              ? "Submit"
              : "Next Question"}
          </button>
        </div>
      </div>
    </main>
  );
}