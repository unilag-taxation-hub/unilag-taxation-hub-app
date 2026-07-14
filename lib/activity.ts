import {
  addDoc,
  collection,
  serverTimestamp,
} from "firebase/firestore";
import { db } from "@/lib/firebase";

export type ActivityType =
  | "note_opened"
  | "note_completed"
  | "note_uncompleted"
  | "cbt_completed";

interface SaveActivityOptions {
  userId: string;
  type: ActivityType;
  courseId: string;
  courseCode?: string;
  courseTitle?: string;
  title: string;
  description: string;
  percentage?: number;
  score?: number;
  totalQuestions?: number;
}

export async function saveActivity({
  userId,
  type,
  courseId,
  courseCode = "",
  courseTitle = "",
  title,
  description,
  percentage,
  score,
  totalQuestions,
}: SaveActivityOptions) {
  if (!userId) {
    return;
  }

  try {
    await addDoc(
      collection(db, "users", userId, "activities"),
      {
        type,
        courseId,
        courseCode,
        courseTitle,
        title,
        description,
        percentage:
          typeof percentage === "number" ? percentage : null,
        score: typeof score === "number" ? score : null,
        totalQuestions:
          typeof totalQuestions === "number"
            ? totalQuestions
            : null,
        createdAt: serverTimestamp(),
      }
    );
  } catch (error) {
    console.error("Unable to save recent activity:", error);
  }
}