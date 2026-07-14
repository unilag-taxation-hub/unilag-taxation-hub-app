"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { useParams } from "next/navigation";
import Link from "next/link";
import { onAuthStateChanged } from "firebase/auth";
import {
  addDoc,
  collection,
  doc,
  getDoc,
  getDocs,
  orderBy,
  query,
  serverTimestamp,
} from "firebase/firestore";
import { auth, db } from "@/lib/firebase";
import { saveActivity } from "@/lib/activity";

interface MCQ {
  id: string;
  question: string;
  options: string[];
  correctAnswer: string;
  explanation?: string;
  order: number;
}

interface Course {
  title?: string;
  code?: string;
}

export default function CBTPage() {
  const params = useParams<{ courseId: string }>();
  const courseId = params.courseId;

  const [questions, setQuestions] = useState<MCQ[]>([]);
  const [answers, setAnswers] = useState<Record<number, string>>({});
  const [currentQuestion, setCurrentQuestion] = useState(0);
  const [timeLeft, setTimeLeft] = useState(300);

  const [userId, setUserId] = useState("");
  const [course, setCourse] = useState<Course>({});

  const [loading, setLoading] = useState(true);
  const [submitted, setSubmitted] = useState(false);
  const [savingResult, setSavingResult] = useState(false);
  const [score, setScore] = useState(0);
  const [resultSaved, setResultSaved] = useState(false);
  const [showReview, setShowReview] = useState(false);
  const [error, setError] = useState("");

  const answersReference = useRef<Record<number, string>>({});
  const questionsReference = useRef<MCQ[]>([]);
  const submittingReference = useRef(false);

  useEffect(() => {
    answersReference.current = answers;
  }, [answers]);

  useEffect(() => {
    questionsReference.current = questions;
  }, [questions]);

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, async (user) => {
      if (!user) {
        setError("Please log in to take this CBT exam.");
        setLoading(false);
        return;
      }

      setUserId(user.uid);

      try {
        setLoading(true);
        setError("");

        const questionsQuery = query(
          collection(db, "courses", courseId, "mcqs"),
          orderBy("order", "asc")
        );

        const [questionsSnapshot, courseSnapshot] = await Promise.all([
          getDocs(questionsQuery),
          getDoc(doc(db, "courses", courseId)),
        ]);

        const questionData: MCQ[] = questionsSnapshot.docs.map(
          (questionDocument) => ({
            id: questionDocument.id,
            ...(questionDocument.data() as Omit<MCQ, "id">),
          })
        );

        setQuestions(questionData);

        if (courseSnapshot.exists()) {
          setCourse(courseSnapshot.data() as Course);
        }
      } catch (caughtError) {
        console.error(caughtError);
        setError("Unable to load the CBT exam.");
      } finally {
        setLoading(false);
      }
    });

    return unsubscribe;
  }, [courseId]);

  const submitExam = useCallback(async () => {
    if (
      submittingReference.current ||
      submitted ||
      !userId ||
      questionsReference.current.length === 0
    ) {
      return;
    }

    submittingReference.current = true;
    setSavingResult(true);

    const currentQuestions = questionsReference.current;
    const currentAnswers = answersReference.current;

    let totalScore = 0;

    currentQuestions.forEach((question, index) => {
      if (currentAnswers[index] === question.correctAnswer) {
        totalScore += 1;
      }
    });

    const totalQuestions = currentQuestions.length;

    const percentage = Math.round(
      (totalScore / totalQuestions) * 100
    );

    const answeredQuestions = Object.keys(currentAnswers).length;
    const timeUsed = 300 - timeLeft;

    setScore(totalScore);
    setSubmitted(true);

    try {
      await addDoc(
        collection(db, "users", userId, "cbtAttempts"),
        {
          courseId,
          courseCode: course.code || "",
          courseTitle: course.title || "",
          score: totalScore,
          totalQuestions,
          percentage,
          answeredQuestions,
          timeAllowed: 300,
          timeUsed,
          submittedAt: serverTimestamp(),
        }
      );

      setResultSaved(true);

      await saveActivity({
        userId,
        type: "cbt_completed",
        courseId,
        courseCode: course.code || "",
        courseTitle: course.title || "",
        title: `Completed CBT: ${
          course.title || course.code || "Course examination"
        }`,
        description: `Scored ${totalScore} out of ${totalQuestions} (${percentage}%).`,
        percentage,
        score: totalScore,
        totalQuestions,
      });
    } catch (caughtError) {
      console.error(caughtError);
      setResultSaved(false);
    } finally {
      setSavingResult(false);
      submittingReference.current = false;
    }
  }, [
    course.code,
    course.title,
    courseId,
    submitted,
    timeLeft,
    userId,
  ]);

  useEffect(() => {
    if (
      submitted ||
      loading ||
      questions.length === 0 ||
      !userId
    ) {
      return;
    }

    const timer = window.setInterval(() => {
      setTimeLeft((previousTime) => {
        if (previousTime <= 1) {
          window.clearInterval(timer);

          setTimeout(() => {
            submitExam();
          }, 0);

          return 0;
        }

        return previousTime - 1;
      });
    }, 1000);

    return () => window.clearInterval(timer);
  }, [
    loading,
    questions.length,
    submitExam,
    submitted,
    userId,
  ]);

  function formatTime(seconds: number) {
    const minutes = Math.floor(seconds / 60);
    const remainingSeconds = seconds % 60;

    return `${minutes}:${remainingSeconds
      .toString()
      .padStart(2, "0")}`;
  }

  function selectAnswer(option: string) {
    setAnswers((previousAnswers) => ({
      ...previousAnswers,
      [currentQuestion]: option,
    }));
  }

  function restartExam() {
    submittingReference.current = false;
    setAnswers({});
    setCurrentQuestion(0);
    setTimeLeft(300);
    setScore(0);
    setSubmitted(false);
    setSavingResult(false);
    setResultSaved(false);
    setShowReview(false);
  }

  if (loading) {
    return (
      <main className="min-h-screen flex items-center justify-center bg-gray-100">
        <div className="text-center">
          <div className="w-12 h-12 border-4 border-green-700 border-t-transparent rounded-full animate-spin mx-auto" />

          <p className="mt-4 text-gray-600">
            Loading CBT exam...
          </p>
        </div>
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
            No CBT questions available
          </h1>

          <p className="mt-2 text-gray-600">
            MCQs have not been added to this course yet.
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

  if (submitted && showReview) {
    return (
      <main className="min-h-screen bg-gray-100 p-6">
        <div className="max-w-3xl mx-auto">
          <button
            type="button"
            onClick={() => setShowReview(false)}
            className="text-green-700 font-semibold mb-5"
          >
            ← Back to Result
          </button>

          <div className="bg-green-700 text-white rounded-2xl p-6">
            <p className="text-green-100 text-sm">
              {course.code || "CBT Examination"}
            </p>

            <h1 className="text-3xl font-bold mt-1">
              📝 Answer Review
            </h1>

            <p className="mt-2 text-green-100">
              You scored {score} out of {questions.length}. Review
              your answers below.
            </p>
          </div>

          <div className="mt-6 space-y-5">
            {questions.map((question, index) => {
              const studentAnswer = answers[index];
              const isCorrect =
                studentAnswer === question.correctAnswer;

              return (
                <div
                  key={question.id}
                  className={`bg-white rounded-2xl shadow p-6 border-2 ${
                    isCorrect
                      ? "border-green-200"
                      : "border-red-200"
                  }`}
                >
                  <div className="flex items-start justify-between gap-4">
                    <p className="text-sm font-semibold text-gray-500">
                      Question {index + 1}
                    </p>

                    <span
                      className={`text-sm font-semibold px-3 py-1 rounded-full ${
                        isCorrect
                          ? "bg-green-100 text-green-800"
                          : "bg-red-100 text-red-700"
                      }`}
                    >
                      {isCorrect ? "✓ Correct" : "✕ Incorrect"}
                    </span>
                  </div>

                  <h2 className="text-xl font-bold mt-3">
                    {question.question}
                  </h2>

                  <div className="mt-5 space-y-3">
                    <div
                      className={`rounded-xl p-4 ${
                        isCorrect
                          ? "bg-green-50 border border-green-200"
                          : "bg-red-50 border border-red-200"
                      }`}
                    >
                      <p className="text-sm font-semibold text-gray-600">
                        Your answer
                      </p>

                      <p className="mt-1 font-medium">
                        {studentAnswer || "Not answered"}
                      </p>
                    </div>

                    {!isCorrect && (
                      <div className="bg-green-50 border border-green-200 rounded-xl p-4">
                        <p className="text-sm font-semibold text-green-700">
                          Correct answer
                        </p>

                        <p className="mt-1 font-medium">
                          {question.correctAnswer}
                        </p>
                      </div>
                    )}

                    {question.explanation?.trim() && (
                      <div className="bg-blue-50 border border-blue-200 rounded-xl p-4">
                        <p className="text-sm font-semibold text-blue-700">
                          💡 Explanation
                        </p>

                        <p className="mt-2 text-gray-700 leading-7 whitespace-pre-line">
                          {question.explanation}
                        </p>
                      </div>
                    )}
                  </div>
                </div>
              );
            })}
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 mt-7">
            <button
              type="button"
              onClick={restartExam}
              className="bg-gray-200 text-gray-800 px-6 py-3 rounded-xl font-semibold"
            >
              Try Again
            </button>

            <Link
              href={`/courses/${courseId}`}
              className="bg-green-700 text-white px-6 py-3 rounded-xl font-semibold text-center"
            >
              Back to Course
            </Link>
          </div>
        </div>
      </main>
    );
  }

  if (submitted) {
    const percentage = Math.round(
      (score / questions.length) * 100
    );

    const performanceMessage =
      percentage >= 70
        ? "Excellent performance! 🎉"
        : percentage >= 50
          ? "Good attempt. Keep practising."
          : "Keep studying and try again.";

    return (
      <main className="min-h-screen bg-gray-100 flex items-center justify-center p-6">
        <div className="w-full max-w-lg bg-white rounded-2xl shadow-lg p-8 text-center">
          <p className="text-sm text-gray-500">
            {course.code}
          </p>

          <h1 className="text-3xl font-bold text-green-700 mt-1">
            CBT Completed
          </h1>

          <div className="w-32 h-32 mx-auto mt-7 rounded-full border-8 border-green-100 flex items-center justify-center">
            <span className="text-3xl font-bold text-green-700">
              {percentage}%
            </span>
          </div>

          <p className="mt-6 text-xl">
            You scored {score} out of {questions.length}
          </p>

          <p className="mt-2 text-gray-600">
            {performanceMessage}
          </p>

          <p className="mt-3 text-sm text-gray-500">
            Answered {Object.keys(answers).length} of{" "}
            {questions.length} questions
          </p>

          {savingResult ? (
            <p className="mt-4 text-sm text-gray-500">
              Saving your result...
            </p>
          ) : resultSaved ? (
            <p className="mt-4 text-sm font-medium text-green-700">
              ✅ Result saved to your account
            </p>
          ) : (
            <p className="mt-4 text-sm text-red-600">
              Your score was calculated, but the result could not be
              saved.
            </p>
          )}

          <button
            type="button"
            onClick={() => setShowReview(true)}
            className="w-full mt-7 bg-green-100 text-green-800 py-3 rounded-xl font-semibold"
          >
            📝 Review Answers
          </button>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 mt-3">
            <button
              type="button"
              onClick={restartExam}
              className="bg-gray-200 text-gray-800 px-6 py-3 rounded-xl font-semibold"
            >
              Try Again
            </button>

            <Link
              href={`/courses/${courseId}`}
              className="bg-green-700 text-white px-6 py-3 rounded-xl font-semibold"
            >
              Back to Course
            </Link>
          </div>
        </div>
      </main>
    );
  }

  const current = questions[currentQuestion];
  const answeredCount = Object.keys(answers).length;

  const examinationProgress = Math.round(
    ((currentQuestion + 1) / questions.length) * 100
  );

  return (
    <main className="min-h-screen bg-gray-100 p-6">
      <div className="max-w-3xl mx-auto">
        <div className="flex flex-wrap justify-between items-center gap-4 mb-5">
          <Link
            href={`/courses/${courseId}`}
            className="text-green-700 font-semibold"
          >
            ← Exit Exam
          </Link>

          <div className="flex items-center gap-3">
            <span className="bg-white px-4 py-2 rounded-xl text-sm font-medium shadow">
              Answered: {answeredCount}/{questions.length}
            </span>

            <div
              className={`px-4 py-2 rounded-xl font-bold ${
                timeLeft <= 60
                  ? "bg-red-600 text-white"
                  : "bg-red-100 text-red-700"
              }`}
            >
              Time: {formatTime(timeLeft)}
            </div>
          </div>
        </div>

        <div className="bg-white rounded-2xl shadow-lg p-8">
          <div className="flex items-center justify-between gap-4">
            <p className="text-sm text-gray-500">
              Question {currentQuestion + 1} of {questions.length}
            </p>

            <p className="text-sm font-semibold text-green-700">
              {examinationProgress}%
            </p>
          </div>

          <div className="w-full bg-gray-200 rounded-full h-2 mt-3">
            <div
              className="bg-green-700 h-2 rounded-full transition-all"
              style={{
                width: `${examinationProgress}%`,
              }}
            />
          </div>

          <h1 className="text-2xl font-bold mt-6">
            {current.question}
          </h1>

          <div className="mt-6 space-y-3">
            {current.options.map((option, index) => {
              const selected =
                answers[currentQuestion] === option;

              return (
                <label
                  key={`${current.id}-${index}`}
                  className={`flex items-center gap-3 border-2 rounded-xl p-4 cursor-pointer transition ${
                    selected
                      ? "border-green-700 bg-green-50"
                      : "border-gray-200 hover:border-green-300"
                  }`}
                >
                  <input
                    type="radio"
                    name={`question-${currentQuestion}`}
                    value={option}
                    checked={selected}
                    onChange={() => selectAnswer(option)}
                  />

                  <span>{option}</span>
                </label>
              );
            })}
          </div>

          <div className="flex gap-3 mt-8">
            <button
              type="button"
              onClick={() =>
                setCurrentQuestion((previousQuestion) =>
                  Math.max(previousQuestion - 1, 0)
                )
              }
              disabled={currentQuestion === 0}
              className="flex-1 bg-gray-300 py-3 rounded-xl disabled:opacity-50"
            >
              Previous
            </button>

            {currentQuestion === questions.length - 1 ? (
              <button
                type="button"
                onClick={submitExam}
                disabled={savingResult}
                className="flex-1 bg-red-600 text-white py-3 rounded-xl font-semibold disabled:bg-gray-400"
              >
                {savingResult ? "Submitting..." : "Submit Exam"}
              </button>
            ) : (
              <button
                type="button"
                onClick={() =>
                  setCurrentQuestion(
                    (previousQuestion) => previousQuestion + 1
                  )
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