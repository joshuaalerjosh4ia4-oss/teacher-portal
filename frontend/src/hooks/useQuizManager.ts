import { useCallback, useState } from "react";
import type { Dispatch, FormEvent, SetStateAction } from "react";
import { deleteQuiz, generateSubjectQuizzes, listTeacherQuizzes, saveQuiz } from "../services/quizService";
import { getQuizCreationSubjectId, isQuizCreationPath, type Page } from "../navigation/routes";
import { toLocalDateTimeInput } from "../utils/date";
import type { QuizDraftQuestion, QuizItem } from "../types";

const emptyQuestion = (): QuizDraftQuestion => ({
  type: "MULTIPLE_CHOICE",
  prompt: "",
  options: ["", "", "", ""],
  correctOption: 0,
});

interface UseQuizManagerOptions {
  token: string | null;
  setQuizzes: Dispatch<SetStateAction<QuizItem[]>>;
  setError: (message: string) => void;
  setNotice: (message: string) => void;
  setIsSubmitting: Dispatch<SetStateAction<boolean>>;
  setPage: Dispatch<SetStateAction<Page>>;
  setIsPostComposerOpen: Dispatch<SetStateAction<boolean>>;
}

export function useQuizManager({
  token,
  setQuizzes,
  setError,
  setNotice,
  setIsSubmitting,
  setPage,
  setIsPostComposerOpen,
}: UseQuizManagerOptions) {
  const [isQuizComposerOpen, setIsQuizComposerOpen] = useState(() => isQuizCreationPath());
  const [editingQuizId, setEditingQuizId] = useState<string | null>(null);
  const [quizTitle, setQuizTitle] = useState("");
  const [quizDescription, setQuizDescription] = useState("");
  const [quizDueAt, setQuizDueAt] = useState("");
  const [generatedQuizDueAt, setGeneratedQuizDueAt] = useState("");
  const [quizSubjectId, setQuizSubjectId] = useState(() => getQuizCreationSubjectId() ?? "");
  const [quizQuestions, setQuizQuestions] = useState<QuizDraftQuestion[]>([emptyQuestion()]);
  const [isGeneratingQuizzes, setIsGeneratingQuizzes] = useState(false);

  const syncFromPath = useCallback((pathname: string) => {
    setIsQuizComposerOpen(isQuizCreationPath(pathname));
    setQuizSubjectId(getQuizCreationSubjectId(pathname) ?? "");
    setEditingQuizId(null);
    setQuizTitle("");
    setQuizDescription("");
    setQuizDueAt("");
    setQuizQuestions([emptyQuestion()]);
  }, []);

  const startQuizCreation = useCallback((subjectId?: string) => {
    setIsPostComposerOpen(false);
    setEditingQuizId(null);
    setQuizTitle("");
    setQuizDescription("");
    setQuizDueAt("");
    setQuizSubjectId(subjectId ?? "");
    setQuizQuestions([emptyQuestion()]);
    setIsQuizComposerOpen(true);
    setPage("quizzes");
    window.history.pushState(
      null,
      "",
      subjectId ? `/quizzes/create/${encodeURIComponent(subjectId)}` : "/quizzes/create",
    );
    setError("");
  }, [setError, setIsPostComposerOpen, setPage]);

  const closeQuizComposer = useCallback(() => {
    setIsQuizComposerOpen(false);
    window.history.pushState(null, "", "/quizzes");
  }, []);
  const dismissQuizComposer = useCallback(() => setIsQuizComposerOpen(false), []);

  const startQuizEditing = useCallback((quiz: QuizItem) => {
    window.history.pushState(null, "", "/quizzes");
    setPage("quizzes");
    setEditingQuizId(quiz.id);
    setQuizTitle(quiz.title);
    setQuizDescription(quiz.description);
    setQuizDueAt(toLocalDateTimeInput(quiz.dueAt));
    setQuizSubjectId(quiz.subject.id);
    setQuizQuestions(quiz.questions.map(({ prompt, options, correctOption }) => ({
      type: options.length === 2 && options[0] === "True" && options[1] === "False"
        ? "TRUE_FALSE"
        : "MULTIPLE_CHOICE",
      prompt,
      options: [...options],
      correctOption,
    })));
    setIsQuizComposerOpen(true);
    setError("");
  }, [setError, setPage]);

  const addQuizQuestion = useCallback((afterIndex?: number) => {
    setQuizQuestions((current) => {
      if (current.length >= 50) return current;
      const insertionIndex = afterIndex ?? current.length - 1;
      return [
        ...current.slice(0, insertionIndex + 1),
        emptyQuestion(),
        ...current.slice(insertionIndex + 1),
      ];
    });
  }, []);

  const duplicateQuizQuestion = useCallback((questionIndex: number) => {
    setQuizQuestions((current) => {
      if (current.length >= 50 || !current[questionIndex]) return current;
      const question = current[questionIndex];
      return [
        ...current.slice(0, questionIndex + 1),
        { ...question, options: [...question.options] },
        ...current.slice(questionIndex + 1),
      ];
    });
  }, []);

  const removeQuizQuestion = useCallback((questionIndex: number) => {
    setQuizQuestions((current) => current.length > 1
      ? current.filter((_, index) => index !== questionIndex)
      : current);
  }, []);

  const setQuizQuestionType = useCallback((questionIndex: number, type: QuizDraftQuestion["type"]) => {
    setQuizQuestions((current) => current.map((question, index) => {
      if (index !== questionIndex) return question;
      if (type === "TRUE_FALSE") return { ...question, type, options: ["True", "False"], correctOption: 0 };
      return { ...question, type, options: ["", "", "", ""], correctOption: 0 };
    }));
  }, []);

  const updateQuizQuestion = useCallback((
    questionIndex: number,
    field: "prompt" | "options" | "correctOption",
    value: string | number,
    optionIndex?: number,
  ) => {
    setQuizQuestions((current) => current.map((question, index) => {
      if (index !== questionIndex) return question;
      if (field === "prompt") return { ...question, prompt: String(value) };
      if (field === "correctOption") return { ...question, correctOption: Number(value) };
      const options = [...question.options];
      if (typeof optionIndex === "number" && optionIndex >= 0 && optionIndex < options.length) {
        options[optionIndex] = String(value);
      }
      return { ...question, options };
    }));
  }, []);

  async function handleSaveQuiz(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!token) return;
    const dueAt = quizDueAt ? new Date(quizDueAt) : null;
    if (!dueAt || Number.isNaN(dueAt.getTime())) {
      setError("Choose a valid due date and time for this quiz or exam.");
      return;
    }
    if (quizQuestions.some((question) => !question.prompt.trim() || question.options.some((option) => !option.trim()))) {
      setError("Complete each question and all answer choices before saving.");
      return;
    }

    setIsSubmitting(true);
    setError("");
    try {
      const savedQuiz = await saveQuiz(token, editingQuizId, {
        subjectId: quizSubjectId,
        title: quizTitle,
        description: quizDescription,
        dueAt: dueAt.toISOString(),
        questions: quizQuestions.map((question) => ({
          prompt: question.prompt.trim(),
          options: question.options.map((option) => option.trim()),
          correctOption: question.correctOption,
        })),
      });
      setQuizzes((current) => editingQuizId
        ? current.map((quiz) => quiz.id === savedQuiz.id ? savedQuiz : quiz)
        : [savedQuiz, ...current]);
      setNotice(editingQuizId ? "Quiz updated." : "Quiz created. Copy its link to share with students.");
      setIsQuizComposerOpen(false);
      window.history.pushState(null, "", "/quizzes");
    } catch (error) {
      setError(error instanceof Error ? error.message : "Could not save the quiz.");
    } finally {
      setIsSubmitting(false);
    }
  }

  async function handleGenerateQuizzes() {
    if (!token || isGeneratingQuizzes) return;
    const dueAt = generatedQuizDueAt ? new Date(generatedQuizDueAt) : null;
    if (!dueAt || Number.isNaN(dueAt.getTime())) {
      setError("Choose a valid due date and time for the generated quizzes.");
      return;
    }
    if (!window.confirm("Generate quizzes for supported assigned subjects until each has 10? Existing quizzes will be kept.")) return;

    setIsGeneratingQuizzes(true);
    setError("");
    setNotice("");
    try {
      const result = await generateSubjectQuizzes(token, dueAt.toISOString());
      setQuizzes(await listTeacherQuizzes(token));
      const skippedMessage = result.skippedSubjects.length
        ? ` Unsupported subjects skipped: ${result.skippedSubjects.map((subject) => `${subject.code} (${subject.title})`).join(", ")}.`
        : "";
      setNotice(
        result.generatedCount
          ? `Generated ${result.generatedCount} ${result.generatedCount === 1 ? "quiz" : "quizzes"} for ${result.subjectsUpdated} subject${result.subjectsUpdated === 1 ? "" : "s"}.${skippedMessage}`
          : `${result.skippedSubjects.length ? "No new quizzes were needed." : "All supported subjects already have 10 quizzes."}${skippedMessage}`,
      );
    } catch (error) {
      setError(error instanceof Error ? error.message : "Could not generate subject quizzes.");
    } finally {
      setIsGeneratingQuizzes(false);
    }
  }

  async function handleDeleteQuiz(quiz: QuizItem) {
    if (!window.confirm(`Delete "${quiz.title}" and all of its quiz results?`)) return;
    if (!token) return;
    setError("");
    try {
      await deleteQuiz(token, quiz.id);
      setQuizzes((current) => current.filter((item) => item.id !== quiz.id));
      setNotice("Quiz and its results deleted.");
    } catch (error) {
      setError(error instanceof Error ? error.message : "Could not delete the quiz.");
    }
  }

  async function copyQuizLink(quiz: QuizItem) {
    const shareUrl = `${window.location.origin}/quiz/${encodeURIComponent(quiz.shareCode)}`;
    try {
      await navigator.clipboard.writeText(shareUrl);
      setNotice("Quiz link copied. Anyone with the link can take this quiz.");
    } catch {
      setError(`Could not copy the link. Copy it manually: ${shareUrl}`);
    }
  }

  return {
    isQuizComposerOpen,
    isGeneratingQuizzes,
    editingQuizId,
    quizTitle,
    quizDescription,
    quizDueAt,
    generatedQuizDueAt,
    quizSubjectId,
    quizQuestions,
    setQuizTitle,
    setQuizDescription,
    setQuizDueAt,
    setGeneratedQuizDueAt,
    setQuizSubjectId,
    setQuizQuestionType,
    addQuizQuestion,
    duplicateQuizQuestion,
    removeQuizQuestion,
    updateQuizQuestion,
    syncFromPath,
    startQuizCreation,
    closeQuizComposer,
    dismissQuizComposer,
    startQuizEditing,
    handleSaveQuiz,
    handleGenerateQuizzes,
    handleDeleteQuiz,
    copyQuizLink,
  };
}
