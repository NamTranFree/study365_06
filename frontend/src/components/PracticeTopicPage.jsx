import { useEffect, useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
import API from "../services/api";
import MathText from "./MathText";
import { normalizeMathText } from "../utils/mathText";
import "../styles/Dashboard.css";

function PracticeTopicPage() {
  const navigate = useNavigate();
  const { subjectId = "", topicSlug = "" } = useParams();

  const [subjects, setSubjects] = useState([]);
  const [topics, setTopics] = useState([]);
  const [questions, setQuestions] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [answers, setAnswers] = useState({});
  const [checkLoadingMap, setCheckLoadingMap] = useState({});
  const [resultMap, setResultMap] = useState({});

  useEffect(() => {
    const fetchPageData = async () => {
      if (!subjectId || !topicSlug) {
        navigate("/dashboard/on-tap", { replace: true });
        return;
      }

      try {
        setLoading(true);
        setError("");

        const [subjectsRes, topicsRes, questionsRes] = await Promise.all([
          API.get("/student/subjects"),
          API.get("/student/practice/topics", { params: { subject_id: subjectId } }),
          API.get("/student/practice/questions", {
            params: {
              subject_id: subjectId,
              practice_topic: topicSlug,
            },
          }),
        ]);

        const subjectList = subjectsRes.data?.subjects || [];
        const topicList = topicsRes.data?.topics || [];
        const questionList = (questionsRes.data?.questions || []).map((question) => ({
          ...question,
          question_text: normalizeMathText(question.question_text),
          explanation: normalizeMathText(question.explanation),
          options: Array.isArray(question.options)
            ? question.options.map((option) => ({
                ...option,
                option_text: normalizeMathText(option.option_text, { inline: true }),
              }))
            : [],
        }));

        const hasSubject = subjectList.some((subject) => String(subject.id) === String(subjectId));
        const hasTopic = topicList.some((topic) => topic.topic_name === topicSlug);

        if (!hasSubject) {
          navigate("/dashboard/on-tap", { replace: true });
          return;
        }

        if (!hasTopic) {
          navigate(`/dashboard/on-tap/${subjectId}`, { replace: true });
          return;
        }

        setSubjects(subjectList);
        setTopics(topicList);
        setQuestions(questionList);
        setAnswers({});
        setResultMap({});
      } catch (err) {
        setError(err.response?.data?.message || "Không tải được trang ôn tập");
      } finally {
        setLoading(false);
      }
    };

    fetchPageData();
  }, [navigate, subjectId, topicSlug]);

  const selectedSubject = subjects.find((subject) => String(subject.id) === String(subjectId)) || null;
  const selectedTopic = topics.find((topic) => topic.topic_name === topicSlug) || null;

  const handleAnswerChange = (questionId, value) => {
    setAnswers((prev) => ({
      ...prev,
      [questionId]: value,
    }));
  };

  const checkAnswer = async (question) => {
    const submitValue = answers[question.id];
    const isEmptyValue =
      submitValue === undefined || submitValue === null || String(submitValue).trim() === "";

    if (isEmptyValue) {
      setResultMap((prev) => ({
        ...prev,
        [question.id]: {
          is_correct: false,
          explanation: "Bạn cần nhập/chọn đáp án trước khi kiểm tra.",
          correct_answer: "",
          localError: true,
        },
      }));
      return;
    }

    try {
      setCheckLoadingMap((prev) => ({ ...prev, [question.id]: true }));
      const response = await API.post("/student/practice/check", {
        question_id: question.id,
        user_answer: submitValue,
      });

      setResultMap((prev) => ({
        ...prev,
        [question.id]: response.data?.result,
      }));
    } catch (err) {
      setResultMap((prev) => ({
        ...prev,
        [question.id]: {
          is_correct: false,
          explanation: err.response?.data?.message || "Không thể kiểm tra đáp án",
          correct_answer: "",
          localError: true,
        },
      }));
    } finally {
      setCheckLoadingMap((prev) => ({ ...prev, [question.id]: false }));
    }
  };

  const renderQuestionCard = (question, index) => {
    const result = resultMap[question.id];
    const isChecking = Boolean(checkLoadingMap[question.id]);

    return (
      <article key={question.id} className="practice-card practice-card-page">
        <h4>
          Câu {index + 1}: <MathText text={question.question_text} />
        </h4>

        {question.question_type === 1 ? (
          <div className="practice-options">
            {question.options.map((option) => (
              <label key={option.id} className="practice-option-row">
                <input
                  type="radio"
                  name={`single-${question.id}`}
                  value={option.option_letter}
                  checked={answers[question.id] === option.option_letter}
                  onChange={() => handleAnswerChange(question.id, option.option_letter)}
                />
                <span>
                  {option.option_letter}. <MathText text={option.option_text} />
                </span>
              </label>
            ))}
          </div>
        ) : null}

        {question.question_type === 2 ? (
          <div className="practice-options">
            {question.options.map((option) => (
              <div key={option.id} className="practice-option-row">
                <span>
                  {option.option_letter}. <MathText text={option.option_text} />
                </span>
              </div>
            ))}
            <div className="practice-fill-input">
              <input
                type="number"
                min="0"
                value={answers[question.id] || ""}
                onChange={(event) => handleAnswerChange(question.id, event.target.value)}
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
              onChange={(event) => handleAnswerChange(question.id, event.target.value)}
              placeholder="Nhập đáp án của bạn"
            />
          </div>
        ) : null}

        <div className="practice-check-row">
          <button
            type="button"
            className="check-btn"
            disabled={isChecking}
            onClick={() => checkAnswer(question)}
          >
            {isChecking ? "Đang kiểm tra..." : "Kiểm tra"}
          </button>

          {result ? (
            <div className={`practice-result ${result.is_correct ? "correct" : "incorrect"}`}>
              <strong>{result.is_correct ? "Chính xác" : "Chưa đúng"}</strong>
              {!result.localError ? (
                <p>
                  Đáp án đúng: <b><MathText text={result.correct_answer} /></b>
                </p>
              ) : null}
              <p>Lời giải: <MathText text={result.explanation} /></p>
            </div>
          ) : null}
        </div>
      </article>
    );
  };

  if (loading) {
    return (
      <main className="dashboard practice-study-page">
        <div className="dashboard-container">Đang tải trang ôn tập...</div>
      </main>
    );
  }

  return (
    <main className="dashboard practice-study-page">
      <div className="dashboard-container practice-study-container">
        <div className="practice-study-topbar">
          <div>
            <h1>{selectedTopic?.topic_name || "Chương"}</h1>
          </div>
        </div>

        {error ? <p className="error-message">{error}</p> : null}

        {!error && questions.length === 0 ? (
          <p className="practice-note">Lựa chọn này chưa có câu hỏi ôn tập.</p>
        ) : null}

        <div className="practice-list">
          {questions.map((question, index) => renderQuestionCard(question, index))}
        </div>
      </div>
    </main>
  );
}

export default PracticeTopicPage;