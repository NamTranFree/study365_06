import { useEffect, useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
import API from "../services/api";
import "../styles/Dashboard.css";

const buildPracticeTopicPath = (subjectId, topicName) => {
  const topicSlug = encodeURIComponent(topicName);
  return `/dashboard/on-tap/${subjectId}/${topicSlug}`;
};

const formatDateTime = (value) => {
  if (!value) {
    return "-";
  }
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) {
    return "-";
  }
  return date.toLocaleString("vi-VN");
};

function Dashboard({ section = "practice" }) {
  const isBlankSection = section === "summary" || section === "history";
  const navigate = useNavigate();
  const { subjectId: practiceSubjectParam = "" } = useParams();

  const [data, setData] = useState({
    totalPracticeQuestions: 0,
    totalExamAttempts: 0,
    averageExamScore: 0,
    recentAttempts: [],
  });
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  const [subjects, setSubjects] = useState([]);
  const [practiceTopics, setPracticeTopics] = useState([]);
  const [practiceLoading, setPracticeLoading] = useState(false);
  const [practiceError, setPracticeError] = useState("");

  // Exam (Thi thử) state
  const [examSubjects, setExamSubjects] = useState([]);
  const [selectedExamSubjectId, setSelectedExamSubjectId] = useState("");
  const [examList, setExamList] = useState([]);
  const [examListLoading, setExamListLoading] = useState(false);
  const [examLoading, setExamLoading] = useState(false);
  const [examError, setExamError] = useState("");

  useEffect(() => {
    const fetchDashboard = async () => {
      try {
        setLoading(true);
        setError("");
        const response = await API.get("/student/dashboard");
        setData(response.data.data);
      } catch (err) {
        setError(err.response?.data?.message || "Không tải được dashboard");
      } finally {
        setLoading(false);
      }
    };

    fetchDashboard();
  }, []);

  useEffect(() => {
    const fetchSubjects = async () => {
      try {
        setPracticeError("");
        const response = await API.get("/student/subjects");
        const list = response.data?.subjects || [];
        setSubjects(list);
      } catch (err) {
        setPracticeError(err.response?.data?.message || "Không tải được danh sách môn học");
      }
    };

    fetchSubjects();
  }, []);

  useEffect(() => {
    const fetchPracticeTopics = async () => {
      if (!practiceSubjectParam) {
        setPracticeTopics([]);
        return;
      }

      try {
        setPracticeLoading(true);
        setPracticeError("");
        const response = await API.get("/student/practice/topics", {
          params: { subject_id: practiceSubjectParam },
        });
        setPracticeTopics(response.data?.topics || []);
      } catch (err) {
        setPracticeError(err.response?.data?.message || "Không tải được danh sách chương");
      } finally {
        setPracticeLoading(false);
      }
    };

    fetchPracticeTopics();
  }, [practiceSubjectParam]);

  useEffect(() => {
    if (section !== "practice" || !practiceSubjectParam || subjects.length === 0) {
      return;
    }

    const hasSubject = subjects.some((subject) => String(subject.id) === String(practiceSubjectParam));
    if (!hasSubject) {
      navigate("/dashboard/on-tap", { replace: true });
    }
  }, [section, practiceSubjectParam, subjects, navigate]);

  // Exam: load danh sách môn thi
  useEffect(() => {
    if (section !== "exam") return;
    const fetchExamSubjects = async () => {
      try {
        const res = await API.get("/student/exam/subjects");
        const list = res.data?.subjects || [];
        setExamSubjects(list);
        if (list.length > 0) setSelectedExamSubjectId(String(list[0].id));
      } catch {
        setExamError("Không tải được danh sách môn thi");
      }
    };
    fetchExamSubjects();
  }, [section]);

  // Exam: load danh sách đề thi theo môn
  useEffect(() => {
    if (section !== "exam") return;
    const fetchExams = async () => {
      try {
        setExamListLoading(true);
        setExamError("");
        const params = selectedExamSubjectId ? { subject_id: selectedExamSubjectId } : {};
        const res = await API.get("/student/exams", { params });
        setExamList(res.data?.exams || []);
      } catch {
        setExamError("Không tải được danh sách đề thi");
      } finally {
        setExamListLoading(false);
      }
    };
    fetchExams();
  }, [section, selectedExamSubjectId]);

  const handleStartExam = async (exam) => {
    try {
      setExamLoading(true);
      setExamError("");
      const res = await API.post(`/student/exams/${exam.id}/start`);
      navigate("/thi-thu/lam-bai", {
        state: {
          exam: res.data.exam,
          attemptId: res.data.attemptId,
          questions: res.data.questions || [],
          startTimestamp: Date.now(),
        },
      });
    } catch (err) {
      setExamError(err.response?.data?.message || "Không thể bắt đầu bài thi");
    } finally {
      setExamLoading(false);
    }
  };

  const handlePracticeSubjectSelect = (subjectId) => {
    navigate(subjectId ? `/dashboard/on-tap/${subjectId}` : "/dashboard/on-tap");
  };

  const handlePracticeTopicSelect = (subjectId, topicName) => {
    navigate(buildPracticeTopicPath(subjectId, topicName));
  };

  const safeSubjects = Array.isArray(subjects) ? subjects : [];
  const safePracticeTopics = Array.isArray(practiceTopics) ? practiceTopics : [];
  const selectedSubject =
    safeSubjects.find((subject) => String(subject.id) === String(practiceSubjectParam)) || null;
  const pageTitleMap = {
    practice: "Ôn tập",
    exam: "Thi thử",
  };

  const examStatusLabelMap = {
    open: "Đang mở",
    upcoming: "Chưa mở",
    expired: "Đã đóng",
  };

  if (loading) {
    return (
      <main className="dashboard">
        <div className="dashboard-container">Đang tải dữ liệu student...</div>
      </main>
    );
  }

  if (isBlankSection) {
    return (
      <main className="dashboard">
        <div className="dashboard-container" />
      </main>
    );
  }

  return (
    <main className="dashboard">
      <div className="dashboard-container">
        <h1>{pageTitleMap[section] || "Bảng điều khiển học sinh"}</h1>
        {error && <div className="error-message">{error}</div>}

        {section === "practice" ? (
          <section className="practice-section">
            {practiceSubjectParam ? (
              <div className="practice-breadcrumbs">
                <span>Môn học</span>
                {selectedSubject ? <span>/</span> : null}
                {selectedSubject ? <span>{selectedSubject.subject_name}</span> : null}
              </div>
            ) : null}

            {!practiceSubjectParam ? (
              <div className="practice-stage-page">
                <div className="practice-stage-header">
                  <h3>Chọn môn học</h3>
                </div>

                <div className="practice-picker-grid">
                  {safeSubjects.length === 0 ? (
                    <p className="practice-note">Chưa có môn học ôn tập.</p>
                  ) : (
                    safeSubjects.map((subject) => {
                      return (
                        <button
                          key={subject.id}
                          type="button"
                          className="practice-picker-card"
                          onClick={() => handlePracticeSubjectSelect(String(subject.id))}
                        >
                          <span className="practice-card-kicker">Môn học</span>
                          <strong>{subject.subject_name}</strong>
                          <span>{subject.practice_questions} câu ôn tập</span>
                        </button>
                      );
                    })
                  )}
                </div>
              </div>
            ) : null}

            {practiceSubjectParam ? (
              <div className="practice-stage-page">
                <div className="practice-stage-header">
                  <h3>Chọn chương của {selectedSubject?.subject_name}</h3>
                </div>

                {practiceLoading ? <p className="practice-note">Đang tải danh sách chương...</p> : null}

                {!practiceLoading && safePracticeTopics.length === 0 ? (
                  <p className="practice-note">Môn học này chưa có chương ôn tập.</p>
                ) : null}

                {!practiceLoading && safePracticeTopics.length > 0 ? (
                  <div className="practice-picker-grid topic-grid">
                    {safePracticeTopics.map((topic) => {
                      return (
                        <button
                          key={topic.topic_name}
                          type="button"
                          className="practice-picker-card"
                          onClick={() => handlePracticeTopicSelect(practiceSubjectParam, topic.topic_name)}
                        >
                          <span className="practice-card-kicker">Chương</span>
                          <strong>{topic.topic_name}</strong>
                          <span>{topic.question_count} câu ôn tập</span>
                        </button>
                      );
                    })}
                  </div>
                ) : null}
              </div>
            ) : null}

            {practiceError ? <p className="error-message">{practiceError}</p> : null}

            {selectedSubject ? (
              <p className="practice-note">Chọn một chương để hiển thị danh sách câu hỏi.</p>
            ) : null}
          </section>
        ) : null}

        {section === "exam" ? (
          <section className="practice-section">
            <h2>Thi thử</h2>
            {examError ? <p className="error-message">{examError}</p> : null}

            <div className="practice-toolbar">
              <label htmlFor="exam-subject-select">Chọn môn:</label>
              <select
                id="exam-subject-select"
                value={selectedExamSubjectId}
                onChange={(e) => setSelectedExamSubjectId(e.target.value)}
              >
                <option value="">Tất cả môn</option>
                {examSubjects.map((s) => (
                  <option key={s.id} value={s.id}>{s.subject_name} ({s.exam_count} đề)</option>
                ))}
              </select>
            </div>

            {examListLoading ? <p className="practice-note">Đang tải danh sách đề thi...</p> : null}

            {!examListLoading && examList.length === 0 ? (
              <p className="practice-note">Chưa có đề thi nào được xuất bản.</p>
            ) : null}

            <div className="exam-list">
              {examList.map((exam) => (
                <div key={exam.id} className="exam-card">
                  <div className="exam-card-info">
                    <h3>{exam.exam_name}</h3>
                    <p className="exam-meta">{exam.subject_name} &bull; {exam.total_questions} câu &bull; {exam.duration} phút</p>
                    <p className="exam-meta">
                      Mở: {formatDateTime(exam.available_from)} &bull; Đóng: {formatDateTime(exam.available_to)}
                    </p>
                    <p className={`exam-window-status ${exam.availability_status || "open"}`}>
                      {examStatusLabelMap[exam.availability_status] || "Đang mở"}
                    </p>
                    {exam.description ? <p className="exam-desc">{exam.description}</p> : null}
                    {exam.passing_score ? <p className="exam-passing">Điểm đạt: {exam.passing_score}/10</p> : null}
                    <p className={`exam-user-status exam-user-status--${exam.user_attempt_status || "not_started"}`}>
                      {exam.user_attempt_status === "in_progress"
                        ? "Đang làm"
                        : exam.user_attempt_status === "submitted" || exam.user_attempt_status === "completed"
                          ? `Đã nộp${exam.attempt_score != null ? ` — ${exam.attempt_score}/10` : ""}`
                          : "Chưa làm"}
                    </p>
                  </div>
                  <button
                    type="button"
                    className="check-btn"
                    disabled={examLoading || exam.can_start === false}
                    onClick={() => handleStartExam(exam)}
                  >
                    {exam.availability_status === "upcoming"
                      ? "Chưa đến giờ"
                      : exam.availability_status === "expired"
                        ? "Đã hết giờ"
                        : exam.user_attempt_status === "in_progress"
                          ? "Tiếp tục thi"
                          : exam.user_attempt_status === "submitted" || exam.user_attempt_status === "completed"
                            ? "Thi lại"
                            : "Bắt đầu thi"}
                  </button>
                </div>
              ))}
            </div>
          </section>
        ) : null}

      </div>
    </main>
  );
}

export default Dashboard;
