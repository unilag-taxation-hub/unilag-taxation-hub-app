"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { onAuthStateChanged, signOut } from "firebase/auth";
import {
  collection,
  doc,
  getCountFromServer,
  getDoc,
  getDocs,
  limit,
  orderBy,
  query,
} from "firebase/firestore";
import { useRouter } from "next/navigation";
import { auth, db } from "@/lib/firebase";

const ADMIN_EMAIL = "problematitzbest@gmail.com";

interface UserProfile {
  fullName?: string;
  email?: string;
  department?: string;
  level?: string;
}

interface StudyStats {
  courses: number;
  notes: number;
  questions: number;
  cbtCourses: number;
}

interface Course {
  id: string;
  title: string;
  code: string;
  level?: string;
  semester?: string;
  description?: string;
}

interface CourseWithProgress extends Course {
  totalNotes: number;
  completedNotes: number;
  progressPercentage: number;
}

interface ProgressDocument {
  completedNoteIds?: string[];
}

interface FirebaseTimestamp {
  seconds?: number;
  nanoseconds?: number;
  toDate?: () => Date;
}

interface CBTAttempt {
  id: string;
  courseId: string;
  courseCode: string;
  courseTitle: string;
  score: number;
  totalQuestions: number;
  percentage: number;
  answeredQuestions: number;
  timeAllowed?: number;
  timeUsed?: number;
  submittedAt?: FirebaseTimestamp | null;
}

interface Activity {
  id: string;
  type:
    | "note_opened"
    | "note_completed"
    | "note_uncompleted"
    | "cbt_completed";
  courseId: string;
  courseCode?: string;
  courseTitle?: string;
  title: string;
  description: string;
  percentage?: number | null;
  score?: number | null;
  totalQuestions?: number | null;
  createdAt?: FirebaseTimestamp | null;
}

interface PerformanceStats {
  attempts: number;
  bestScore: number;
  averageScore: number;
}

export default function DashboardPage() {
  const router = useRouter();

  const [profile, setProfile] = useState<UserProfile | null>(null);

  const [stats, setStats] = useState<StudyStats>({
    courses: 0,
    notes: 0,
    questions: 0,
    cbtCourses: 0,
  });

  const [performanceStats, setPerformanceStats] =
    useState<PerformanceStats>({
      attempts: 0,
      bestScore: 0,
      averageScore: 0,
    });

  const [coursesWithProgress, setCoursesWithProgress] = useState<
    CourseWithProgress[]
  >([]);

  const [recentAttempts, setRecentAttempts] = useState<CBTAttempt[]>([]);
  const [recentActivities, setRecentActivities] = useState<Activity[]>([]);

  const [loading, setLoading] = useState(true);
  const [statsLoading, setStatsLoading] = useState(true);
  const [isAdmin, setIsAdmin] = useState(false);

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, async (user) => {
      if (!user) {
        router.replace("/login");
        return;
      }

      setIsAdmin(
        user.email?.trim().toLowerCase() === ADMIN_EMAIL
      );

      try {
        const profileReference = doc(db, "users", user.uid);
        const profileSnapshot = await getDoc(profileReference);

        if (profileSnapshot.exists()) {
          setProfile(profileSnapshot.data() as UserProfile);
        } else {
          setProfile({
            fullName: user.displayName || "Student",
            email: user.email || "",
            department: "Taxation",
            level: "Not set",
          });
        }

        await loadStudyData(user.uid);
      } catch (error) {
        console.error("Unable to load dashboard:", error);

        setProfile({
          fullName: user.displayName || "Student",
          email: user.email || "",
          department: "Taxation",
          level: "Not set",
        });
      } finally {
        setLoading(false);
      }
    });

    return unsubscribe;
  }, [router]);

  async function loadStudyData(userId: string) {
    try {
      setStatsLoading(true);

      const coursesSnapshot = await getDocs(
        collection(db, "courses")
      );

      let totalNotes = 0;
      let totalQuestions = 0;
      let cbtReadyCourses = 0;

      const courseProgressData = await Promise.all(
        coursesSnapshot.docs.map(async (courseDocument) => {
          const courseId = courseDocument.id;

          const courseData = {
            id: courseId,
            ...(courseDocument.data() as Omit<Course, "id">),
          };

          const [
            notesCount,
            mcqCount,
            germanCount,
            theoryCount,
            progressSnapshot,
          ] = await Promise.all([
            getCountFromServer(
              collection(db, "courses", courseId, "notes")
            ),
            getCountFromServer(
              collection(db, "courses", courseId, "mcqs")
            ),
            getCountFromServer(
              collection(
                db,
                "courses",
                courseId,
                "germanQuestions"
              )
            ),
            getCountFromServer(
              collection(
                db,
                "courses",
                courseId,
                "theoryQuestions"
              )
            ),
            getDoc(
              doc(
                db,
                "users",
                userId,
                "progress",
                courseId
              )
            ),
          ]);

          const notesTotal = notesCount.data().count;
          const mcqTotal = mcqCount.data().count;
          const germanTotal = germanCount.data().count;
          const theoryTotal = theoryCount.data().count;

          totalNotes += notesTotal;

          totalQuestions +=
            mcqTotal + germanTotal + theoryTotal;

          if (mcqTotal > 0) {
            cbtReadyCourses += 1;
          }

          let completedNotes = 0;

          if (progressSnapshot.exists()) {
            const progressData =
              progressSnapshot.data() as ProgressDocument;

            const completedNoteIds = Array.isArray(
              progressData.completedNoteIds
            )
              ? progressData.completedNoteIds
              : [];

            completedNotes = Math.min(
              completedNoteIds.length,
              notesTotal
            );
          }

          const progressPercentage =
            notesTotal > 0
              ? Math.round(
                  (completedNotes / notesTotal) * 100
                )
              : 0;

          return {
            ...courseData,
            totalNotes: notesTotal,
            completedNotes,
            progressPercentage,
          };
        })
      );

      courseProgressData.sort((a, b) => {
        const aStarted = a.completedNotes > 0 ? 1 : 0;
        const bStarted = b.completedNotes > 0 ? 1 : 0;

        if (aStarted !== bStarted) {
          return bStarted - aStarted;
        }

        if (a.progressPercentage !== b.progressPercentage) {
          return b.progressPercentage - a.progressPercentage;
        }

        return `${a.code} ${a.title}`.localeCompare(
          `${b.code} ${b.title}`
        );
      });

      setCoursesWithProgress(courseProgressData);

      setStats({
        courses: coursesSnapshot.size,
        notes: totalNotes,
        questions: totalQuestions,
        cbtCourses: cbtReadyCourses,
      });

      await Promise.all([
        loadCBTPerformance(userId),
        loadRecentActivities(userId),
      ]);
    } catch (error) {
      console.error(
        "Unable to load dashboard information:",
        error
      );
    } finally {
      setStatsLoading(false);
    }
  }

  async function loadCBTPerformance(userId: string) {
    try {
      const attemptsQuery = query(
        collection(db, "users", userId, "cbtAttempts"),
        orderBy("submittedAt", "desc")
      );

      const attemptsSnapshot = await getDocs(attemptsQuery);

      const attempts: CBTAttempt[] = attemptsSnapshot.docs.map(
        (attemptDocument) => ({
          id: attemptDocument.id,
          ...(attemptDocument.data() as Omit<CBTAttempt, "id">),
        })
      );

      setRecentAttempts(attempts.slice(0, 5));

      if (attempts.length === 0) {
        setPerformanceStats({
          attempts: 0,
          bestScore: 0,
          averageScore: 0,
        });

        return;
      }

      const validPercentages = attempts
        .map((attempt) => Number(attempt.percentage))
        .filter((percentage) => Number.isFinite(percentage));

      const bestScore =
        validPercentages.length > 0
          ? Math.max(...validPercentages)
          : 0;

      const averageScore =
        validPercentages.length > 0
          ? Math.round(
              validPercentages.reduce(
                (total, percentage) => total + percentage,
                0
              ) / validPercentages.length
            )
          : 0;

      setPerformanceStats({
        attempts: attempts.length,
        bestScore,
        averageScore,
      });
    } catch (error) {
      console.error(
        "Unable to load CBT performance:",
        error
      );

      setRecentAttempts([]);

      setPerformanceStats({
        attempts: 0,
        bestScore: 0,
        averageScore: 0,
      });
    }
  }

  async function loadRecentActivities(userId: string) {
    try {
      const activitiesQuery = query(
        collection(db, "users", userId, "activities"),
        orderBy("createdAt", "desc"),
        limit(8)
      );

      const activitiesSnapshot = await getDocs(activitiesQuery);

      const activities: Activity[] = activitiesSnapshot.docs.map(
        (activityDocument) => ({
          id: activityDocument.id,
          ...(activityDocument.data() as Omit<Activity, "id">),
        })
      );

      setRecentActivities(activities);
    } catch (error) {
      console.error("Unable to load recent activities:", error);
      setRecentActivities([]);
    }
  }

  function formatAttemptDate(attempt: CBTAttempt) {
    return formatFullDate(attempt.submittedAt);
  }

  function formatFullDate(timestamp?: FirebaseTimestamp | null) {
    if (!timestamp) {
      return "Recently";
    }

    try {
      let date: Date;

      if (typeof timestamp.toDate === "function") {
        date = timestamp.toDate();
      } else if (timestamp.seconds) {
        date = new Date(timestamp.seconds * 1000);
      } else {
        return "Recently";
      }

      return date.toLocaleDateString("en-NG", {
        day: "numeric",
        month: "short",
        year: "numeric",
      });
    } catch {
      return "Recently";
    }
  }

  function formatRelativeTime(timestamp?: FirebaseTimestamp | null) {
    if (!timestamp) {
      return "Just now";
    }

    try {
      let date: Date;

      if (typeof timestamp.toDate === "function") {
        date = timestamp.toDate();
      } else if (timestamp.seconds) {
        date = new Date(timestamp.seconds * 1000);
      } else {
        return "Just now";
      }

      const differenceInSeconds = Math.max(
        0,
        Math.floor((Date.now() - date.getTime()) / 1000)
      );

      if (differenceInSeconds < 60) {
        return "Just now";
      }

      const differenceInMinutes = Math.floor(
        differenceInSeconds / 60
      );

      if (differenceInMinutes < 60) {
        return `${differenceInMinutes} ${
          differenceInMinutes === 1 ? "minute" : "minutes"
        } ago`;
      }

      const differenceInHours = Math.floor(
        differenceInMinutes / 60
      );

      if (differenceInHours < 24) {
        return `${differenceInHours} ${
          differenceInHours === 1 ? "hour" : "hours"
        } ago`;
      }

      const differenceInDays = Math.floor(
        differenceInHours / 24
      );

      if (differenceInDays < 7) {
        return `${differenceInDays} ${
          differenceInDays === 1 ? "day" : "days"
        } ago`;
      }

      return date.toLocaleDateString("en-NG", {
        day: "numeric",
        month: "short",
        year: "numeric",
      });
    } catch {
      return "Recently";
    }
  }

  function getActivityIcon(type: Activity["type"]) {
    switch (type) {
      case "note_opened":
        return "📖";
      case "note_completed":
        return "✅";
      case "note_uncompleted":
        return "↩️";
      case "cbt_completed":
        return "📝";
      default:
        return "📚";
    }
  }

  function getActivityIconStyle(type: Activity["type"]) {
    switch (type) {
      case "note_opened":
        return "bg-blue-100";
      case "note_completed":
        return "bg-green-100";
      case "note_uncompleted":
        return "bg-gray-100";
      case "cbt_completed":
        return "bg-purple-100";
      default:
        return "bg-gray-100";
    }
  }

  function getActivityLink(activity: Activity) {
    if (activity.type === "cbt_completed") {
      return `/courses/${activity.courseId}/cbt`;
    }

    return `/courses/${activity.courseId}/notes`;
  }

  function getPerformanceMessage(percentage: number) {
    if (percentage >= 70) {
      return "Excellent";
    }

    if (percentage >= 50) {
      return "Good attempt";
    }

    return "Keep practising";
  }

  async function handleLogout() {
    await signOut(auth);
    router.replace("/login");
  }

  if (loading) {
    return (
      <main className="min-h-screen bg-gray-100 flex items-center justify-center">
        <div className="text-center">
          <div className="w-12 h-12 border-4 border-green-700 border-t-transparent rounded-full animate-spin mx-auto" />

          <p className="mt-4 text-gray-600">
            Loading dashboard...
          </p>
        </div>
      </main>
    );
  }

  const firstName =
    profile?.fullName?.trim().split(" ")[0] || "Student";

  return (
    <main className="min-h-screen bg-gray-100">
      <section className="bg-gradient-to-br from-green-900 via-green-700 to-green-500 text-white px-6 py-10 rounded-b-3xl">
        <div className="max-w-5xl mx-auto">
          <p className="text-green-100">
            Welcome back
          </p>

          <h1 className="text-4xl font-bold mt-1">
            {firstName} 👋
          </h1>

          <p className="mt-3 text-green-100">
            Keep learning, practising and improving.
          </p>

          <div className="flex flex-wrap gap-3 mt-6">
            <span className="bg-white/15 px-4 py-2 rounded-full text-sm">
              🎓 {profile?.level || "Level not set"}
            </span>

            <span className="bg-white/15 px-4 py-2 rounded-full text-sm">
              🏛️ {profile?.department || "Taxation"}
            </span>
          </div>
        </div>
      </section>

      <section className="max-w-5xl mx-auto p-6">
        <h2 className="text-2xl font-bold">
          Study Overview
        </h2>

        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mt-5">
          <div className="bg-white rounded-2xl shadow p-5">
            <p className="text-3xl">📚</p>
            <p className="text-3xl font-bold mt-3">
              {statsLoading ? "..." : stats.courses}
            </p>
            <p className="text-gray-600 mt-1">Courses</p>
          </div>

          <div className="bg-white rounded-2xl shadow p-5">
            <p className="text-3xl">📖</p>
            <p className="text-3xl font-bold mt-3">
              {statsLoading ? "..." : stats.notes}
            </p>
            <p className="text-gray-600 mt-1">Notes</p>
          </div>

          <div className="bg-white rounded-2xl shadow p-5">
            <p className="text-3xl">📝</p>
            <p className="text-3xl font-bold mt-3">
              {statsLoading ? "..." : stats.questions}
            </p>
            <p className="text-gray-600 mt-1">Questions</p>
          </div>

          <div className="bg-white rounded-2xl shadow p-5">
            <p className="text-3xl">🎯</p>
            <p className="text-3xl font-bold mt-3">
              {statsLoading ? "..." : stats.cbtCourses}
            </p>
            <p className="text-gray-600 mt-1">CBT Ready</p>
          </div>
        </div>

        <div className="mt-10">
          <h2 className="text-2xl font-bold">
            Your Performance
          </h2>

          <p className="text-gray-600 mt-1">
            Your personal CBT performance across all courses.
          </p>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 mt-5">
          <div className="bg-white rounded-2xl shadow p-5">
            <p className="text-3xl">🧠</p>
            <p className="text-3xl font-bold mt-3">
              {statsLoading
                ? "..."
                : performanceStats.attempts}
            </p>
            <p className="text-gray-600 mt-1">
              CBT Attempts
            </p>
          </div>

          <div className="bg-white rounded-2xl shadow p-5">
            <p className="text-3xl">🏆</p>
            <p className="text-3xl font-bold mt-3 text-green-700">
              {statsLoading
                ? "..."
                : `${performanceStats.bestScore}%`}
            </p>
            <p className="text-gray-600 mt-1">
              Best Score
            </p>
          </div>

          <div className="bg-white rounded-2xl shadow p-5">
            <p className="text-3xl">📊</p>
            <p className="text-3xl font-bold mt-3">
              {statsLoading
                ? "..."
                : `${performanceStats.averageScore}%`}
            </p>
            <p className="text-gray-600 mt-1">
              Average Score
            </p>
          </div>
        </div>

        <div className="mt-10">
          <h2 className="text-2xl font-bold">
            Recent Activity
          </h2>

          <p className="text-gray-600 mt-1">
            Your latest study actions across notes and CBT exams.
          </p>
        </div>

        <div className="mt-5">
          {statsLoading ? (
            <div className="bg-white rounded-2xl shadow p-6">
              <p className="text-gray-500">
                Loading recent activity...
              </p>
            </div>
          ) : recentActivities.length === 0 ? (
            <div className="bg-white rounded-2xl shadow p-6 text-center">
              <p className="text-4xl">📚</p>

              <h3 className="text-xl font-bold mt-3">
                No recent activity yet
              </h3>

              <p className="text-gray-600 mt-2">
                Open a note, complete a topic or take a CBT exam
                and your activity will appear here.
              </p>

              <Link
                href="/courses"
                className="inline-block mt-5 bg-green-700 text-white px-5 py-3 rounded-xl font-semibold"
              >
                Start Learning
              </Link>
            </div>
          ) : (
            <div className="bg-white rounded-2xl shadow overflow-hidden">
              {recentActivities.map((activity, index) => (
                <Link
                  key={activity.id}
                  href={getActivityLink(activity)}
                  className={`flex items-start gap-4 p-5 hover:bg-gray-50 transition ${
                    index !== recentActivities.length - 1
                      ? "border-b border-gray-100"
                      : ""
                  }`}
                >
                  <div
                    className={`w-12 h-12 shrink-0 rounded-xl flex items-center justify-center text-2xl ${getActivityIconStyle(
                      activity.type
                    )}`}
                  >
                    {getActivityIcon(activity.type)}
                  </div>

                  <div className="flex-1 min-w-0">
                    <div className="flex flex-col sm:flex-row sm:items-start sm:justify-between gap-1 sm:gap-4">
                      <div>
                        <p className="font-bold text-gray-900">
                          {activity.title}
                        </p>

                        {activity.description && (
                          <p className="text-gray-600 text-sm mt-1">
                            {activity.description}
                          </p>
                        )}

                        {activity.courseCode && (
                          <span className="inline-block mt-2 bg-green-100 text-green-800 text-xs font-semibold px-3 py-1 rounded-full">
                            {activity.courseCode}
                          </span>
                        )}
                      </div>

                      <span className="text-sm text-gray-500 whitespace-nowrap">
                        {formatRelativeTime(activity.createdAt)}
                      </span>
                    </div>
                  </div>
                </Link>
              ))}
            </div>
          )}
        </div>

        <div className="mt-10">
          <h2 className="text-2xl font-bold">
            Recent Performance
          </h2>

          <p className="text-gray-600 mt-1">
            Your latest CBT attempts and scores.
          </p>
        </div>

        <div className="mt-5 space-y-4">
          {statsLoading ? (
            <div className="bg-white rounded-2xl shadow p-6">
              <p className="text-gray-500">
                Loading recent performance...
              </p>
            </div>
          ) : recentAttempts.length === 0 ? (
            <div className="bg-white rounded-2xl shadow p-6 text-center">
              <p className="text-4xl">📝</p>

              <h3 className="text-xl font-bold mt-3">
                No CBT attempts yet
              </h3>

              <p className="text-gray-600 mt-2">
                Take a CBT exam and your performance will appear
                here.
              </p>

              <Link
                href="/courses"
                className="inline-block mt-5 bg-green-700 text-white px-5 py-3 rounded-xl font-semibold"
              >
                Explore Courses
              </Link>
            </div>
          ) : (
            recentAttempts.map((attempt) => (
              <div
                key={attempt.id}
                className="bg-white rounded-2xl shadow p-5"
              >
                <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
                  <div>
                    <div className="flex flex-wrap items-center gap-2">
                      <span className="bg-green-100 text-green-800 text-sm font-semibold px-3 py-1 rounded-full">
                        {attempt.courseCode || "CBT"}
                      </span>

                      <span className="text-sm text-gray-500">
                        {formatAttemptDate(attempt)}
                      </span>
                    </div>

                    <h3 className="text-lg font-bold mt-3">
                      {attempt.courseTitle ||
                        "Course CBT Examination"}
                    </h3>

                    <p className="text-gray-600 mt-1">
                      Score: {attempt.score} of{" "}
                      {attempt.totalQuestions} •{" "}
                      {getPerformanceMessage(
                        attempt.percentage
                      )}
                    </p>
                  </div>

                  <div className="sm:text-right">
                    <p
                      className={`text-3xl font-bold ${
                        attempt.percentage >= 70
                          ? "text-green-700"
                          : attempt.percentage >= 50
                            ? "text-yellow-600"
                            : "text-red-600"
                      }`}
                    >
                      {attempt.percentage}%
                    </p>

                    <p className="text-sm text-gray-500 mt-1">
                      {attempt.answeredQuestions} of{" "}
                      {attempt.totalQuestions} answered
                    </p>
                  </div>
                </div>

                <div className="w-full bg-gray-200 rounded-full h-2 mt-5 overflow-hidden">
                  <div
                    className={`h-2 rounded-full ${
                      attempt.percentage >= 70
                        ? "bg-green-700"
                        : attempt.percentage >= 50
                          ? "bg-yellow-500"
                          : "bg-red-600"
                    }`}
                    style={{
                      width: `${Math.min(
                        Math.max(attempt.percentage, 0),
                        100
                      )}%`,
                    }}
                  />
                </div>

                <Link
                  href={`/courses/${attempt.courseId}/cbt`}
                  className="inline-block text-green-700 font-semibold mt-4"
                >
                  Try Again →
                </Link>
              </div>
            ))
          )}
        </div>

        <div className="flex items-center justify-between mt-10">
          <div>
            <h2 className="text-2xl font-bold">
              Continue Learning
            </h2>

            <p className="text-gray-600 mt-1">
              Courses you have started appear first.
            </p>
          </div>

          <Link
            href="/courses"
            className="text-green-700 font-semibold hidden sm:block"
          >
            View all →
          </Link>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-5 mt-5">
          {statsLoading ? (
            <div className="bg-white rounded-2xl shadow p-6 md:col-span-2">
              <p className="text-gray-500">
                Loading your progress...
              </p>
            </div>
          ) : coursesWithProgress.length === 0 ? (
            <div className="bg-white rounded-2xl shadow p-6 md:col-span-2">
              <p className="text-gray-500">
                No courses are available yet.
              </p>
            </div>
          ) : (
            coursesWithProgress
              .slice(0, 4)
              .map((course) => (
                <Link
                  key={course.id}
                  href={`/courses/${course.id}/notes`}
                  className="group bg-white rounded-2xl shadow p-6 hover:shadow-lg transition"
                >
                  <div className="flex items-start justify-between gap-4">
                    <div>
                      <span className="inline-block bg-green-100 text-green-800 text-sm font-semibold px-3 py-1 rounded-full">
                        {course.code}
                      </span>

                      <h3 className="text-xl font-bold mt-4 group-hover:text-green-700 transition">
                        {course.title}
                      </h3>
                    </div>

                    <span className="text-3xl">📚</span>
                  </div>

                  {course.description && (
                    <p className="text-gray-600 mt-3">
                      {course.description}
                    </p>
                  )}

                  <div className="flex flex-wrap gap-2 mt-4">
                    {course.level && (
                      <span className="text-xs bg-gray-100 text-gray-700 px-3 py-1 rounded-full">
                        🎓 {course.level}
                      </span>
                    )}

                    {course.semester && (
                      <span className="text-xs bg-gray-100 text-gray-700 px-3 py-1 rounded-full">
                        📅 {course.semester}
                      </span>
                    )}
                  </div>

                  <div className="mt-5">
                    <div className="flex items-center justify-between text-sm gap-4">
                      <span className="text-gray-600">
                        {course.totalNotes === 0
                          ? "No notes available"
                          : `${course.completedNotes} of ${course.totalNotes} topics completed`}
                      </span>

                      <span className="font-bold text-green-700">
                        {course.progressPercentage}%
                      </span>
                    </div>

                    <div className="w-full bg-gray-200 rounded-full h-3 mt-2 overflow-hidden">
                      <div
                        className="bg-green-700 h-3 rounded-full transition-all duration-300"
                        style={{
                          width: `${course.progressPercentage}%`,
                        }}
                      />
                    </div>
                  </div>

                  <p className="text-green-700 font-semibold mt-5">
                    {course.completedNotes > 0
                      ? "Continue Studying →"
                      : "Start Learning →"}
                  </p>
                </Link>
              ))
          )}
        </div>

        {coursesWithProgress.length > 4 && (
          <Link
            href="/courses"
            className="block sm:hidden text-center text-green-700 font-semibold mt-5"
          >
            View all courses →
          </Link>
        )}

        <h2 className="text-2xl font-bold mt-10">
          Quick Access
        </h2>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-5 mt-5">
          <Link
            href="/courses"
            className="bg-white rounded-2xl shadow p-6 hover:shadow-lg transition"
          >
            <p className="text-4xl">📚</p>

            <h3 className="text-xl font-bold mt-4">
              My Courses
            </h3>

            <p className="text-gray-600 mt-2">
              Access notes, practice questions and CBT exams.
            </p>
          </Link>

          <Link
            href="/profile"
            className="bg-white rounded-2xl shadow p-6 hover:shadow-lg transition"
          >
            <p className="text-4xl">👤</p>

            <h3 className="text-xl font-bold mt-4">
              My Profile
            </h3>

            <p className="text-gray-600 mt-2">
              View and update your student information.
            </p>
          </Link>

          {isAdmin && (
            <Link
              href="/admin"
              className="bg-white rounded-2xl shadow p-6 hover:shadow-lg transition md:col-span-2"
            >
              <p className="text-4xl">🛠️</p>

              <h3 className="text-xl font-bold mt-4">
                Admin Dashboard
              </h3>

              <p className="text-gray-600 mt-2">
                Manage courses, notes and practice content.
              </p>
            </Link>
          )}
        </div>

        <button
          type="button"
          onClick={handleLogout}
          className="w-full mt-8 bg-red-600 text-white py-3 rounded-xl font-semibold"
        >
          Logout
        </button>
      </section>
    </main>
  );
}