"use client";

import {
  FormEvent,
  useEffect,
  useState,
} from "react";
import Link from "next/link";
import {
  addDoc,
  collection,
  doc,
  getDocs,
  serverTimestamp,
  updateDoc,
} from "firebase/firestore";

import { auth, db } from "@/lib/firebase";

const ADMIN_EMAIL =
  "problematitzbest@gmail.com";

interface CBTSettings {
  questionLimit: number;
  secondsPerQuestion: number;
  randomizeQuestions: boolean;
  randomizeOptions: boolean;
  allowReview: boolean;
  showExplanations: boolean;
}

interface Course {
  id: string;
  title: string;
  code: string;
  level: string;
  semester: string;
  description: string;
  cbtSettings: CBTSettings;
}

const DEFAULT_CBT_SETTINGS: CBTSettings = {
  questionLimit: 50,
  secondsPerQuestion: 60,
  randomizeQuestions: true,
  randomizeOptions: true,
  allowReview: true,
  showExplanations: true,
};

function normalizeCBTSettings(
  value: unknown
): CBTSettings {
  if (
    !value ||
    typeof value !== "object"
  ) {
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
        ? settings.questionLimit
        : DEFAULT_CBT_SETTINGS.questionLimit,

    secondsPerQuestion:
      typeof settings.secondsPerQuestion ===
        "number" &&
      settings.secondsPerQuestion > 0
        ? settings.secondsPerQuestion
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

export default function ManageCoursesPage() {
  const [title, setTitle] = useState("");
  const [code, setCode] = useState("");

  const [level, setLevel] = useState(
    "200 LEVEL"
  );

  const [semester, setSemester] =
    useState("First Semester");

  const [description, setDescription] =
    useState("");

  const [
    newCourseCBTSettings,
    setNewCourseCBTSettings,
  ] = useState<CBTSettings>({
    ...DEFAULT_CBT_SETTINGS,
  });

  const [courses, setCourses] = useState<
    Course[]
  >([]);

  const [loadingCourses, setLoadingCourses] =
    useState(true);

  const [addingCourse, setAddingCourse] =
    useState(false);

  const [
    savingCourseId,
    setSavingCourseId,
  ] = useState("");

  const [message, setMessage] = useState("");
  const [success, setSuccess] =
    useState(false);

  async function loadCourses() {
    try {
      setLoadingCourses(true);

      const snapshot = await getDocs(
        collection(db, "courses")
      );

      const courseData: Course[] =
        snapshot.docs.map(
          (courseDocument) => {
            const data =
              courseDocument.data();

            return {
              id: courseDocument.id,

              title:
                typeof data.title === "string"
                  ? data.title
                  : "",

              code:
                typeof data.code === "string"
                  ? data.code
                  : "",

              level:
                typeof data.level === "string"
                  ? data.level
                  : "",

              semester:
                typeof data.semester ===
                "string"
                  ? data.semester
                  : "",

              description:
                typeof data.description ===
                "string"
                  ? data.description
                  : "",

              cbtSettings:
                normalizeCBTSettings(
                  data.cbtSettings
                ),
            };
          }
        );

      courseData.sort((a, b) =>
        `${a.code} ${a.title}`.localeCompare(
          `${b.code} ${b.title}`
        )
      );

      setCourses(courseData);
    } catch (error) {
      console.error(
        "Unable to load courses:",
        error
      );

      setMessage(
        "Unable to load courses."
      );

      setSuccess(false);
    } finally {
      setLoadingCourses(false);
    }
  }

  useEffect(() => {
    void loadCourses();
  }, []);

  function updateNewCourseSetting<
    K extends keyof CBTSettings,
  >(
    setting: K,
    value: CBTSettings[K]
  ) {
    setNewCourseCBTSettings(
      (previousSettings) => ({
        ...previousSettings,
        [setting]: value,
      })
    );
  }

  function updateExistingCourseSetting<
    K extends keyof CBTSettings,
  >(
    courseId: string,
    setting: K,
    value: CBTSettings[K]
  ) {
    setCourses((previousCourses) =>
      previousCourses.map((course) =>
        course.id === courseId
          ? {
              ...course,
              cbtSettings: {
                ...course.cbtSettings,
                [setting]: value,
              },
            }
          : course
      )
    );
  }

  async function handleSubmit(
    event: FormEvent<HTMLFormElement>
  ) {
    event.preventDefault();

    setMessage("");
    setSuccess(false);

    const user = auth.currentUser;

    const userEmail =
      user?.email
        ?.trim()
        .toLowerCase() || "";

    if (
      !user ||
      userEmail !== ADMIN_EMAIL
    ) {
      setMessage(
        "You are not authorized to add courses."
      );

      return;
    }

    if (
      !title.trim() ||
      !code.trim() ||
      !description.trim()
    ) {
      setMessage(
        "Please complete all required fields."
      );

      return;
    }

    if (
      newCourseCBTSettings.questionLimit <
      1
    ) {
      setMessage(
        "Questions per attempt must be at least 1."
      );

      return;
    }

    if (
      newCourseCBTSettings.secondsPerQuestion <
      10
    ) {
      setMessage(
        "Time per question must be at least 10 seconds."
      );

      return;
    }

    try {
      setAddingCourse(true);

      await addDoc(
        collection(db, "courses"),
        {
          title: title.trim(),

          code: code
            .trim()
            .toUpperCase(),

          level,
          semester,

          description:
            description.trim(),

          cbtSettings: {
            ...newCourseCBTSettings,
          },

          createdAt:
            serverTimestamp(),

          createdBy: user.uid,
        }
      );

      setTitle("");
      setCode("");
      setDescription("");

      setNewCourseCBTSettings({
        ...DEFAULT_CBT_SETTINGS,
      });

      setMessage(
        "Course added successfully."
      );

      setSuccess(true);

      await loadCourses();
    } catch (error) {
      console.error(
        "Failed to add course:",
        error
      );

      setMessage(
        "Failed to add course."
      );

      setSuccess(false);
    } finally {
      setAddingCourse(false);
    }
  }

  async function saveCBTSettings(
    course: Course
  ) {
    setMessage("");
    setSuccess(false);

    const user = auth.currentUser;

    const userEmail =
      user?.email
        ?.trim()
        .toLowerCase() || "";

    if (
      !user ||
      userEmail !== ADMIN_EMAIL
    ) {
      setMessage(
        "You are not authorized to update CBT settings."
      );

      return;
    }

    if (
      course.cbtSettings.questionLimit <
      1
    ) {
      setMessage(
        "Questions per attempt must be at least 1."
      );

      return;
    }

    if (
      course.cbtSettings
        .secondsPerQuestion < 10
    ) {
      setMessage(
        "Time per question must be at least 10 seconds."
      );

      return;
    }

    try {
      setSavingCourseId(course.id);

      await updateDoc(
        doc(db, "courses", course.id),
        {
          cbtSettings: {
            ...course.cbtSettings,
          },

          updatedAt:
            serverTimestamp(),

          updatedBy: user.uid,
        }
      );

      setMessage(
        `${course.code} CBT settings saved successfully.`
      );

      setSuccess(true);
    } catch (error) {
      console.error(
        "Unable to save CBT settings:",
        error
      );

      setMessage(
        `Unable to save CBT settings for ${course.code}.`
      );

      setSuccess(false);
    } finally {
      setSavingCourseId("");
    }
  }

  return (
    <main className="min-h-screen bg-gray-100 p-4 sm:p-6 text-gray-950">
      <div className="max-w-6xl mx-auto">
        <Link
          href="/admin"
          className="inline-block mb-6 text-green-800 font-semibold"
        >
          ← Back to Admin Dashboard
        </Link>

        <div className="mb-6">
          <h1 className="text-3xl font-bold text-gray-950">
            Manage Courses
          </h1>

          <p className="mt-2 text-gray-700">
            Add courses and control the CBT
            settings for each course.
          </p>
        </div>

        {message && (
          <div
            className={`mb-6 rounded-xl border p-4 text-center font-semibold ${
              success
                ? "border-green-300 bg-green-50 text-green-900"
                : "border-red-300 bg-red-50 text-red-800"
            }`}
          >
            {message}
          </div>
        )}

        <div className="grid grid-cols-1 xl:grid-cols-2 gap-6 items-start">
          <section className="bg-white rounded-2xl shadow p-5 sm:p-7">
            <h2 className="text-2xl font-bold text-green-800">
              Add Course
            </h2>

            <p className="mt-2 text-gray-700">
              Create a course and set its
              default CBT configuration.
            </p>

            <form
              onSubmit={handleSubmit}
              className="mt-7 space-y-5"
            >
              <div>
                <label className="block mb-2 font-semibold text-gray-900">
                  Course Title
                </label>

                <input
                  type="text"
                  value={title}
                  onChange={(event) =>
                    setTitle(
                      event.target.value
                    )
                  }
                  placeholder="Example: Business Taxation"
                  className="w-full border border-gray-300 rounded-xl p-3 text-gray-950 placeholder:text-gray-500 focus:outline-none focus:ring-2 focus:ring-green-700"
                  required
                />
              </div>

              <div>
                <label className="block mb-2 font-semibold text-gray-900">
                  Course Code
                </label>

                <input
                  type="text"
                  value={code}
                  onChange={(event) =>
                    setCode(
                      event.target.value
                    )
                  }
                  placeholder="Example: TAX-CM 223"
                  className="w-full border border-gray-300 rounded-xl p-3 text-gray-950 placeholder:text-gray-500 focus:outline-none focus:ring-2 focus:ring-green-700"
                  required
                />
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="block mb-2 font-semibold text-gray-900">
                    Level
                  </label>

                  <select
                    value={level}
                    onChange={(event) =>
                      setLevel(
                        event.target.value
                      )
                    }
                    className="w-full border border-gray-300 rounded-xl p-3 bg-white text-gray-950 focus:outline-none focus:ring-2 focus:ring-green-700"
                  >
                    <option value="100 LEVEL">
                      100 LEVEL
                    </option>

                    <option value="200 LEVEL">
                      200 LEVEL
                    </option>

                    <option value="300 LEVEL">
                      300 LEVEL
                    </option>

                    <option value="400 LEVEL">
                      400 LEVEL
                    </option>
                  </select>
                </div>

                <div>
                  <label className="block mb-2 font-semibold text-gray-900">
                    Semester
                  </label>

                  <select
                    value={semester}
                    onChange={(event) =>
                      setSemester(
                        event.target.value
                      )
                    }
                    className="w-full border border-gray-300 rounded-xl p-3 bg-white text-gray-950 focus:outline-none focus:ring-2 focus:ring-green-700"
                  >
                    <option value="First Semester">
                      First Semester
                    </option>

                    <option value="Second Semester">
                      Second Semester
                    </option>
                  </select>
                </div>
              </div>

              <div>
                <label className="block mb-2 font-semibold text-gray-900">
                  Description
                </label>

                <textarea
                  value={description}
                  onChange={(event) =>
                    setDescription(
                      event.target.value
                    )
                  }
                  placeholder="Brief course description"
                  rows={5}
                  className="w-full border border-gray-300 rounded-xl p-3 text-gray-950 placeholder:text-gray-500 focus:outline-none focus:ring-2 focus:ring-green-700"
                  required
                />
              </div>

              <div className="border border-gray-200 bg-gray-50 rounded-2xl p-5">
                <h3 className="text-xl font-bold text-gray-950">
                  CBT Settings
                </h3>

                <p className="mt-1 text-sm text-gray-700">
                  These settings will control
                  how the course CBT works.
                </p>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 mt-5">
                  <div>
                    <label className="block mb-2 font-semibold text-gray-900">
                      Questions Per Attempt
                    </label>

                    <input
                      type="number"
                      min="1"
                      max="500"
                      value={
                        newCourseCBTSettings.questionLimit
                      }
                      onChange={(event) =>
                        updateNewCourseSetting(
                          "questionLimit",
                          Math.max(
                            1,
                            Number(
                              event.target
                                .value
                            ) || 1
                          )
                        )
                      }
                      className="w-full border border-gray-300 rounded-xl p-3 text-gray-950"
                    />
                  </div>

                  <div>
                    <label className="block mb-2 font-semibold text-gray-900">
                      Seconds Per Question
                    </label>

                    <input
                      type="number"
                      min="10"
                      max="600"
                      value={
                        newCourseCBTSettings.secondsPerQuestion
                      }
                      onChange={(event) =>
                        updateNewCourseSetting(
                          "secondsPerQuestion",
                          Math.max(
                            10,
                            Number(
                              event.target
                                .value
                            ) || 10
                          )
                        )
                      }
                      className="w-full border border-gray-300 rounded-xl p-3 text-gray-950"
                    />

                    <p className="mt-1 text-xs text-gray-600">
                      60 seconds equals one
                      minute.
                    </p>
                  </div>
                </div>

                <div className="mt-5 space-y-3">
                  <CheckboxSetting
                    label="Randomize Questions"
                    description="Select and arrange questions randomly for every attempt."
                    checked={
                      newCourseCBTSettings.randomizeQuestions
                    }
                    onChange={(checked) =>
                      updateNewCourseSetting(
                        "randomizeQuestions",
                        checked
                      )
                    }
                  />

                  <CheckboxSetting
                    label="Randomize Answer Options"
                    description="Shuffle the available options for each question."
                    checked={
                      newCourseCBTSettings.randomizeOptions
                    }
                    onChange={(checked) =>
                      updateNewCourseSetting(
                        "randomizeOptions",
                        checked
                      )
                    }
                  />

                  <CheckboxSetting
                    label="Allow Answer Review"
                    description="Allow students to review their answers after submission."
                    checked={
                      newCourseCBTSettings.allowReview
                    }
                    onChange={(checked) =>
                      updateNewCourseSetting(
                        "allowReview",
                        checked
                      )
                    }
                  />

                  <CheckboxSetting
                    label="Show Explanations"
                    description="Display question explanations during answer review."
                    checked={
                      newCourseCBTSettings.showExplanations
                    }
                    onChange={(checked) =>
                      updateNewCourseSetting(
                        "showExplanations",
                        checked
                      )
                    }
                  />
                </div>
              </div>

              <button
                type="submit"
                disabled={addingCourse}
                className="w-full bg-green-800 text-white py-3 rounded-xl font-semibold disabled:bg-gray-400 disabled:cursor-not-allowed"
              >
                {addingCourse
                  ? "Adding Course..."
                  : "Add Course"}
              </button>
            </form>
          </section>

          <section className="bg-white rounded-2xl shadow p-5 sm:p-7">
            <h2 className="text-2xl font-bold text-gray-950">
              Existing Courses
            </h2>

            <p className="mt-2 text-gray-700">
              Configure the CBT for courses
              already on the platform.
            </p>

            <div className="mt-6 space-y-5">
              {loadingCourses ? (
                <div className="py-10 text-center">
                  <div className="w-10 h-10 border-4 border-green-700 border-t-transparent rounded-full animate-spin mx-auto" />

                  <p className="mt-3 text-gray-700">
                    Loading courses...
                  </p>
                </div>
              ) : courses.length === 0 ? (
                <p className="text-gray-700">
                  No courses found.
                </p>
              ) : (
                courses.map((course) => (
                  <article
                    key={course.id}
                    className="border border-gray-200 rounded-2xl p-5"
                  >
                    <div>
                      <p className="font-bold text-green-800">
                        {course.code}
                      </p>

                      <h3 className="text-lg font-bold mt-1 text-gray-950">
                        {course.title}
                      </h3>

                      <p className="text-sm text-gray-700 mt-1">
                        {course.level} •{" "}
                        {course.semester}
                      </p>

                      {course.description && (
                        <p className="text-sm text-gray-700 mt-3 leading-6">
                          {
                            course.description
                          }
                        </p>
                      )}
                    </div>

                    <div className="mt-5 border-t border-gray-200 pt-5">
                      <h4 className="font-bold text-gray-950">
                        CBT Configuration
                      </h4>

                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 mt-4">
                        <div>
                          <label className="block mb-2 text-sm font-semibold text-gray-900">
                            Questions Per
                            Attempt
                          </label>

                          <input
                            type="number"
                            min="1"
                            max="500"
                            value={
                              course
                                .cbtSettings
                                .questionLimit
                            }
                            onChange={(
                              event
                            ) =>
                              updateExistingCourseSetting(
                                course.id,
                                "questionLimit",
                                Math.max(
                                  1,
                                  Number(
                                    event
                                      .target
                                      .value
                                  ) || 1
                                )
                              )
                            }
                            className="w-full border border-gray-300 rounded-xl p-3 text-gray-950"
                          />
                        </div>

                        <div>
                          <label className="block mb-2 text-sm font-semibold text-gray-900">
                            Seconds Per
                            Question
                          </label>

                          <input
                            type="number"
                            min="10"
                            max="600"
                            value={
                              course
                                .cbtSettings
                                .secondsPerQuestion
                            }
                            onChange={(
                              event
                            ) =>
                              updateExistingCourseSetting(
                                course.id,
                                "secondsPerQuestion",
                                Math.max(
                                  10,
                                  Number(
                                    event
                                      .target
                                      .value
                                  ) || 10
                                )
                              )
                            }
                            className="w-full border border-gray-300 rounded-xl p-3 text-gray-950"
                          />
                        </div>
                      </div>

                      <div className="mt-5 space-y-3">
                        <CheckboxSetting
                          label="Randomize Questions"
                          description="Give students a randomized selection and order."
                          checked={
                            course
                              .cbtSettings
                              .randomizeQuestions
                          }
                          onChange={(
                            checked
                          ) =>
                            updateExistingCourseSetting(
                              course.id,
                              "randomizeQuestions",
                              checked
                            )
                          }
                        />

                        <CheckboxSetting
                          label="Randomize Options"
                          description="Shuffle the options under each question."
                          checked={
                            course
                              .cbtSettings
                              .randomizeOptions
                          }
                          onChange={(
                            checked
                          ) =>
                            updateExistingCourseSetting(
                              course.id,
                              "randomizeOptions",
                              checked
                            )
                          }
                        />

                        <CheckboxSetting
                          label="Allow Review"
                          description="Let students review their answers after submission."
                          checked={
                            course
                              .cbtSettings
                              .allowReview
                          }
                          onChange={(
                            checked
                          ) =>
                            updateExistingCourseSetting(
                              course.id,
                              "allowReview",
                              checked
                            )
                          }
                        />

                        <CheckboxSetting
                          label="Show Explanations"
                          description="Show explanations when students review answers."
                          checked={
                            course
                              .cbtSettings
                              .showExplanations
                          }
                          onChange={(
                            checked
                          ) =>
                            updateExistingCourseSetting(
                              course.id,
                              "showExplanations",
                              checked
                            )
                          }
                        />
                      </div>

                      <div className="mt-5 bg-green-50 border border-green-200 rounded-xl p-4">
                        <p className="text-sm font-semibold text-green-950">
                          Current CBT:
                        </p>

                        <p className="text-sm text-green-900 mt-1">
                          {
                            course
                              .cbtSettings
                              .questionLimit
                          }{" "}
                          questions •{" "}
                          {Math.ceil(
                            (course
                              .cbtSettings
                              .questionLimit *
                              course
                                .cbtSettings
                                .secondsPerQuestion) /
                              60
                          )}{" "}
                          minutes
                        </p>
                      </div>

                      <button
                        type="button"
                        onClick={() =>
                          void saveCBTSettings(
                            course
                          )
                        }
                        disabled={
                          savingCourseId ===
                          course.id
                        }
                        className="w-full mt-5 bg-green-800 text-white py-3 rounded-xl font-semibold disabled:bg-gray-400 disabled:cursor-not-allowed"
                      >
                        {savingCourseId ===
                        course.id
                          ? "Saving Settings..."
                          : "Save CBT Settings"}
                      </button>
                    </div>
                  </article>
                ))
              )}
            </div>
          </section>
        </div>
      </div>
    </main>
  );
}

interface CheckboxSettingProps {
  label: string;
  description: string;
  checked: boolean;
  onChange: (checked: boolean) => void;
}

function CheckboxSetting({
  label,
  description,
  checked,
  onChange,
}: CheckboxSettingProps) {
  return (
    <label className="flex items-start gap-3 border border-gray-200 bg-white rounded-xl p-4 cursor-pointer">
      <input
        type="checkbox"
        checked={checked}
        onChange={(event) =>
          onChange(event.target.checked)
        }
        className="mt-1 w-4 h-4 accent-green-800"
      />

      <span>
        <span className="block font-semibold text-gray-950">
          {label}
        </span>

        <span className="block mt-1 text-sm text-gray-700 leading-5">
          {description}
        </span>
      </span>
    </label>
  );
}