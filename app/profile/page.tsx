"use client";

import { useEffect, useState } from "react";
import { auth, db } from "@/lib/firebase";
import { doc, getDoc, setDoc } from "firebase/firestore";

export default function ProfilePage() {
  const [fullName, setFullName] = useState("");
  const [department, setDepartment] = useState("Taxation");
  const [level, setLevel] = useState("200 Level");
  const [phone, setPhone] = useState("");
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState("");

  useEffect(() => {
    const loadProfile = async () => {
      const user = auth.currentUser;

      if (!user) return;

      try {
        const docRef = doc(db, "users", user.uid);
        const docSnap = await getDoc(docRef);

        if (docSnap.exists()) {
          const data = docSnap.data();

          setFullName(data.fullName || "");
          setDepartment(data.department || "Taxation");
          setLevel(data.level || "200 Level");
          setPhone(data.phone || "");
        }
      } catch (error: any) {
        setMessage(error.message);
      }
    };

    loadProfile();
  }, []);

  const saveProfile = async () => {
    const user = auth.currentUser;

    if (!user) {
      setMessage("Please log in first.");
      return;
    }

    try {
      setLoading(true);

      await setDoc(doc(db, "users", user.uid), {
        fullName,
        email: user.email,
        department,
        level,
        phone,
      });

      setMessage("✅ Profile saved successfully!");
    } catch (error: any) {
      console.error(error);
      setMessage(error.message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <main className="min-h-screen bg-gray-100 flex items-center justify-center">
      <div className="w-full max-w-lg bg-white rounded-2xl shadow-lg p-8">

        <h1 className="text-3xl font-bold text-green-700 text-center">
          My Profile
        </h1>

        <p className="text-center text-gray-500 mt-2 mb-6">
          Complete your profile
        </p>

        <div className="space-y-4">

          <div>
            <label className="block mb-1 font-medium">
              Full Name
            </label>

            <input
              type="text"
              value={fullName}
              onChange={(e) => setFullName(e.target.value)}
              className="w-full border rounded-lg p-3"
            />
          </div>

          <div>
            <label className="block mb-1 font-medium">
              Email
            </label>

            <input
              type="email"
              value={auth.currentUser?.email || ""}
              readOnly
              className="w-full border rounded-lg p-3 bg-gray-100"
            />
          </div>

          <div>
            <label className="block mb-1 font-medium">
              Department
            </label>

            <select
              value={department}
              onChange={(e) => setDepartment(e.target.value)}
              className="w-full border rounded-lg p-3"
            >
              <option>Taxation</option>
            </select>
          </div>

          <div>
            <label className="block mb-1 font-medium">
             Level
            </label>

            <select
              value={level}
              onChange={(e) => setLevel(e.target.value)}
              className="w-full border rounded-lg p-3"
            >
              <option>100 Level</option>
              <option>200 Level</option>
              <option>300 Level</option>
              <option>400 Level</option>
              <option>500 Level</option>
            </select>
          </div>

          <div>
            <label className="block mb-1 font-medium">
              Phone Number (Optional)
            </label>

            <input
              type="text"
              value={phone}
              onChange={(e) => setPhone(e.target.value)}
              className="w-full border rounded-lg p-3"
            />
          </div>

          {message && (
            <p className="text-center text-sm text-red-600">
              {message}
            </p>
          )}

          <button
            onClick={saveProfile}
            disabled={loading}
            className="w-full bg-green-700 text-white py-3 rounded-lg hover:bg-green-800 disabled:bg-gray-400"
          >
            {loading ? "Saving..." : "Save Profile"}
          </button>

        </div>

      </div>
    </main>
  );
}