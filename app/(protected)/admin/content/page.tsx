"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import {
  collection,
  deleteDoc,
  doc,
  getDocs,
  orderBy,
  query,
  updateDoc,
} from "firebase/firestore";
import { auth, db } from "@/lib/firebase";

const ADMIN_EMAIL = "problematitzbest@gmail.com";

type ContentType =
  | "notes"
  | "mcqs"
  | "germanQuestions"
  | "theoryQuestions";

interface Course {
  id: string;
  title: string;
  code: string;
}

interface ContentItem {
  id: string;
  title?: string;
  description?: string;
  content?: string;
  question?: string;
  options?: string[];
  correctAnswer?: string;
  explanation?: string;
  answerGuide?: string;
  order?: number;
}

const contentLabels: Record<ContentType, string> = {
  notes: "Notes",
  mcqs: "MCQs",
  germanQuestions: "German Questions",
  theoryQuestions: "Theory Questions",
};

export default function ManageContentPage() {
  const [courses, setCourses] = useState<Course[]>([]);
  const [selectedCourse, setSelectedCourse] = useState("");
  const [contentType, setContentType] =
    useState<ContentType>("notes");

  const [items, setItems] = useState<ContentItem[]>([]);
  const [editingItem, setEditingItem] =
    useState<ContentItem | null>(null);

  const [loadingCourses, setLoadingCourses] = useState(true);
  const [loadingContent, setLoadingContent] = useState(false);
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState("");
  const [success, setSuccess] = useState(false);

  useEffect(() => {
    async function loadCourses() {
      try {
        const snapshot = await getDocs(collection(db, "courses"));

        const courseData: Course[] = snapshot.docs.map(
          (courseDocument) => ({
            id: courseDocument.id,
            ...(courseDocument.data() as Omit<Course, "id">),
          })
        );

        courseData.sort((a, b) =>
          `${a.code} ${a.title}`.localeCompare(
            `${b.code} ${b.title}`
          )
        );

        setCourses(courseData);

        if (courseData.length > 0) {
          setSelectedCourse(courseData[0].id);
        }
      } catch (error) {
        console.error(error);
        setMessage("Unable to load courses.");
        setSuccess(false);
      } finally {
        setLoadingCourses(false);
      }
    }

    loadCourses();
  }, []);

  useEffect(() => {
    if (!selectedCourse) {
      setItems([]);
      return;
    }

    loadContent();
  }, [selectedCourse, contentType]);

  async function loadContent() {
    if (!selectedCourse) return;

    try {
      setLoadingContent(true);
      setMessage("");
      setEditingItem(null);

      const contentReference = collection(
        db,
        "courses",
        selectedCourse,
        contentType
      );

      const contentQuery = query(
        contentReference,
        orderBy("order", "asc")
      );

      const snapshot = await getDocs(contentQuery);

      const contentData: ContentItem[] = snapshot.docs.map(
        (contentDocument) => ({
          id: contentDocument.id,
          ...(contentDocument.data() as Omit<ContentItem, "id">),
        })
      );

      setItems(contentData);
    } catch (error) {
      console.error(error);
      setMessage("Unable to load this content.");
      setSuccess(false);
    } finally {
      setLoadingContent(false);
    }
  }

  function verifyAdmin() {
    const userEmail =
      auth.currentUser?.email?.trim().toLowerCase();

    return userEmail === ADMIN_EMAIL;
  }

  function updateEditingField(
    field: keyof ContentItem,
    value: string | number | string[]
  ) {
    if (!editingItem) return;

    setEditingItem({
      ...editingItem,
      [field]: value,
    });
  }

  async function saveChanges() {
    if (!editingItem || !selectedCourse) return;

    setMessage("");
    setSuccess(false);

    if (!verifyAdmin()) {
      setMessage("You are not authorized to edit content.");
      return;
    }

    const orderNumber = Number(editingItem.order);

    if (!Number.isInteger(orderNumber) || orderNumber < 1) {
      setMessage("Order must be a whole number starting from 1.");
      return;
    }

    try {
      setSaving(true);

      const documentReference = doc(
        db,
        "courses",
        selectedCourse,
        contentType,
        editingItem.id
      );

      if (contentType === "notes") {
        if (
          !editingItem.title?.trim() ||
          !editingItem.description?.trim() ||
          !editingItem.content?.trim()
        ) {
          setMessage("Please complete all note fields.");
          return;
        }

        await updateDoc(documentReference, {
          title: editingItem.title.trim(),
          description: editingItem.description.trim(),
          content: editingItem.content.trim(),
          order: orderNumber,
        });
      }

      if (contentType === "mcqs") {
        if (
          !editingItem.question?.trim() ||
          !editingItem.options ||
          editingItem.options.some((option) => !option.trim()) ||
          !editingItem.correctAnswer?.trim()
        ) {
          setMessage("Please complete all MCQ fields.");
          return;
        }

        if (
          !editingItem.options.includes(
            editingItem.correctAnswer
          )
        ) {
          setMessage(
            "The correct answer must match one of the options."
          );
          return;
        }

        await updateDoc(documentReference, {
          question: editingItem.question.trim(),
          options: editingItem.options.map((option) =>
            option.trim()
          ),
          correctAnswer: editingItem.correctAnswer.trim(),
          explanation:
            editingItem.explanation?.trim() || "",
          order: orderNumber,
        });
      }

      if (contentType === "germanQuestions") {
        if (
          !editingItem.question?.trim() ||
          !editingItem.correctAnswer?.trim()
        ) {
          setMessage(
            "Please enter the question and model answer."
          );
          return;
        }

        await updateDoc(documentReference, {
          question: editingItem.question.trim(),
          correctAnswer: editingItem.correctAnswer.trim(),
          explanation:
            editingItem.explanation?.trim() || "",
          order: orderNumber,
        });
      }

      if (contentType === "theoryQuestions") {
        if (
          !editingItem.question?.trim() ||
          !editingItem.answerGuide?.trim()
        ) {
          setMessage(
            "Please enter the question and answer guide."
          );
          return;
        }

        await updateDoc(documentReference, {
          question: editingItem.question.trim(),
          answerGuide: editingItem.answerGuide.trim(),
          order: orderNumber,
        });
      }

      setMessage("Changes saved successfully.");
      setSuccess(true);
      setEditingItem(null);

      await loadContent();
    } catch (error) {
      console.error(error);
      setMessage("Failed to save changes.");
      setSuccess(false);
    } finally {
      setSaving(false);
    }
  }

  async function deleteItem(item: ContentItem) {
    if (!selectedCourse) return;

    if (!verifyAdmin()) {
      setMessage("You are not authorized to delete content.");
      setSuccess(false);
      return;
    }

    const itemName =
      item.title ||
      item.question ||
      "this content item";

    const confirmed = window.confirm(
      `Delete "${itemName}" permanently?`
    );

    if (!confirmed) return;

    try {
      await deleteDoc(
        doc(
          db,
          "courses",
          selectedCourse,
          contentType,
          item.id
        )
      );

      setMessage("Content deleted successfully.");
      setSuccess(true);

      if (editingItem?.id === item.id) {
        setEditingItem(null);
      }

      await loadContent();
    } catch (error) {
      console.error(error);
      setMessage("Failed to delete content.");
      setSuccess(false);
    }
  }

  function renderItemTitle(item: ContentItem) {
    return item.title || item.question || "Untitled item";
  }

  function renderEditor() {
    if (!editingItem) return null;

    return (
      <section className="bg-white rounded-2xl shadow-lg p-7">
        <div className="flex items-start justify-between gap-4">
          <div>
            <p className="text-sm font-semibold text-green-700">
              Editing {contentLabels[contentType]}
            </p>

            <h2 className="text-2xl font-bold mt-1">
              Edit Content
            </h2>
          </div>

          <button
            type="button"
            onClick={() => setEditingItem(null)}
            className="text-gray-500 hover:text-red-600"
          >
            ✕ Close
          </button>
        </div>

        <div className="mt-6 space-y-5">
          {contentType === "notes" && (
            <>
              <div>
                <label className="block mb-1 font-medium">
                  Note Title
                </label>

                <input
                  value={editingItem.title || ""}
                  onChange={(event) =>
                    updateEditingField(
                      "title",
                      event.target.value
                    )
                  }
                  className="w-full border rounded-xl p-3"
                />
              </div>

              <div>
                <label className="block mb-1 font-medium">
                  Description
                </label>

                <textarea
                  value={editingItem.description || ""}
                  onChange={(event) =>
                    updateEditingField(
                      "description",
                      event.target.value
                    )
                  }
                  rows={3}
                  className="w-full border rounded-xl p-3"
                />
              </div>

              <div>
                <label className="block mb-1 font-medium">
                  Full Note Content
                </label>

                <textarea
                  value={editingItem.content || ""}
                  onChange={(event) =>
                    updateEditingField(
                      "content",
                      event.target.value
                    )
                  }
                  rows={14}
                  className="w-full border rounded-xl p-3"
                />
              </div>
            </>
          )}

          {contentType === "mcqs" && (
            <>
              <div>
                <label className="block mb-1 font-medium">
                  Question
                </label>

                <textarea
                  value={editingItem.question || ""}
                  onChange={(event) =>
                    updateEditingField(
                      "question",
                      event.target.value
                    )
                  }
                  rows={4}
                  className="w-full border rounded-xl p-3"
                />
              </div>

              {(editingItem.options || []).map(
                (option, index) => (
                  <div key={index}>
                    <label className="block mb-1 font-medium">
                      Option {String.fromCharCode(65 + index)}
                    </label>

                    <input
                      value={option}
                      onChange={(event) => {
                        const updatedOptions = [
                          ...(editingItem.options || []),
                        ];

                        updatedOptions[index] =
                          event.target.value;

                        updateEditingField(
                          "options",
                          updatedOptions
                        );
                      }}
                      className="w-full border rounded-xl p-3"
                    />
                  </div>
                )
              )}

              <div>
                <label className="block mb-1 font-medium">
                  Correct Answer
                </label>

                <select
                  value={editingItem.correctAnswer || ""}
                  onChange={(event) =>
                    updateEditingField(
                      "correctAnswer",
                      event.target.value
                    )
                  }
                  className="w-full border rounded-xl p-3 bg-white"
                >
                  {(editingItem.options || []).map(
                    (option, index) => (
                      <option key={index} value={option}>
                        Option {String.fromCharCode(65 + index)} —{" "}
                        {option}
                      </option>
                    )
                  )}
                </select>
              </div>

              <div>
                <label className="block mb-1 font-medium">
                  Explanation
                </label>

                <textarea
                  value={editingItem.explanation || ""}
                  onChange={(event) =>
                    updateEditingField(
                      "explanation",
                      event.target.value
                    )
                  }
                  rows={4}
                  className="w-full border rounded-xl p-3"
                />
              </div>
            </>
          )}

          {contentType === "germanQuestions" && (
            <>
              <div>
                <label className="block mb-1 font-medium">
                  Question
                </label>

                <textarea
                  value={editingItem.question || ""}
                  onChange={(event) =>
                    updateEditingField(
                      "question",
                      event.target.value
                    )
                  }
                  rows={5}
                  className="w-full border rounded-xl p-3"
                />
              </div>

              <div>
                <label className="block mb-1 font-medium">
                  Model Answer
                </label>

                <textarea
                  value={editingItem.correctAnswer || ""}
                  onChange={(event) =>
                    updateEditingField(
                      "correctAnswer",
                      event.target.value
                    )
                  }
                  rows={7}
                  className="w-full border rounded-xl p-3"
                />
              </div>

              <div>
                <label className="block mb-1 font-medium">
                  Explanation
                </label>

                <textarea
                  value={editingItem.explanation || ""}
                  onChange={(event) =>
                    updateEditingField(
                      "explanation",
                      event.target.value
                    )
                  }
                  rows={4}
                  className="w-full border rounded-xl p-3"
                />
              </div>
            </>
          )}

          {contentType === "theoryQuestions" && (
            <>
              <div>
                <label className="block mb-1 font-medium">
                  Theory Question
                </label>

                <textarea
                  value={editingItem.question || ""}
                  onChange={(event) =>
                    updateEditingField(
                      "question",
                      event.target.value
                    )
                  }
                  rows={5}
                  className="w-full border rounded-xl p-3"
                />
              </div>

              <div>
                <label className="block mb-1 font-medium">
                  Answer Guide
                </label>

                <textarea
                  value={editingItem.answerGuide || ""}
                  onChange={(event) =>
                    updateEditingField(
                      "answerGuide",
                      event.target.value
                    )
                  }
                  rows={9}
                  className="w-full border rounded-xl p-3"
                />
              </div>
            </>
          )}

          <div>
            <label className="block mb-1 font-medium">
              Order
            </label>

            <input
              type="number"
              min="1"
              step="1"
              value={editingItem.order || 1}
              onChange={(event) =>
                updateEditingField(
                  "order",
                  Number(event.target.value)
                )
              }
              className="w-full border rounded-xl p-3"
            />
          </div>

          <button
            type="button"
            onClick={saveChanges}
            disabled={saving}
            className="w-full bg-green-700 text-white py-3 rounded-xl font-semibold disabled:bg-gray-400"
          >
            {saving ? "Saving Changes..." : "Save Changes"}
          </button>
        </div>
      </section>
    );
  }

  return (
    <main className="min-h-screen bg-gray-100 p-6">
      <div className="max-w-6xl mx-auto">
        <Link
          href="/admin"
          className="inline-block mb-6 text-green-700 font-semibold"
        >
          ← Back to Admin Dashboard
        </Link>

        <div className="bg-green-700 text-white rounded-2xl p-7 shadow-lg">
          <p className="text-green-100">Administrator</p>

          <h1 className="text-3xl font-bold mt-1">
            Manage Existing Content
          </h1>

          <p className="mt-2 text-green-100">
            View, edit or delete notes and questions.
          </p>
        </div>

        <section className="bg-white rounded-2xl shadow p-6 mt-6">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
            <div>
              <label className="block mb-1 font-medium">
                Select Course
              </label>

              {loadingCourses ? (
                <p className="text-gray-500">
                  Loading courses...
                </p>
              ) : (
                <select
                  value={selectedCourse}
                  onChange={(event) =>
                    setSelectedCourse(event.target.value)
                  }
                  className="w-full border rounded-xl p-3 bg-white"
                >
                  {courses.map((course) => (
                    <option key={course.id} value={course.id}>
                      {course.code} — {course.title}
                    </option>
                  ))}
                </select>
              )}
            </div>

            <div>
              <label className="block mb-1 font-medium">
                Content Type
              </label>

              <select
                value={contentType}
                onChange={(event) =>
                  setContentType(
                    event.target.value as ContentType
                  )
                }
                className="w-full border rounded-xl p-3 bg-white"
              >
                <option value="notes">Notes</option>
                <option value="mcqs">MCQs</option>
                <option value="germanQuestions">
                  German Questions
                </option>
                <option value="theoryQuestions">
                  Theory Questions
                </option>
              </select>
            </div>
          </div>

          {message && (
            <p
              className={`mt-5 text-center font-medium ${
                success ? "text-green-700" : "text-red-600"
              }`}
            >
              {message}
            </p>
          )}
        </section>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mt-6">
          <section className="bg-white rounded-2xl shadow p-7">
            <div className="flex justify-between items-center">
              <h2 className="text-2xl font-bold">
                Existing {contentLabels[contentType]}
              </h2>

              <button
                type="button"
                onClick={loadContent}
                className="text-green-700 font-semibold"
              >
                Refresh
              </button>
            </div>

            <div className="mt-5 space-y-4">
              {loadingContent ? (
                <p className="text-gray-500">
                  Loading content...
                </p>
              ) : items.length === 0 ? (
                <p className="text-gray-500">
                  No {contentLabels[contentType].toLowerCase()} found
                  for this course.
                </p>
              ) : (
                items.map((item) => (
                  <div
                    key={item.id}
                    className="border rounded-xl p-4"
                  >
                    <p className="text-sm text-green-700 font-semibold">
                      Order {item.order || "Not set"}
                    </p>

                    <h3 className="font-bold mt-1">
                      {renderItemTitle(item)}
                    </h3>

                    {item.description && (
                      <p className="text-sm text-gray-600 mt-2">
                        {item.description}
                      </p>
                    )}

                    <div className="flex gap-3 mt-4">
                      <button
                        type="button"
                        onClick={() =>
                          setEditingItem({
                            ...item,
                            options: item.options
                              ? [...item.options]
                              : undefined,
                          })
                        }
                        className="flex-1 bg-green-700 text-white py-2 rounded-lg"
                      >
                        Edit
                      </button>

                      <button
                        type="button"
                        onClick={() => deleteItem(item)}
                        className="flex-1 bg-red-600 text-white py-2 rounded-lg"
                      >
                        Delete
                      </button>
                    </div>
                  </div>
                ))
              )}
            </div>
          </section>

          {editingItem ? (
            renderEditor()
          ) : (
            <section className="bg-white rounded-2xl shadow p-7 flex items-center justify-center text-center">
              <div>
                <p className="text-5xl">✏️</p>

                <h2 className="text-2xl font-bold mt-4">
                  Select an Item
                </h2>

                <p className="text-gray-600 mt-2">
                  Click Edit beside an item to update its content.
                </p>
              </div>
            </section>
          )}
        </div>
      </div>
    </main>
  );
}