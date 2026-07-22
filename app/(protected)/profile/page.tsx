"use client";

import { useEffect, useState } from "react";
import { onAuthStateChanged, updateProfile } from "firebase/auth";
import {
  doc,
  getDoc,
  serverTimestamp,
  setDoc,
} from "firebase/firestore";
import { auth, db } from "@/lib/firebase";

export default function ProfilePage() {
  const [fullName, setFullName] = useState("");
  const [email, setEmail] = useState("");
  const [department] = useState("Taxation");
  const [level, setLevel] = useState("200");
  const [semester, setSemester] = useState("1");
  const [phone, setPhone] = useState("");

  const [pageLoading, setPageLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState("");
  const [success, setSuccess] = useState(false);

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, async (user) => {
      if (!user) {
        setMessage("Please log in to view your profile.");
        setSuccess(false);
        setPageLoading(false);
        return;
      }

      setEmail(user.email || "");

      try {
        const userRef = doc(db, "users", user.uid);
        const userSnap = await getDoc(userRef);

        if (userSnap.exists()) {
          const data = userSnap.data();

          setFullName(data.fullName || user.displayName || "");
          setPhone(data.phone || "");

          const savedLevel = String(data.level || "200").replace(
            " Level",
            ""
          );

          const savedSemester = String(data.semester || "1")
            .replace("First Semester", "1")
            .replace("Second Semester", "2");

          setLevel(savedLevel);
          setSemester(savedSemester);
        } else {
          setFullName(user.displayName || "");
        }
      } catch (error: unknown) {
        console.error("Profile loading error:", error);
        setSuccess(false);
        setMessage("Unable to load your profile. Please try again.");
      } finally {
        setPageLoading(false);
      }
    });

    return () => unsubscribe();
  }, []);

  async function saveProfile() {
    const user = auth.currentUser;

    setMessage("");
    setSuccess(false);

    if (!user) {
      setMessage("Please log in first.");
      return;
    }

    const cleanName = fullName.trim();
    const cleanPhone = phone.trim();

    if (!cleanName) {
      setMessage("Please enter your full name.");
      return;
    }

    if (!level || !semester) {
      setMessage("Please select your level and semester.");
      return;
    }

    try {
      setSaving(true);

      await updateProfile(user, {
        displayName: cleanName,
      });

      await setDoc(
        doc(db, "users", user.uid),
        {
          uid: user.uid,
          fullName: cleanName,
          email: user.email || email,
          department,
          level: Number(level),
          semester: Number(semester),
          phone: cleanPhone,
          updatedAt: serverTimestamp(),
        },
        { merge: true }
      );

      setSuccess(true);
      setMessage("Profile saved successfully!");
    } catch (error: unknown) {
      console.error("Profile saving error:", error);
      setSuccess(false);
      setMessage("Unable to save your profile. Please try again.");
    } finally {
      setSaving(false);
    }
  }

  if (pageLoading) {
    return (
      <main className="min-h-screen bg-gray-100 flex items-center justify-center px-4">
        <p className="text-gray-600">Loading profile...</p>
      </main>
    );
  }

  return (
    <main className="min-h-screen bg-gray-100 flex items-center justify-center px-4 py-8">
      <div className="w-full max-w-lg bg-white rounded-2xl shadow-lg p-6 sm:p-8">
        <h1 className="text-3xl font-bold text-green-700 text-center">
          My Profile
        </h1>

        <p className="text-center text-gray-500 mt-2 mb-6">
          Update your academic information
        </p>

        <div className="space-y-4">
          <div>
            <label
              htmlFor="fullName"
              className="block mb-1 font-medium text-gray-700"
            >
              Full Name
            </label>

            <input
              id="fullName"
              type="text"
              value={fullName}
              onChange={(e) => setFullName(e.target.value)}
              disabled={saving}
              autoComplete="name"
              placeholder="Enter your full name"
              className="w-full border rounded-lg p-3 focus:outline-none focus:ring-2 focus:ring-green-600 disabled:bg-gray-100"
            />
          </div>

          <div>
            <label
              htmlFor="email"
              className="block mb-1 font-medium text-gray-700"
            >
              Email
            </label>

            <input
              id="email"
              type="email"
              value={email}
              readOnly
              className="w-full border rounded-lg p-3 bg-gray-100 text-gray-600"
            />

            <p className="mt-1 text-xs text-gray-500">
              Your login email cannot be changed here.
            </p>
          </div>

          <div>
            <label
              htmlFor="department"
              className="block mb-1 font-medium text-gray-700"
            >
              Department
            </label>

            <input
              id="department"
              type="text"
              value={department}
              readOnly
              className="w-full border rounded-lg p-3 bg-gray-100 text-gray-600"
            />
          </div>

          <div>
            <label
              htmlFor="level"
              className="block mb-1 font-medium text-gray-700"
            >
              Current Level
            </label>

            <select
              id="level"
              value={level}
              onChange={(e) => setLevel(e.target.value)}
              disabled={saving}
              className="w-full border rounded-lg p-3 bg-white focus:outline-none focus:ring-2 focus:ring-green-600 disabled:bg-gray-100"
            >
              <option value="100">100 Level</option>
              <option value="200">200 Level</option>
              <option value="300">300 Level</option>
              <option value="400">400 Level</option>
            </select>
          </div>

          <div>
            <label
              htmlFor="semester"
              className="block mb-1 font-medium text-gray-700"
            >
              Current Semester
            </label>

            <select
              id="semester"
              value={semester}
              onChange={(e) => setSemester(e.target.value)}
              disabled={saving}
              className="w-full border rounded-lg p-3 bg-white focus:outline-none focus:ring-2 focus:ring-green-600 disabled:bg-gray-100"
            >
              <option value="1">First Semester</option>
              <option value="2">Second Semester</option>
            </select>
          </div>

          <div>
            <label
              htmlFor="phone"
              className="block mb-1 font-medium text-gray-700"
            >
              Phone Number
              <span className="ml-1 text-sm font-normal text-gray-500">
                (Optional)
              </span>
            </label>

            <input
              id="phone"
              type="tel"
              value={phone}
              onChange={(e) => setPhone(e.target.value)}
              disabled={saving}
              autoComplete="tel"
              placeholder="Enter your phone number"
              className="w-full border rounded-lg p-3 focus:outline-none focus:ring-2 focus:ring-green-600 disabled:bg-gray-100"
            />
          </div>

          {message && (
            <p
              role="alert"
              className={`text-center text-sm ${
                success ? "text-green-700" : "text-red-600"
              }`}
            >
              {success ? "✅ " : ""}
              {message}
            </p>
          )}

          <button
            type="button"
            onClick={saveProfile}
            disabled={saving}
            className="w-full bg-green-700 text-white py-3 rounded-lg font-medium hover:bg-green-800 transition disabled:bg-gray-400 disabled:cursor-not-allowed"
          >
            {saving ? "Saving Profile..." : "Save Profile"}
          </button>
        </div>
      </div>
    </main>
  );
}