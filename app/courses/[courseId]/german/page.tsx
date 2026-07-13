"use client";

import { useState } from "react";
import { useParams } from "next/navigation";
import Link from "next/link";

const questions = [
  {
    question: "What is taxation?",
    answer:
      "Taxation is a compulsory levy imposed by government on individuals and businesses to raise revenue and achieve economic or social objectives.",
  },
  {
    question: "State one major purpose of taxation.",
    answer:
      "One major purpose of taxation is to raise revenue for government expenditure.",
  },
];

export default function GermanQuestionsPage() {
  const params = useParams();
  const courseId = params.courseId as string;

  const [currentQuestion, setCurrentQuestion] = useState(0);
  const [studentAnswer, setStudentAnswer] = useState("");
  const [showAnswer, setShowAnswer] = useState(false);
  const [finished, setFinished] = useState(false);

  const current = questions[currentQuestion];

  function handleNext() {
    if (!studentAnswer.trim()) {
      alert("Please enter your answer.");
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

  if (finished) {
    return (
      <main className="min-h-screen bg-gray-100 flex items-center justify-center p-6">
        <div className="w-full max-w-lg bg-white rounded-2xl shadow-lg p-8 text-center">
          <h1 className="text-3xl font-bold text-green-700">
            German Practice Completed
          </h1>

          <p className="mt-4 text-gray-600">
            You have completed all short-answer questions.
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
      <div className="max-w-2xl mx-auto bg-white rounded-2xl shadow-lg p-8">
        <p className="text-sm text-gray-500">
          Question {currentQuestion + 1} of {questions.length}
        </p>

        <h1 className="text-2xl font-bold mt-4">
          {current.question}
        </h1>

        <textarea
          value={studentAnswer}
          onChange={(event) => setStudentAnswer(event.target.value)}
          placeholder="Type your answer here..."
          rows={6}
          className="w-full mt-6 border rounded-xl p-4 focus:outline-none focus:ring-2 focus:ring-green-600"
        />

        {showAnswer && (
          <div className="mt-5 bg-green-50 border border-green-200 rounded-xl p-4">
            <h2 className="font-bold text-green-700">
              Model Answer
            </h2>

            <p className="mt-2 text-gray-700">
              {current.answer}
            </p>
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
    </main>
  );
}