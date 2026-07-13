"use client";

import { useState } from "react";
import { useParams } from "next/navigation";
import Link from "next/link";

const questions = [
  {
    question:
      "Explain five major objectives of taxation in a modern economy.",
    guide:
      "Your answer should discuss revenue generation, redistribution of income, economic stability, regulation of consumption, and promotion of economic growth.",
  },
  {
    question:
      "Discuss the characteristics of a good tax system.",
    guide:
      "Consider equity, certainty, convenience, economy, simplicity, flexibility, and neutrality.",
  },
];

export default function TheoryQuestionsPage() {
  const params = useParams();
  const courseId = params.courseId as string;

  const [currentQuestion, setCurrentQuestion] = useState(0);
  const [studentAnswer, setStudentAnswer] = useState("");
  const [showGuide, setShowGuide] = useState(false);
  const [finished, setFinished] = useState(false);

  const current = questions[currentQuestion];

  function handleNext() {
    if (!studentAnswer.trim()) {
      alert("Please write your answer before continuing.");
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

  if (finished) {
    return (
      <main className="min-h-screen bg-gray-100 flex items-center justify-center p-6">
        <div className="w-full max-w-lg bg-white rounded-2xl shadow-lg p-8 text-center">
          <h1 className="text-3xl font-bold text-green-700">
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

  return (
    <main className="min-h-screen bg-gray-100 p-6">
      <div className="max-w-3xl mx-auto bg-white rounded-2xl shadow-lg p-8">
        <p className="text-sm text-gray-500">
          Theory Question {currentQuestion + 1} of {questions.length}
        </p>

        <h1 className="text-2xl font-bold mt-4">
          {current.question}
        </h1>

        <textarea
          value={studentAnswer}
          onChange={(event) => setStudentAnswer(event.target.value)}
          placeholder="Write your detailed answer here..."
          rows={12}
          className="w-full mt-6 border rounded-xl p-4 focus:outline-none focus:ring-2 focus:ring-purple-600"
        />

        {showGuide && (
          <div className="mt-5 bg-purple-50 border border-purple-200 rounded-xl p-4">
            <h2 className="font-bold text-purple-700">
              Answer Guide
            </h2>

            <p className="mt-2 text-gray-700">
              {current.guide}
            </p>
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
    </main>
  );
}