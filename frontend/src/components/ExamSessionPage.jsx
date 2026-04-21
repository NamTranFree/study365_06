import { useEffect, useState } from "react";
import { useLocation, useNavigate } from "react-router-dom";
import API from "../services/api";
import MathText from "./MathText";
import { normalizeMathText } from "../utils/mathText";
import "../styles/Dashboard.css";

const normalizeQuestion = (question) => ({
  ...question,
  question_text: normalizeMathText(question.question_text),
  explanation: normalizeMathText(question.explanation),
  options: Array.isArray(question.options)
    ? question.options.map((option) => ({
        ...option,
        option_text: normalizeMathText(option.option_text, { inline: true }),
      }))
    : [],
});

function ExamSessionPage() {
  const navigate = useNavigate();
  const location = useLocation();
  const session = location.state || {};

  const [exam] = useState(session.exam || null);
  const [attemptId] = useState(session.attemptId || null);
  const [startTimestamp] = useState(session.startTimestamp || Date.now());
  const [questions] = useState(
    Array.isArray(session.questions) ? session.questions.map((q) => normalizeQuestion(q)) : []
  );

  const [answers, setAnswers] = useState({});
  const [timeLeft, setTimeLeft] = useState(0);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  const [phase, setPhase] = useState("taking");
  const [resultAttempt, setResultAttempt] = useState(null);
  const [resultAnswers, setResultAnswers] = useState([]);
  const [activeQuestionId, setActiveQuestionId] = useState(null);

  useEffect(() => {
    if (!exam || !attemptId || questions.length === 0) {
      navigate("/dashboard/thi-thu", { replace: true });
      return;
    }

    const duration = Number(exam.allowed_duration_seconds || exam.duration * 60 || 0);
    setTimeLeft(duration > 0 ? duration : 0);
    setActiveQuestionId(questions[0]?.id || null);
  }, [exam, attemptId, questions.length, navigate]);

  const submitExam = async () => {
    if (!exam || !attemptId) {
      navigate("/dashboard/thi-thu", { replace: true });
      return;
    }

    try {
      setLoading(true);
      setError("");

      const durationTaken = startTimestamp ? Math.floor((Date.now() - startTimestamp) / 1000) : 0;
      const submitAnswers = questions.reduce((acc, question) => {
        const rawValue = answers[question.id];
        acc[question.id] = rawValue !== undefined ? rawValue : "";
        return acc;
      }, {});

      await API.post(`/student/exams/${exam.id}/submit`, {
        attemptId,
        answers: submitAnswers,
        duration_taken: durationTaken,
      });

      const resultRes = await API.get(`/student/exam/attempts/${attemptId}/result`);
      setResultAttempt(resultRes.data.attempt || null);
      setResultAnswers(resultRes.data.answers || []);
      setPhase("result");
    } catch (err) {
      setError(err.response?.data?.message || "Không thể nộp bài");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (phase !== "taking" || timeLeft <= 0) {
      return;
    }

    const timer = setInterval(() => {
      setTimeLeft((prev) => {
        if (prev <= 1) {
          clearInterval(timer);
          submitExam();
          return 0;
        }
        return prev - 1;
      });
    }, 1000);

    return () => clearInterval(timer);
  }, [phase, timeLeft]);

  const formatTime = (seconds) => {
    const m = Math.floor(seconds / 60).toString().padStart(2, "0");
    const s = (seconds % 60).toString().padStart(2, "0");
    return `${m}:${s}`;
  };

  const isAnswered = (question) => {
    const value = answers[question.id];
    return value !== undefined && value !== null && String(value).trim() !== "";
  };

  const jumpToQuestion = (questionId) => {
    const element = document.getElementById(`exam-question-${questionId}`);
    if (element) {
      element.scrollIntoView({ behavior: "smooth", block: "start" });
      setActiveQuestionId(questionId);
    }
  };

  if (!exam || !attemptId || questions.length === 0) {
    return null;
  }

  return (
    <main className={`exam-session-page ${phase === "taking" ? "taking-mode" : ""}`}>
      <div className="exam-session-shell">
        {phase === "taking" ? (
          <>
            <header className="exam-session-header">
              <div className="exam-session-title-wrap">
                <h1>{exam.exam_name}</h1>
              </div>
            </header>

            {error ? <p className="error-message">{error}</p> : null}

            <div className="exam-session-layout">
              <aside className="exam-session-sidebar">
                <div className={`exam-side-time-card ${timeLeft <= 300 ? "warn" : ""}`}>
                  <span>Thời gian làm bài</span>
                  <strong>{formatTime(timeLeft)}</strong>
                </div>

                <div className="exam-side-question-card">
                  <h3>Câu hỏi</h3>
                  <div className="exam-side-question-grid">
                    {questions.map((question, index) => {
                      const answered = isAnswered(question);
                      const active = activeQuestionId === question.id;
                      return (
                        <button
                          key={question.id}
                          type="button"
                          className={`exam-question-chip ${answered ? "answered" : ""} ${active ? "active" : ""}`}
                          onClick={() => jumpToQuestion(question.id)}
                        >
                          {index + 1}
                        </button>
                      );
                    })}
                  </div>
                </div>
              </aside>

              <section className="exam-session-content">
                {questions.map((question, index) => (
                  <article
                    key={question.id}
                    id={`exam-question-${question.id}`}
                    className="practice-card practice-card-page"
                    onClick={() => setActiveQuestionId(question.id)}
                  >
                  <h4>
                    Câu {index + 1}: <MathText text={question.question_text} />
                  </h4>

                  {question.question_type === 1 ? (
                    <div className="practice-options">
                      {question.options.map((opt) => (
                        <label key={opt.id} className="practice-option-row">
                          <input
                            type="radio"
                            name={`exam-${question.id}`}
                            value={opt.option_letter}
                            checked={answers[question.id] === opt.option_letter}
                            onChange={() =>
                              setAnswers((prev) => ({ ...prev, [question.id]: opt.option_letter }))
                            }
                          />
                          <span>
                            {opt.option_letter}. <MathText text={opt.option_text} />
                          </span>
                        </label>
                      ))}
                    </div>
                  ) : null}

                  {question.question_type === 2 ? (
                    <div className="practice-options">
                      {question.options.map((opt) => (
                        <div key={opt.id} className="practice-option-row">
                          <span>
                            {opt.option_letter}. <MathText text={opt.option_text} />
                          </span>
                        </div>
                      ))}
                      <div className="practice-fill-input">
                        <input
                          type="number"
                          min="0"
                          value={answers[question.id] || ""}
                          onChange={(e) =>
                            setAnswers((prev) => ({ ...prev, [question.id]: e.target.value }))
                          }
                          placeholder="Nhập số phương án đúng"
                        />
                      </div>
                    </div>
                  ) : null}

                  {question.question_type === 3 ? (
                    <div className="practice-fill-input">
                      <input
                        type="text"
                        value={answers[question.id] || ""}
                        onChange={(e) =>
                          setAnswers((prev) => ({ ...prev, [question.id]: e.target.value }))
                        }
                        placeholder="Nhập đáp án"
                      />
                    </div>
                  ) : null}
                  </article>
                ))}
              </section>
            </div>

            <footer className="exam-session-footer">
              <button
                type="button"
                className="check-btn"
                disabled={loading}
                onClick={() => submitExam()}
              >
                {loading ? "Đang nộp..." : "Nộp bài"}
              </button>
            </footer>
          </>
        ) : null}

        {phase === "result" && resultAttempt ? (
          <section className="exam-result">
            <div className="exam-result-summary">
              <h3>Kết quả: {resultAttempt.exam_name}</h3>
              <div className="exam-score-big">
                <span
                  className={`exam-score-value ${
                    Number(resultAttempt.score) >= (resultAttempt.passing_score || 5) ? "pass" : "fail"
                  }`}
                >
                  {resultAttempt.score} / 10
                </span>
                <span className="exam-score-label">
                  {Number(resultAttempt.score) >= (resultAttempt.passing_score || 5)
                    ? "Đạt"
                    : "Chưa đạt"}
                </span>
              </div>
            </div>

            <div className="exam-result-detail">
              <h4>Chi tiết từng câu:</h4>
              {resultAnswers.map((item, index) => (
                <article
                  key={item.question_id}
                  className={`practice-card ${item.is_correct ? "correct-bg" : "incorrect-bg"}`}
                >
                  <h4>
                    Câu {index + 1}: <MathText text={item.question_text} />
                  </h4>
                  {item.options && item.options.length > 0 ? (
                    <div className="practice-options">
                      {item.options.map((opt) => (
                        <div
                          key={opt.id}
                          className={`practice-option-row result-option
                            ${opt.option_letter === item.correct_answer ? "correct-option" : ""}
                            ${opt.option_letter === item.user_answer && !item.is_correct ? "wrong-option" : ""}
                          `}
                        >
                          {opt.option_letter}. <MathText text={opt.option_text} />
                        </div>
                      ))}
                    </div>
                  ) : null}
                  <div className={`practice-result ${item.is_correct ? "correct" : "incorrect"}`}>
                    <strong>{item.is_correct ? "Chính xác" : "Chưa đúng"}</strong>
                    <p>
                      Đáp án của bạn: <b>{item.user_answer || "(Bỏ trống)"}</b>
                    </p>
                    {!item.is_correct ? (
                      <p>
                        Đáp án đúng: <b><MathText text={item.correct_answer} /></b>
                      </p>
                    ) : null}
                    {item.explanation ? <p>Lời giải: <MathText text={item.explanation} /></p> : null}
                  </div>
                </article>
              ))}
            </div>

            <div className="exam-submit-bar">
              <button
                type="button"
                className="check-btn"
                onClick={() => navigate("/dashboard/thi-thu", { replace: true })}
              >
                Quay lại danh sách đề thi
              </button>
            </div>
          </section>
        ) : null}
      </div>
    </main>
  );
}

export default ExamSessionPage;
