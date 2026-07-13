import Link from "next/link";

export default function HomePage() {
  return (
    <main className="min-h-screen bg-gradient-to-br from-green-900 via-green-700 to-green-500 flex items-center justify-center p-6">
      <div className="w-full max-w-2xl text-center text-white">

        <div className="mb-8">
          <div className="w-20 h-20 mx-auto bg-white text-green-700 rounded-2xl flex items-center justify-center text-4xl shadow-xl">
            🎓
          </div>
        </div>

        <h1 className="text-4xl md:text-6xl font-bold">
          UNILAG Taxation Hub
        </h1>

        <p className="mt-5 text-lg md:text-xl text-green-100 max-w-xl mx-auto">
          Learn smarter. Practice better. Prepare confidently.
        </p>

        <p className="mt-3 text-green-100 max-w-lg mx-auto">
          An independent educational platform designed for Taxation students
          of the University of Lagos.
        </p>

        <div className="mt-10 flex flex-col sm:flex-row gap-4 justify-center">

          <Link
            href="/login"
            className="bg-white text-green-700 font-bold px-8 py-4 rounded-xl hover:bg-green-50 transition shadow-lg"
          >
            Login
          </Link>

          <Link
            href="/signup"
            className="border-2 border-white text-white font-bold px-8 py-4 rounded-xl hover:bg-white hover:text-green-700 transition"
          >
            Create Account
          </Link>

        </div>

        <div className="mt-12 grid grid-cols-3 gap-4 text-center">

          <div>
            <p className="text-2xl">📚</p>
            <p className="mt-2 text-sm text-green-100">Course Notes</p>
          </div>

          <div>
            <p className="text-2xl">📝</p>
            <p className="mt-2 text-sm text-green-100">Practice Questions</p>
          </div>

          <div>
            <p className="text-2xl">🎯</p>
            <p className="mt-2 text-sm text-green-100">CBT Exams</p>
          </div>

        </div>

        <p className="mt-12 text-sm text-green-200">
          Built for learning. Built for Taxation students.
        </p>

      </div>
    </main>
  );
}