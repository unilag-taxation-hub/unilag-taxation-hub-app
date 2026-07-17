"use client";

import {
  useCallback,
  useEffect,
  useRef,
  useState,
} from "react";
import Link from "next/link";
import { useParams } from "next/navigation";
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
  order?: number;
}

interface CBTSettings {
  questionLimit: number;
  secondsPerQuestion: number;
  randomizeQuestions: boolean;
  randomizeOptions: boolean;
  allowReview: boolean;
  showExplanations: boolean;
}

interface Course {
  title?: string;
  code?: string;
  cbtSettings?: Partial<CBTSettings>;
}

const DEFAULT_CBT_SETTINGS: CBTSettings = {
  questionLimit: 50,
  secondsPerQuestion: 60,
  randomizeQuestions: true,
  randomizeOptions: true,
  allowReview: true,
  showExplanations: true,
};

const MINIMUM_EXAM_TIME = 60;
const MAXIMUM_EXAM_TIME = 6 * 60 * 60;

function normalizeCBTSettings(
  value: unknown
): CBTSettings {
  if (!value || typeof value !== "object") {
    return {
      ...DEFAULT_CBT_SETTINGS,
    };
  }

  const settings =
    value as Partial<CBTSettings>;

  return {
    questionLimit:
      typeof settings.questionLimit ===
        "number" &&
      settings.questionLimit > 0
        ? Math.floor(settings.questionLimit)
        : DEFAULT_CBT_SETTINGS.questionLimit,

    secondsPerQuestion:
      typeof settings.secondsPerQuestion ===
        "number" &&
      settings.secondsPerQuestion > 0
        ? Math.floor(
            settings.secondsPerQuestion
          )
        : DEFAULT_CBT_SETTINGS.secondsPerQuestion,

    randomizeQuestions:
      typeof settings.randomizeQuestions ===
      "boolean"
        ? settings.randomizeQuestions
        : DEFAULT_CBT_SETTINGS.randomizeQuestions,

    randomizeOptions:
      typeof settings.randomizeOptions ===
      "boolean"
        ? settings.randomizeOptions
        : DEFAULT_CBT_SETTINGS.randomizeOptions,

    allowReview:
      typeof settings.allowReview ===
      "boolean"
        ? settings.allowReview
        : DEFAULT_CBT_SETTINGS.allowReview,

    showExplanations:
      typeof settings.showExplanations ===
      "boolean"
        ? settings.showExplanations
        : DEFAULT_CBT_SETTINGS.showExplanations,
  };
}

function shuffleArray<T>(items: T[]): T[] {
  const shuffledItems = [...items];

  for (
    let currentIndex =
      shuffledItems.length - 1;
    currentIndex > 0;
    currentIndex -= 1
  ) {
    const randomIndex = Math.floor(
      Math.random() * (currentIndex + 1)
    );

    [
      shuffledItems[currentIndex],
      shuffledItems[randomIndex],
    ] = [
      shuffledItems[randomIndex],
      shuffledItems[currentIndex],
    ];
  }

  return shuffledItems;
}

function prepareExamQuestions(
  questionBank: MCQ[],
  settings: CBTSettings
): MCQ[] {
  const orderedQuestionBank = [
    ...questionBank,
  ].sort(
    (firstQuestion, secondQuestion) =>
      (firstQuestion.order ?? 0) -
      (secondQuestion.order ?? 0)
  );

  const preparedQuestionBank =
    settings.randomizeQuestions
      ? shuffleArray(orderedQuestionBank)
      : orderedQuestionBank;

  const questionLimit = Math.min(
    settings.questionLimit,
    preparedQuestionBank.length
  );

  const selectedQuestions =
    preparedQuestionBank.slice(
      0,
      questionLimit
    );

  return selectedQuestions.map(
    (question) => ({
      ...question,

      options: settings.randomizeOptions
        ? shuffleArray(question.options)
        : [...question.options],
    })
  );
}

function calculateExamDuration(
  questionCount: number,
  secondsPerQuestion: number
): number {
  const calculatedTime =
    questionCount * secondsPerQuestion;

  return Math.min(
    Math.max(
      calculatedTime,
      MINIMUM_EXAM_TIME
    ),
    MAXIMUM_EXAM_TIME
  );
}

function formatTime(seconds: number): string {
  const safeSeconds = Math.max(
    0,
    Math.floor(seconds)
  );

  const hours = Math.floor(
    safeSeconds / 3600
  );

  const minutes = Math.floor(
    (safeSeconds % 3600) / 60
  );

  const remainingSeconds =
    safeSeconds % 60;

  if (hours > 0) {
    return `${hours}:${minutes
      .toString()
      .padStart(2, "0")}:${remainingSeconds
      .toString()
      .padStart(2, "0")}`;
  }

  return `${minutes}:${remainingSeconds
    .toString()
    .padStart(2, "0")}`;
}

export default function CBTPage() {
  const params = useParams<{
    courseId: string;
  }>();

  const courseId = params.courseId;

  const [questionBank, setQuestionBank] =
    useState<MCQ[]>([]);

  const [questions, setQuestions] =
    useState<MCQ[]>([]);

  const [answers, setAnswers] = useState<
    Record<number, string>
  >({});

  const [
    currentQuestion,
    setCurrentQuestion,
  ] = useState(0);

  const [
    cbtSettings,
    setCBTSettings,
  ] = useState<CBTSettings>({
    ...DEFAULT_CBT_SETTINGS,
  });

  const [
    examDuration,
    setExamDuration,
  ] = useState(MINIMUM_EXAM_TIME);

  const [timeLeft, setTimeLeft] =
    useState(MINIMUM_EXAM_TIME);

  const [userId, setUserId] =
    useState("");

  const [course, setCourse] =
    useState<Course>({});

  const [loading, setLoading] =
    useState(true);

  const [submitted, setSubmitted] =
    useState(false);

  const [
    savingResult,
    setSavingResult,
  ] = useState(false);

  const [
    resultSaved,
    setResultSaved,
  ] = useState(false);

  const [showReview, setShowReview] =
    useState(false);

  const [score, setScore] =
    useState(0);

  const [error, setError] =
    useState("");

  const answersReference = useRef<
    Record<number, string>
  >({});

  const questionsReference =
    useRef<MCQ[]>([]);

  const cbtSettingsReference =
    useRef<CBTSettings>({
      ...DEFAULT_CBT_SETTINGS,
    });

  const timeLeftReference = useRef(
    MINIMUM_EXAM_TIME
  );

  const examDurationReference = useRef(
    MINIMUM_EXAM_TIME
  );

  const submittingReference =
    useRef(false);

  useEffect(() => {
    answersReference.current = answers;
  }, [answers]);

  useEffect(() => {
    questionsReference.current =
      questions;
  }, [questions]);

  useEffect(() => {
    cbtSettingsReference.current =
      cbtSettings;
  }, [cbtSettings]);

  useEffect(() => {
    timeLeftReference.current =
      timeLeft;
  }, [timeLeft]);

  useEffect(() => {
    examDurationReference.current =
      examDuration;
  }, [examDuration]);

  useEffect(() => {
    const unsubscribe =
      onAuthStateChanged(
        auth,
        async (user) => {
          if (!user) {
            setError(
              "Please log in to take this CBT examination."
            );

            setLoading(false);
            return;
          }

          setUserId(user.uid);

          try {
            setLoading(true);
            setError("");

            const questionsQuery = query(
              collection(
                db,
                "courses",
                courseId,
                "mcqs"
              ),
              orderBy("order", "asc")
            );

            const [
              questionsSnapshot,
              courseSnapshot,
            ] = await Promise.all([
              getDocs(questionsQuery),

              getDoc(
                doc(
                  db,
                  "courses",
                  courseId
                )
              ),
            ]);

            const loadedQuestions: MCQ[] =
              questionsSnapshot.docs.map(
                (questionDocument) => {
                  const data =
                    questionDocument.data();

                  return {
                    id: questionDocument.id,

                    question:
                      typeof data.question ===
                      "string"
                        ? data.question
                        : "",

                    options:
                      Array.isArray(
                        data.options
                      )
                        ? data.options.filter(
                            (
                              option
                            ): option is string =>
                              typeof option ===
                              "string"
                          )
                        : [],

                    correctAnswer:
                      typeof data.correctAnswer ===
                      "string"
                        ? data.correctAnswer
                        : "",

                    explanation:
                      typeof data.explanation ===
                      "string"
                        ? data.explanation
                        : "",

                    order:
                      typeof data.order ===
                      "number"
                        ? data.order
                        : 0,
                  };
                }
              );

            const validQuestions =
              loadedQuestions.filter(
                (question) =>
                  question.question.trim() !==
                    "" &&
                  question.correctAnswer.trim() !==
                    "" &&
                  question.options.length > 0
              );

            let loadedCourse: Course = {};
            let settings = {
              ...DEFAULT_CBT_SETTINGS,
            };

            if (courseSnapshot.exists()) {
              loadedCourse =
                courseSnapshot.data() as Course;

              settings =
                normalizeCBTSettings(
                  loadedCourse.cbtSettings
                );
            }

            const preparedQuestions =
              prepareExamQuestions(
                validQuestions,
                settings
              );

            const duration =
              calculateExamDuration(
                preparedQuestions.length,
                settings.secondsPerQuestion
              );

            setCourse(loadedCourse);
            setCBTSettings(settings);
            setQuestionBank(validQuestions);
            setQuestions(
              preparedQuestions
            );

            setExamDuration(duration);
            setTimeLeft(duration);

            cbtSettingsReference.current =
              settings;

            questionsReference.current =
              preparedQuestions;

            examDurationReference.current =
              duration;

            timeLeftReference.current =
              duration;
          } catch (caughtError) {
            console.error(
              "Unable to load CBT:",
              caughtError
            );

            setError(
              "Unable to load the CBT examination. Please try again."
            );
          } finally {
            setLoading(false);
          }
        }
      );

    return unsubscribe;
  }, [courseId]);

  const submitExam =
    useCallback(async () => {
      if (
        submittingReference.current ||
        submitted ||
        !userId ||
        questionsReference.current
          .length === 0
      ) {
        return;
      }

      submittingReference.current = true;
      setSavingResult(true);

      const currentQuestions =
        questionsReference.current;

      const currentAnswers =
        answersReference.current;

      const currentSettings =
        cbtSettingsReference.current;

      let calculatedScore = 0;

      currentQuestions.forEach(
        (question, index) => {
          if (
            currentAnswers[index] ===
            question.correctAnswer
          ) {
            calculatedScore += 1;
          }
        }
      );

      const totalQuestions =
        currentQuestions.length;

      const answeredQuestions =
        Object.keys(
          currentAnswers
        ).length;

      const percentage =
        totalQuestions > 0
          ? Math.round(
              (calculatedScore /
                totalQuestions) *
                100
            )
          : 0;

      const allowedTime =
        examDurationReference.current;

      const timeUsed = Math.max(
        0,
        allowedTime -
          timeLeftReference.current
      );

      setScore(calculatedScore);
      setSubmitted(true);

      try {
        await addDoc(
          collection(
            db,
            "users",
            userId,
            "cbtAttempts"
          ),
          {
            courseId,
            courseCode:
              course.code || "",
            courseTitle:
              course.title || "",

            score: calculatedScore,
            totalQuestions,
            percentage,
            answeredQuestions,

            timeAllowed: allowedTime,
            timeUsed,

            cbtSettingsUsed: {
              questionLimit:
                currentSettings.questionLimit,

              secondsPerQuestion:
                currentSettings.secondsPerQuestion,

              randomizeQuestions:
                currentSettings.randomizeQuestions,

              randomizeOptions:
                currentSettings.randomizeOptions,

              allowReview:
                currentSettings.allowReview,

              showExplanations:
                currentSettings.showExplanations,
            },

            submittedAt:
              serverTimestamp(),
          }
        );

        setResultSaved(true);

        try {
          await saveActivity({
            userId,

            type: "cbt_completed",

            courseId,

            courseCode:
              course.code || "",

            courseTitle:
              course.title || "",

            title: `Completed CBT: ${
              course.title ||
              course.code ||
              "Course examination"
            }`,

            description: `Scored ${calculatedScore} out of ${totalQuestions} (${percentage}%).`,

            percentage,
            score: calculatedScore,
            totalQuestions,
          });
        } catch (activityError) {
          console.error(
            "Unable to save activity:",
            activityError
          );
        }
      } catch (caughtError) {
        console.error(
          "Unable to save CBT result:",
          caughtError
        );

        setResultSaved(false);
      } finally {
        setSavingResult(false);

        submittingReference.current =
          false;
      }
    }, [
      course.code,
      course.title,
      courseId,
      submitted,
      userId,
    ]);

  useEffect(() => {
    if (
      loading ||
      submitted ||
      !userId ||
      questions.length === 0
    ) {
      return;
    }

    const timer =
      window.setInterval(() => {
        setTimeLeft(
          (previousTime) => {
            if (previousTime <= 1) {
              window.clearInterval(
                timer
              );

              timeLeftReference.current =
                0;

              window.setTimeout(() => {
                void submitExam();
              }, 0);

              return 0;
            }

            const newTime =
              previousTime - 1;

            timeLeftReference.current =
              newTime;

            return newTime;
          }
        );
      }, 1000);

    return () => {
      window.clearInterval(timer);
    };
  }, [
    loading,
    questions.length,
    submitExam,
    submitted,
    userId,
  ]);

  function selectAnswer(
    option: string
  ) {
    const updatedAnswers = {
      ...answersReference.current,
      [currentQuestion]: option,
    };

    answersReference.current =
      updatedAnswers;

    setAnswers(updatedAnswers);
  }

  function goToPreviousQuestion() {
    setCurrentQuestion(
      (previousQuestion) =>
        Math.max(
          previousQuestion - 1,
          0
        )
    );
  }

  function goToNextQuestion() {
    setCurrentQuestion(
      (previousQuestion) =>
        Math.min(
          previousQuestion + 1,
          questions.length - 1
        )
    );
  }

  function restartExam() {
    const preparedQuestions =
      prepareExamQuestions(
        questionBank,
        cbtSettings
      );

    const duration =
      calculateExamDuration(
        preparedQuestions.length,
        cbtSettings.secondsPerQuestion
      );

    submittingReference.current =
      false;

    answersReference.current = {};

    questionsReference.current =
      preparedQuestions;

    cbtSettingsReference.current =
      cbtSettings;

    examDurationReference.current =
      duration;

    timeLeftReference.current =
      duration;

    setQuestions(preparedQuestions);
    setAnswers({});
    setCurrentQuestion(0);

    setExamDuration(duration);
    setTimeLeft(duration);

    setScore(0);
    setSubmitted(false);
    setSavingResult(false);
    setResultSaved(false);
    setShowReview(false);
    setError("");
  }

  if (loading) {
    return (
      <main className="min-h-screen bg-gray-100 flex items-center justify-center p-6">
        <div className="text-center">
          <div className="w-12 h-12 border-4 border-green-700 border-t-transparent rounded-full animate-spin mx-auto" />

          <p className="mt-4 text-gray-800 font-medium">
            Preparing CBT examination...
          </p>
        </div>
      </main>
    );
  }

  if (error) {
    return (
      <main className="min-h-screen bg-gray-100 flex items-center justify-center p-6">
        <div className="w-full max-w-md bg-white rounded-2xl shadow-lg p-8 text-center">
          <h1 className="text-2xl font-bold text-gray-950">
            Unable to Open CBT
          </h1>

          <p className="mt-3 text-red-700">
            {error}
          </p>

          <Link
            href={`/courses/${courseId}`}
            className="inline-block mt-6 bg-green-700 text-white px-6 py-3 rounded-xl font-semibold"
          >
            Back to Course
          </Link>
        </div>
      </main>
    );
  }

  if (questions.length === 0) {
    return (
      <main className="min-h-screen bg-gray-100 flex items-center justify-center p-6">
        <div className="w-full max-w-md bg-white rounded-2xl shadow-lg p-8 text-center">
          <h1 className="text-2xl font-bold text-gray-950">
            No CBT Questions Available
          </h1>

          <p className="mt-3 text-gray-800">
            Valid MCQs have not been added
            to this course yet.
          </p>

          <Link
            href={`/courses/${courseId}`}
            className="inline-block mt-6 bg-green-700 text-white px-6 py-3 rounded-xl font-semibold"
          >
            Back to Course
          </Link>
        </div>
      </main>
    );
  }

  if (
    submitted &&
    showReview &&
    cbtSettings.allowReview
  ) {
    return (
      <main className="min-h-screen bg-gray-100 p-4 sm:p-6 text-gray-950">
        <div className="max-w-3xl mx-auto">
          <button
            type="button"
            onClick={() =>
              setShowReview(false)
            }
            className="text-green-800 font-semibold mb-5"
          >
            ← Back to Result
          </button>

          <section className="bg-green-800 text-white rounded-2xl p-6">
            <p className="text-green-100 text-sm">
              {course.code ||
                "CBT Examination"}
            </p>

            <h1 className="text-3xl font-bold mt-1">
              Answer Review
            </h1>

            <p className="mt-2 text-green-100">
              You scored {score} out of{" "}
              {questions.length}.
            </p>
          </section>

          <section className="mt-6 space-y-5">
            {questions.map(
              (question, index) => {
                const studentAnswer =
                  answers[index];

                const isCorrect =
                  studentAnswer ===
                  question.correctAnswer;

                return (
                  <article
                    key={`${question.id}-${index}`}
                    className={`bg-white rounded-2xl shadow p-5 sm:p-6 border-2 ${
                      isCorrect
                        ? "border-green-300"
                        : "border-red-300"
                    }`}
                  >
                    <div className="flex items-start justify-between gap-4">
                      <p className="text-sm font-semibold text-gray-700">
                        Question {index + 1}
                      </p>

                      <span
                        className={`text-sm font-semibold px-3 py-1 rounded-full ${
                          isCorrect
                            ? "bg-green-100 text-green-900"
                            : "bg-red-100 text-red-800"
                        }`}
                      >
                        {isCorrect
                          ? "✓ Correct"
                          : "✕ Incorrect"}
                      </span>
                    </div>

                    <h2 className="text-lg sm:text-xl font-bold mt-3 text-gray-950 leading-8">
                      {question.question}
                    </h2>

                    <div className="mt-5 space-y-3">
                      <div
                        className={`rounded-xl p-4 border ${
                          isCorrect
                            ? "bg-green-50 border-green-300"
                            : "bg-red-50 border-red-300"
                        }`}
                      >
                        <p className="text-sm font-semibold text-gray-800">
                          Your answer
                        </p>

                        <p className="mt-1 font-medium text-gray-950">
                          {studentAnswer ||
                            "Not answered"}
                        </p>
                      </div>

                      {!isCorrect && (
                        <div className="bg-green-50 border border-green-300 rounded-xl p-4">
                          <p className="text-sm font-semibold text-green-900">
                            Correct answer
                          </p>

                          <p className="mt-1 font-medium text-gray-950">
                            {
                              question.correctAnswer
                            }
                          </p>
                        </div>
                      )}

                      {cbtSettings.showExplanations &&
                        question.explanation?.trim() && (
                          <div className="bg-blue-50 border border-blue-300 rounded-xl p-4">
                            <p className="text-sm font-semibold text-blue-900">
                              Explanation
                            </p>

                            <p className="mt-2 text-gray-900 leading-7 whitespace-pre-line">
                              {
                                question.explanation
                              }
                            </p>
                          </div>
                        )}
                    </div>
                  </article>
                );
              }
            )}
          </section>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 mt-7">
            <button
              type="button"
              onClick={restartExam}
              className="bg-gray-300 text-gray-950 px-6 py-3 rounded-xl font-semibold"
            >
              Try Another{" "}
              {questions.length}
            </button>

            <Link
              href={`/courses/${courseId}`}
              className="bg-green-800 text-white px-6 py-3 rounded-xl font-semibold text-center"
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
      (score / questions.length) *
        100
    );

    const performanceMessage =
      percentage >= 70
        ? "Excellent performance! 🎉"
        : percentage >= 50
          ? "Good attempt. Keep practising."
          : "Keep studying and try again.";

    return (
      <main className="min-h-screen bg-gray-100 flex items-center justify-center p-4 sm:p-6">
        <div className="w-full max-w-lg bg-white rounded-2xl shadow-lg p-6 sm:p-8 text-center">
          <p className="text-sm font-medium text-gray-700">
            {course.code ||
              "CBT Examination"}
          </p>

          <h1 className="text-3xl font-bold text-green-800 mt-1">
            CBT Completed
          </h1>

          <div className="w-32 h-32 mx-auto mt-7 rounded-full border-8 border-green-100 flex items-center justify-center">
            <span className="text-3xl font-bold text-green-800">
              {percentage}%
            </span>
          </div>

          <p className="mt-6 text-xl font-semibold text-gray-950">
            You scored {score} out of{" "}
            {questions.length}
          </p>

          <p className="mt-2 text-gray-800">
            {performanceMessage}
          </p>

          <div className="mt-5 bg-gray-100 rounded-xl p-4 space-y-2">
            <p className="text-sm text-gray-800">
              Answered:{" "}
              <span className="font-semibold">
                {
                  Object.keys(answers)
                    .length
                }{" "}
                of {questions.length}
              </span>
            </p>

            <p className="text-sm text-gray-800">
              Time allowed:{" "}
              <span className="font-semibold">
                {formatTime(
                  examDuration
                )}
              </span>
            </p>
          </div>

          {savingResult ? (
            <p className="mt-4 text-sm text-gray-700">
              Saving your result...
            </p>
          ) : resultSaved ? (
            <p className="mt-4 text-sm font-semibold text-green-800">
              ✅ Result saved to your account
            </p>
          ) : (
            <p className="mt-4 text-sm font-medium text-red-700">
              Your score was calculated, but
              the result could not be saved.
            </p>
          )}

          {cbtSettings.allowReview && (
            <button
              type="button"
              onClick={() =>
                setShowReview(true)
              }
              className="w-full mt-7 bg-green-100 text-green-950 py-3 rounded-xl font-semibold"
            >
              Review Answers
            </button>
          )}

          <div
            className={`grid grid-cols-1 ${
              cbtSettings.allowReview
                ? "sm:grid-cols-2 mt-3"
                : "sm:grid-cols-2 mt-7"
            } gap-3`}
          >
            <button
              type="button"
              onClick={restartExam}
              className="bg-gray-300 text-gray-950 px-6 py-3 rounded-xl font-semibold"
            >
              Try Another{" "}
              {questions.length}
            </button>

            <Link
              href={`/courses/${courseId}`}
              className="bg-green-800 text-white px-6 py-3 rounded-xl font-semibold text-center"
            >
              Back to Course
            </Link>
          </div>
        </div>
      </main>
    );
  }

  const current =
    questions[currentQuestion];

  const answeredCount =
    Object.keys(answers).length;

  const examinationProgress =
    Math.round(
      ((currentQuestion + 1) /
        questions.length) *
        100
    );

  const warningTime = Math.min(
    60,
    Math.max(
      10,
      Math.floor(examDuration * 0.05)
    )
  );

  return (
    <main className="min-h-screen bg-gray-100 p-4 sm:p-6 text-gray-950">
      <div className="max-w-3xl mx-auto">
        <div className="flex flex-wrap justify-between items-center gap-3 mb-5">
          <Link
            href={`/courses/${courseId}`}
            className="text-green-800 font-semibold"
          >
            ← Exit Exam
          </Link>

          <div className="flex flex-wrap items-center gap-3">
            <span className="bg-white px-4 py-2 rounded-xl text-sm font-semibold shadow text-gray-900">
              Answered: {answeredCount}/
              {questions.length}
            </span>

            <div
              className={`px-4 py-2 rounded-xl font-bold ${
                timeLeft <= warningTime
                  ? "bg-red-700 text-white"
                  : "bg-red-100 text-red-900"
              }`}
            >
              Time: {formatTime(timeLeft)}
            </div>
          </div>
        </div>

        <section className="bg-white rounded-2xl shadow-lg p-5 sm:p-8">
          <div className="flex items-center justify-between gap-4">
            <p className="text-sm font-medium text-gray-700">
              Question{" "}
              {currentQuestion + 1} of{" "}
              {questions.length}
            </p>

            <p className="text-sm font-bold text-green-800">
              {examinationProgress}%
            </p>
          </div>

          <div className="w-full bg-gray-200 rounded-full h-2 mt-3">
            <div
              className="bg-green-800 h-2 rounded-full transition-all duration-300"
              style={{
                width: `${examinationProgress}%`,
              }}
            />
          </div>

          <h1 className="text-xl sm:text-2xl font-bold mt-6 text-gray-950 leading-8">
            {current.question}
          </h1>

          <div className="mt-6 space-y-3">
            {current.options.map(
              (
                option,
                optionIndex
              ) => {
                const selected =
                  answers[
                    currentQuestion
                  ] === option;

                return (
                  <label
                    key={`${current.id}-${optionIndex}-${option}`}
                    className={`flex items-start gap-3 border-2 rounded-xl p-4 cursor-pointer transition ${
                      selected
                        ? "border-green-800 bg-green-50"
                        : "border-gray-300 bg-white hover:border-green-500"
                    }`}
                  >
                    <input
                      type="radio"
                      name={`question-${currentQuestion}`}
                      value={option}
                      checked={selected}
                      onChange={() =>
                        selectAnswer(
                          option
                        )
                      }
                      className="mt-1"
                    />

                    <span className="text-gray-950 font-medium leading-6">
                      {option}
                    </span>
                  </label>
                );
              }
            )}
          </div>

          <div className="grid grid-cols-2 gap-3 mt-8">
            <button
              type="button"
              onClick={
                goToPreviousQuestion
              }
              disabled={
                currentQuestion === 0
              }
              className="bg-gray-300 text-gray-950 py-3 rounded-xl font-semibold disabled:opacity-50 disabled:cursor-not-allowed"
            >
              Previous
            </button>

            {currentQuestion ===
            questions.length - 1 ? (
              <button
                type="button"
                onClick={() => {
                  void submitExam();
                }}
                disabled={savingResult}
                className="bg-red-700 text-white py-3 rounded-xl font-semibold disabled:bg-gray-400 disabled:cursor-not-allowed"
              >
                {savingResult
                  ? "Submitting..."
                  : "Submit Exam"}
              </button>
            ) : (
              <button
                type="button"
                onClick={
                  goToNextQuestion
                }
                className="bg-green-800 text-white py-3 rounded-xl font-semibold"
              >
                Next
              </button>
            )}
          </div>
        </section>
      </div>
    </main>
  );
}