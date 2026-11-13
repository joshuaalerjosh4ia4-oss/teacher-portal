import { useEffect, useState } from "react";
import type { FormEvent } from "react";
import { ErrorBanner, Logo } from "../components/Brand";
import { request } from "../api/client";
import { formatDate } from "../utils/date";
import type { PublicQuiz, QuizGrade } from "../types";

export function PublicQuizScreen({ shareCode }: { shareCode: string }) {
  const [quiz, setQuiz] = useState<PublicQuiz | null>(null);
  const [grade, setGrade] = useState<QuizGrade | null>(null);
  const [error, setError] = useState("");
  const [isLoading, setIsLoading] = useState(true);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [currentTime, setCurrentTime] = useState(Date.now());

  useEffect(() => {
    if (!quiz?.dueAt) return;
    const timer = window.setInterval(() => setCurrentTime(Date.now()), 1000);
    return () => window.clearInterval(timer);
  }, [quiz?.dueAt]);

  const isQuizClosed = Boolean(quiz?.dueAt && currentTime >= Date.parse(quiz.dueAt));

  useEffect(() => {
    let active = true;

    void request<PublicQuiz>(`/api/public/quizzes/${encodeURIComponent(shareCode)}`, null)
      .then((loadedQuiz) => {
        if (active) setQuiz(loadedQuiz);
      })
      .catch((loadError: unknown) => {
        if (active) setError(loadError instanceof Error ? loadError.message : "Could not load this quiz.");
      })
      .finally(() => {
        if (active) setIsLoading(false);
      });

    return () => {
      active = false;
    };
  }, [shareCode]);

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!quiz) return;

    const formData = new FormData(event.currentTarget);
    const selectedAnswers = quiz.questions.map((question) => Number(formData.get(question.id)));

    if (selectedAnswers.some((answer) => !Number.isInteger(answer) || answer < 0)) {
      setError("Choose an answer for every question before submitting.");
      return;
    }

    setIsSubmitting(true);
    setError("");

    try {
      const result = await request<QuizGrade>(`/api/public/quizzes/${encodeURIComponent(shareCode)}/submissions`, null, {
        method: "POST",
        body: { studentName: String(formData.get("studentName") ?? ""), answers: selectedAnswers },
      });
      setGrade(result);
    } catch (submitError) {
      setError(submitError instanceof Error ? submitError.message : "Could not submit this quiz.");
    } finally {
      setIsSubmitting(false);
    }
  }

  return (
    <main className="public-quiz-page">
      <header className="public-quiz-brand"><Logo /><span>QUIZ</span></header>
      <div className="public-quiz-content">
        {isLoading
          ? <div className="panel"><div className="empty-state">Loading quiz...</div></div>
          : error && !quiz
            ? <div className="panel"><ErrorBanner>{error}</ErrorBanner><p className="empty-state">This link may be incorrect or the quiz may have been removed.</p></div>
            : quiz && (
              <>
                <header className="public-quiz-heading">
                  <p className="eyebrow">{quiz.subject.section.course} · {quiz.subject.section.code} · {quiz.subject.code}</p>
                  <h1>{quiz.title}</h1>
                  <p className="page-subtitle">{quiz.subject.title} · {quiz.questions.length} questions</p>
                  {quiz.dueAt && <p className="public-quiz-due-date">Due {formatDate(quiz.dueAt)}</p>}
                  {quiz.description && <p className="public-quiz-description">{quiz.description}</p>}
                </header>
                {grade
                  ? <section className="panel quiz-grade-card" aria-live="polite">
                    <p className="eyebrow">Quiz submitted</p>
                    <h2>Your score: {grade.score} / {grade.maxScore}</h2>
                    <p>{grade.correctCount} of {grade.totalQuestions} correct · {grade.percentage}%</p>
                    <p className="hint">Your result has been recorded. You can close this page now.</p>
                  </section>
                  : isQuizClosed
                    ? <section className="panel quiz-grade-card">
                      <p className="eyebrow">Quiz closed</p>
                      <h2>The due date has passed</h2>
                      <p>This quiz is no longer accepting submissions.</p>
                    </section>
                    : <form className="public-quiz-form" onSubmit={(event) => void handleSubmit(event)}>
                      {error && <ErrorBanner>{error}</ErrorBanner>}
                      <section className="panel">
                        <label className="field">Your name (optional)
                          <input name="studentName" maxLength={100} placeholder="Enter your name" autoComplete="name" />
                        </label>
                      </section>
                      {quiz.questions.map((question, questionIndex) => (
                        <fieldset className="panel public-question" key={question.id}>
                          <legend>{questionIndex + 1}. {question.prompt}</legend>
                          <div className="public-answer-list">
                            {question.options.map((option, optionIndex) => (
                              <label className="public-answer" key={optionIndex}>
                                <input required type="radio" name={question.id} value={optionIndex} />
                                <span>{option}</span>
                              </label>
                            ))}
                          </div>
                        </fieldset>
                      ))}
                      <button className="button button-primary full-width" type="submit" disabled={isSubmitting}>
                        {isSubmitting ? "Submitting..." : "Submit answers"}
                      </button>
                      <p className="hint public-quiz-hint">Your answers are graded automatically when you submit.</p>
                    </form>}
              </>
            )}
      </div>
    </main>
  );
}
