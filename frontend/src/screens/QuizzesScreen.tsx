import type { FormEvent, ReactNode } from "react";
import { ErrorBanner } from "../components/Brand";
import { formatDate } from "../utils/date";
import type { CourseSection, QuizDraftQuestion, QuizItem } from "../types";

interface QuizzesPanelProps {
  sections: CourseSection[];
  quizzes: QuizItem[];
  error: string;
  isQuizComposerOpen: boolean;
  isGeneratingQuizzes: boolean;
  generatedQuizDueAt: string;
  isSubmitting: boolean;
  quizSubjectId: string;
  editingQuizId: string | null;
  quizTitle: string;
  quizDescription: string;
  quizDueAt: string;
  quizQuestions: QuizDraftQuestion[];
  onGenerateQuizzes: () => void;
  onCloseComposer: () => void;
  onSaveQuiz: (event: FormEvent<HTMLFormElement>) => void;
  onCopyQuizLink: (quiz: QuizItem) => void;
  onEditQuiz: (quiz: QuizItem) => void;
  onDeleteQuiz: (quiz: QuizItem) => void;
  onStartQuizCreation: (subjectId?: string) => void;
  setQuizTitle: (value: string) => void;
  setQuizDescription: (value: string) => void;
  setQuizDueAt: (value: string) => void;
  setGeneratedQuizDueAt: (value: string) => void;
  setQuizSubjectId: (value: string) => void;
  setQuizQuestionType: (questionIndex: number, type: QuizDraftQuestion["type"]) => void;
  addQuizQuestion: (afterIndex?: number) => void;
  duplicateQuizQuestion: (questionIndex: number) => void;
  removeQuizQuestion: (questionIndex: number) => void;
  updateQuizQuestion: (questionIndex: number, field: "prompt" | "options" | "correctOption", value: string | number, optionIndex?: number) => void;
  pageHeading: (eyebrow: string, title: string, subtitle: string) => ReactNode;
}

export function QuizzesScreen({
  sections,
  quizzes,
  error,
  isQuizComposerOpen,
  isGeneratingQuizzes,
  generatedQuizDueAt,
  isSubmitting,
  quizSubjectId,
  editingQuizId,
  quizTitle,
  quizDescription,
  quizDueAt,
  quizQuestions,
  onGenerateQuizzes,
  onCloseComposer,
  onSaveQuiz,
  onCopyQuizLink,
  onEditQuiz,
  onDeleteQuiz,
  onStartQuizCreation,
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
  pageHeading,
}: QuizzesPanelProps) {
  const subjects = sections.flatMap((section) => section.subjects.map((subject) => ({
    ...subject,
    sectionCode: section.code,
    course: section.course,
  })));
  const quizSubjectOptions = editingQuizId || !quizSubjectId ? subjects : subjects.filter((subject) => subject.id === quizSubjectId);

  return (
    <>
      {pageHeading("Classroom", "Quizzes", "Create auto-graded multiple-choice quizzes for your subjects and share each quiz with its own link.")}
      {error && <ErrorBanner>{error}</ErrorBanner>}
      {!isQuizComposerOpen && (
        <>
          <p className="quiz-count-note">{quizzes.length} quizzes · {subjects.length} assigned subject{subjects.length === 1 ? "" : "s"}</p>
          <div className="quiz-bank-actions">
            <label className="field">Due date and time for generated quizzes (required)
              <input
                required
                type="datetime-local"
                value={generatedQuizDueAt}
                onChange={(event) => setGeneratedQuizDueAt(event.target.value)}
              />
            </label>
            <button
              className="button button-primary"
              type="button"
              disabled={isGeneratingQuizzes || subjects.length === 0 || !generatedQuizDueAt}
              onClick={onGenerateQuizzes}
            >
              {isGeneratingQuizzes ? "Generating quizzes..." : "Generate 10 per subject"}
            </button>
            <span>Fills supported subjects up to 10 quizzes each; existing quizzes are kept.</span>
          </div>
          <div className="quiz-actions-row">
            <button className="button button-secondary" type="button" onClick={() => onStartQuizCreation()}>
              Create quiz
            </button>
          </div>
        </>
      )}
      {isQuizComposerOpen && (
        <form className="quiz-builder" onSubmit={onSaveQuiz}>
          <header className="quiz-builder-toolbar">
            <button className="button button-secondary button-small" type="button" onClick={onCloseComposer}>
              ← Back to quizzes
            </button>
            <div className="quiz-builder-status">{quizQuestions.length} question{quizQuestions.length === 1 ? "" : "s"} · Auto-graded</div>
            <button className="button button-primary" type="submit" disabled={isSubmitting}>
              {isSubmitting ? "Saving..." : editingQuizId ? "Save changes" : "Create quiz"}
            </button>
          </header>
          {error && <ErrorBanner>{error}</ErrorBanner>}
          <section className="quiz-builder-intro">
            <label className="quiz-title-input">
              <span className="sr-only">Quiz title</span>
              <input required maxLength={120} value={quizTitle} onChange={(event) => setQuizTitle(event.target.value)} placeholder="Untitled quiz" />
            </label>
            <label className="field quiz-description">
              <span className="sr-only">Quiz instructions</span>
              <textarea maxLength={2000} rows={2} value={quizDescription} onChange={(event) => setQuizDescription(event.target.value)} placeholder="Form description (optional)" />
            </label>
            <label className="field quiz-due-date">Due date and time (required)
              <input required type="datetime-local" value={quizDueAt} onChange={(event) => setQuizDueAt(event.target.value)} />
              <span>Students cannot submit after this time.</span>
            </label>
            <label className="field quiz-subject-select">Class / subject
              <select required value={quizSubjectId} onChange={(event) => setQuizSubjectId(event.target.value)}>
                <option value="" disabled>Choose an assigned subject</option>
                {quizSubjectOptions.map((subject) => (
                  <option value={subject.id} key={subject.id}>
                    {subject.course} · {subject.sectionCode} — {subject.code} {subject.title}
                  </option>
                ))}
              </select>
            </label>
          </section>
          <div className="quiz-question-list">
            {quizQuestions.map((question, questionIndex) => (
              <section className="quiz-question-editor" key={questionIndex}>
                <div className="quiz-question-toolbar">
                  <span className="quiz-question-number">Question {questionIndex + 1}</span>
                  <label className="quiz-type-select">
                    <span className="sr-only">Question type</span>
                    <select
                      value={question.type}
                      onChange={(event) => setQuizQuestionType(questionIndex, event.target.value as QuizDraftQuestion["type"])}
                    >
                      <option value="MULTIPLE_CHOICE">Multiple choice</option>
                      <option value="TRUE_FALSE">True / False</option>
                    </select>
                  </label>
                </div>
                <label className="field quiz-question-prompt">
                  <span className="sr-only">Question prompt</span>
                  <textarea
                    rows={2}
                    value={question.prompt}
                    onChange={(event) => updateQuizQuestion(questionIndex, "prompt", event.target.value)}
                    placeholder="Write your question here"
                  />
                </label>
                <div className="quiz-option-list">
                  {question.options.map((option, optionIndex) => (
                    <label className="field quiz-option" key={`${questionIndex}-${optionIndex}`}>
                      <span>{String.fromCharCode(65 + optionIndex)}</span>
                      <input
                        value={option}
                        onChange={(event) => updateQuizQuestion(questionIndex, "options", event.target.value, optionIndex)}
                        placeholder={`Option ${String.fromCharCode(65 + optionIndex)}`}
                      />
                    </label>
                  ))}
                </div>
                <div className="quiz-answer-meta">
                  <label className="field quiz-correct-answer">
                    Correct answer
                    <select
                      value={question.correctOption}
                      onChange={(event) => updateQuizQuestion(questionIndex, "correctOption", Number(event.target.value))}
                    >
                      {question.options.map((_, index) => (
                        <option value={index} key={index}>Option {String.fromCharCode(65 + index)}</option>
                      ))}
                    </select>
                  </label>
                  <div className="quiz-editor-actions">
                    <button className="button button-secondary button-small" type="button" onClick={() => duplicateQuizQuestion(questionIndex)}>
                      Duplicate
                    </button>
                    <button className="button button-danger button-small" type="button" onClick={() => removeQuizQuestion(questionIndex)} disabled={quizQuestions.length === 1}>
                      Remove
                    </button>
                  </div>
                </div>
              </section>
            ))}
          </div>
          <div className="quiz-builder-footer">
            <button className="button button-secondary" type="button" onClick={() => addQuizQuestion()}>
              + Add question
            </button>
          </div>
        </form>
      )}
      {!isQuizComposerOpen && (
        <section className="panel spaced-panel">
          <div className="panel-heading">
            <h2>Quiz list</h2>
            <span className="card-meta">{quizzes.length} quiz{quizzes.length === 1 ? "" : "zes"} total</span>
          </div>
          {quizzes.length
            ? <div className="quiz-list">{quizzes.map((quiz) => (
              <article className="quiz-card" key={quiz.id}>
                <div className="quiz-card-heading">
                  <div>
                    <h3>{quiz.title}</h3>
                    <p className="card-meta">{quiz.subject.title} · {quiz.subject.section.code} · {quiz.questions.length} questions</p>
                  </div>
                  <div className="quiz-card-actions">
                    <button className="button button-secondary button-small" type="button" onClick={() => onCopyQuizLink(quiz)}>
                      Copy quiz link
                    </button>
                    <button className="button button-secondary button-small" type="button" onClick={() => onEditQuiz(quiz)}>
                      Edit
                    </button>
                    <button className="button button-danger button-small" type="button" onClick={() => onDeleteQuiz(quiz)}>
                      Delete
                    </button>
                  </div>
                </div>
                {quiz.description && <p className="quiz-description-text">{quiz.description}</p>}
                {quiz.dueAt && <p className="quiz-due-date">Due {formatDate(quiz.dueAt)}</p>}
              </article>
            ))}</div>
            : <div className="empty-state">No quizzes yet. Create a quiz to share a link with your class.</div>}
        </section>
      )}
    </>
  );
}
