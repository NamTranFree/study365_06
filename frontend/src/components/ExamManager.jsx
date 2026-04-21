import { useEffect, useState } from "react";
import API from "../services/api";

function ExamManager() {
  const [exams, setExams] = useState([]);
  const [subjects, setSubjects] = useState([]);
  const [questions, setQuestions] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  // Form tạo / sửa đề thi
  const [showForm, setShowForm] = useState(false);
  const [editingExam, setEditingExam] = useState(null); // null = tạo mới, object = đang sửa
  const [formSubjectId, setFormSubjectId] = useState("");
  const [formExamName, setFormExamName] = useState("");
  const [formDescription, setFormDescription] = useState("");
  const [formDuration, setFormDuration] = useState(60);
  const [formPassingScore, setFormPassingScore] = useState(5);
  const [formAvailableFrom, setFormAvailableFrom] = useState("");
  const [formAvailableTo, setFormAvailableTo] = useState("");
  const [formSelectedQuestions, setFormSelectedQuestions] = useState([]);
  const [formLoading, setFormLoading] = useState(false);
  const [formError, setFormError] = useState("");

  const formatDateTime = (value) => {
    if (!value) return "-";
    const date = new Date(value);
    if (Number.isNaN(date.getTime())) return "-";
    return date.toLocaleString("vi-VN");
  };

  const canEditExam = (exam) => {
    const canEditByTime = Number(exam.can_edit_by_time) === 1;
    const hasAttempts = Number(exam.has_attempts) === 1;
    return canEditByTime && !hasAttempts;
  };

  const fetchExams = async () => {
    try {
      setLoading(true);
      setError("");
      const res = await API.get("/admin/exams");
      setExams(res.data?.exams || []);
    } catch (err) {
      setError(err.response?.data?.message || "Không tải được danh sách đề thi");
    } finally {
      setLoading(false);
    }
  };

  const fetchSubjects = async () => {
    try {
      const res = await API.get("/admin/subjects");
      const list = res.data?.subjects || [];
      setSubjects(list);
      if (list.length > 0) setFormSubjectId(String(list[0].id));
    } catch {
      // ignore
    }
  };

  useEffect(() => {
    fetchExams();
    fetchSubjects();
  }, []);

  useEffect(() => {
    if (!formSubjectId) {
      setQuestions([]);
      return;
    }
    const fetchQuestions = async () => {
      try {
        const res = await API.get("/admin/questions", { params: { subject_id: formSubjectId, limit: 200 } });
        setQuestions(res.data?.questions || []);
        setFormSelectedQuestions([]);
      } catch {
        setQuestions([]);
      }
    };
    fetchQuestions();
  }, [formSubjectId]);

  const toggleQuestion = (qId) => {
    setFormSelectedQuestions((prev) =>
      prev.includes(qId) ? prev.filter((id) => id !== qId) : [...prev, qId]
    );
  };

  const handleEditExam = async (exam) => {
    if (!canEditExam(exam)) {
      alert("Chỉ được sửa đề thi trước thời gian bắt đầu và khi chưa có học sinh làm bài");
      return;
    }

    setEditingExam(exam);
    setFormExamName(exam.exam_name);
    setFormSubjectId(String(exam.subject_id));
    setFormDescription(exam.description || "");
    setFormDuration(exam.duration);
    setFormPassingScore(exam.passing_score ?? 5);
    const toLocalInput = (val) => {
      if (!val) return "";
      const d = new Date(val);
      if (Number.isNaN(d.getTime())) return "";
      const pad = (n) => String(n).padStart(2, "0");
      return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}T${pad(d.getHours())}:${pad(d.getMinutes())}`;
    };
    setFormAvailableFrom(toLocalInput(exam.available_from));
    setFormAvailableTo(toLocalInput(exam.available_to));
    setFormError("");
    // Lấy câu hỏi của đề để pre-select
    try {
      const res = await API.get(`/admin/exams/${exam.id}/questions`);
      const ids = (res.data?.questions || []).map((q) => q.id);
      setFormSelectedQuestions(ids);
    } catch {
      setFormSelectedQuestions([]);
    }
    setShowForm(true);
  };

  const resetForm = () => {
    setEditingExam(null);
    setFormExamName("");
    setFormDescription("");
    setFormDuration(60);
    setFormPassingScore(5);
    setFormAvailableFrom("");
    setFormAvailableTo("");
    setFormSelectedQuestions([]);
    setFormError("");
  };

  const handleCreateExam = async (e) => {
    e.preventDefault();
    if (!formExamName.trim()) {
      setFormError("Vui lòng nhập tên đề thi");
      return;
    }
    if (formSelectedQuestions.length === 0) {
      setFormError("Vui lòng chọn ít nhất 1 câu hỏi");
      return;
    }
    if (!formAvailableFrom || !formAvailableTo) {
      setFormError("Vui lòng chọn thời gian mở và đóng đề");
      return;
    }
    if (new Date(formAvailableFrom).getTime() >= new Date(formAvailableTo).getTime()) {
      setFormError("Thời gian đóng đề phải sau thời gian mở đề");
      return;
    }

    try {
      setFormLoading(true);
      setFormError("");
      const payload = {
        exam_name: formExamName.trim(),
        subject_id: formSubjectId,
        description: formDescription.trim() || null,
        duration: Number(formDuration),
        passing_score: Number(formPassingScore),
        available_from: formAvailableFrom,
        available_to: formAvailableTo,
        question_ids: formSelectedQuestions,
      };
      if (editingExam) {
        await API.put(`/admin/exams/${editingExam.id}`, payload);
      } else {
        await API.post("/admin/exams", payload);
      }
      setShowForm(false);
      resetForm();
      await fetchExams();
    } catch (err) {
      setFormError(err.response?.data?.message || (editingExam ? "Không thể cập nhật đề thi" : "Không thể tạo đề thi"));
    } finally {
      setFormLoading(false);
    }
  };

  const handleTogglePublish = async (examId) => {
    try {
      const res = await API.patch(`/admin/exams/${examId}/publish`);
      setExams((prev) =>
        prev.map((e) => (e.id === examId ? { ...e, is_published: res.data.is_published } : e))
      );
    } catch (err) {
      alert(err.response?.data?.message || "Không thể thay đổi trạng thái");
    }
  };

  const handleDeleteExam = async (examId) => {
    if (!confirm("Bạn chắc chắn muốn xóa đề thi này? Toàn bộ lịch sử thi sẽ bị xóa.")) return;
    try {
      await API.delete(`/admin/exams/${examId}`);
      setExams((prev) => prev.filter((e) => e.id !== examId));
    } catch (err) {
      alert(err.response?.data?.message || "Không thể xóa đề thi");
    }
  };

  if (loading) return <p className="practice-note">Đang tải danh sách đề thi...</p>;

  return (
    <div style={{ marginTop: "8px" }}>
      <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: "16px" }}>
        <h3>Quản lý đề thi</h3>
        <button type="button" className="check-btn" onClick={() => { if (showForm) { setShowForm(false); resetForm(); } else { setShowForm(true); } }}>
          {showForm ? "Đóng form" : "+ Tạo đề thi mới"}
        </button>
      </div>

      {error ? <p className="error-message">{error}</p> : null}

      {showForm ? (
        <form onSubmit={handleCreateExam} style={{ background: "#fff", border: "1px solid #d7e4f4", borderRadius: "12px", padding: "20px", marginBottom: "20px" }}>
          <h4 style={{ marginBottom: "14px", color: "#123257" }}>{editingExam ? `Sửa đề thi #${editingExam.id}` : "Tạo đề thi mới"}</h4>
          {formError ? <p className="error-message">{formError}</p> : null}

          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "12px", marginBottom: "12px" }}>
            <div>
              <label style={labelStyle}>Tên đề thi *</label>
              <input style={inputStyle} value={formExamName} onChange={(e) => setFormExamName(e.target.value)} placeholder="VD: Đề thi thử Toán học số 1" />
            </div>
            <div>
              <label style={labelStyle}>Môn học *</label>
              <select style={inputStyle} value={formSubjectId} onChange={(e) => setFormSubjectId(e.target.value)}>
                {subjects.map((s) => <option key={s.id} value={s.id}>{s.subject_name}</option>)}
              </select>
            </div>
            <div>
              <label style={labelStyle}>Thời gian làm bài (phút) *</label>
              <input style={inputStyle} type="number" min="5" max="300" value={formDuration} onChange={(e) => setFormDuration(e.target.value)} />
            </div>
            <div>
              <label style={labelStyle}>Điểm đạt (thang 10)</label>
              <input style={inputStyle} type="number" min="1" max="10" step="0.5" value={formPassingScore} onChange={(e) => setFormPassingScore(e.target.value)} />
            </div>
            <div>
              <label style={labelStyle}>Mở đề lúc *</label>
              <input
                style={inputStyle}
                type="datetime-local"
                value={formAvailableFrom}
                onChange={(e) => setFormAvailableFrom(e.target.value)}
              />
            </div>
            <div>
              <label style={labelStyle}>Đóng đề lúc *</label>
              <input
                style={inputStyle}
                type="datetime-local"
                value={formAvailableTo}
                onChange={(e) => setFormAvailableTo(e.target.value)}
              />
            </div>
          </div>

          <div style={{ marginBottom: "12px" }}>
            <label style={labelStyle}>Mô tả</label>
            <textarea style={{ ...inputStyle, height: "60px", resize: "vertical" }} value={formDescription} onChange={(e) => setFormDescription(e.target.value)} placeholder="Mô tả ngắn về đề thi..." />
          </div>

          <div style={{ marginBottom: "16px" }}>
            <label style={labelStyle}>Chọn câu hỏi ({formSelectedQuestions.length} đã chọn)</label>
            {questions.length === 0 ? (
              <p className="practice-note">Môn này chưa có câu hỏi nào.</p>
            ) : (
              <div style={{ maxHeight: "300px", overflowY: "auto", border: "1px solid #d7e4f4", borderRadius: "8px", padding: "8px" }}>
                {questions.map((q) => (
                  <label key={q.id} style={{ display: "flex", gap: "8px", padding: "6px 4px", cursor: "pointer", borderBottom: "1px solid #f0f4fa" }}>
                    <input type="checkbox" checked={formSelectedQuestions.includes(q.id)} onChange={() => toggleQuestion(q.id)} />
                    <span style={{ fontSize: "13px" }}>[Loại {q.question_type}] {q.question_text?.slice(0, 100)}{q.question_text?.length > 100 ? "..." : ""}</span>
                  </label>
                ))}
              </div>
            )}
          </div>

          <button type="submit" className="check-btn" disabled={formLoading}>
            {formLoading ? (editingExam ? "Đang lưu..." : "Đang tạo...") : (editingExam ? "Lưu thay đổi" : "Tạo đề thi")}
          </button>
        </form>
      ) : null}

      {exams.length === 0 ? (
        <p className="practice-note">Chưa có đề thi nào. Nhấn "+ Tạo đề thi mới" để bắt đầu.</p>
      ) : (
        <div style={{ overflowX: "auto" }}>
          <table style={{ width: "100%", borderCollapse: "collapse", background: "#fff" }}>
            <thead>
              <tr>
                <th style={thStyle}>ID</th>
                <th style={thStyle}>Tên đề thi</th>
                <th style={thStyle}>Môn học</th>
                <th style={thStyle}>Số câu</th>
                <th style={thStyle}>Thời gian</th>
                <th style={thStyle}>Khung giờ làm bài</th>
                <th style={thStyle}>Trạng thái</th>
                <th style={thStyle}>Thao tác</th>
              </tr>
            </thead>
            <tbody>
              {exams.map((exam) => (
                <tr key={exam.id}>
                  <td style={tdStyle}>{exam.id}</td>
                  <td style={tdStyle}><strong>{exam.exam_name}</strong>{exam.description ? <div style={{ fontSize: "12px", color: "#4a637d", marginTop: "2px", fontWeight: 500 }}>{exam.description}</div> : null}</td>
                  <td style={tdStyle}>{exam.subject_name}</td>
                  <td style={tdStyle}>{exam.total_questions}</td>
                  <td style={tdStyle}>{exam.duration} phút</td>
                  <td style={tdStyle}>
                    <div style={{ fontSize: "12px", lineHeight: 1.5, color: "#3b536c", fontWeight: 600 }}>
                      <div><strong>Mở:</strong> {formatDateTime(exam.available_from)}</div>
                      <div><strong>Đóng:</strong> {formatDateTime(exam.available_to)}</div>
                    </div>
                  </td>
                  <td style={tdStyle}>
                    <span style={{ color: exam.is_published ? "#2a7a4f" : "#c0392b", fontWeight: 600 }}>
                      {exam.is_published ? "Đã xuất bản" : "Bản nháp"}
                    </span>
                  </td>
                  <td style={tdStyle}>
                    <button
                      onClick={() => handleEditExam(exam)}
                      disabled={!canEditExam(exam)}
                      title={canEditExam(exam) ? "Sửa đề thi" : "Đề thi đã bắt đầu hoặc đã có học sinh làm bài"}
                      style={{
                        ...buttonStyle,
                        background: canEditExam(exam) ? "#2a7a4f" : "#95a5a6",
                        marginRight: "6px",
                        cursor: canEditExam(exam) ? "pointer" : "not-allowed",
                      }}
                    >
                      Sửa
                    </button>
                    <button onClick={() => handleTogglePublish(exam.id)} style={buttonStyle}>
                      {exam.is_published ? "Ẩn" : "Xuất bản"}
                    </button>
                    <button onClick={() => handleDeleteExam(exam.id)} style={{ ...buttonStyle, marginLeft: "6px", background: "#cc3333" }}>
                      Xóa
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}

const labelStyle = { display: "block", fontSize: "13px", color: "#274b6f", marginBottom: "4px", fontWeight: 600 };
const inputStyle = { width: "100%", padding: "8px 10px", border: "1px solid #c5d9ee", borderRadius: "6px", fontSize: "16px", color: "#2b4763", fontWeight: 500, boxSizing: "border-box" };
const thStyle = { background: "#f4f8fd", color: "#274b6f", padding: "10px", borderBottom: "2px solid #d7e4f4", textAlign: "left", whiteSpace: "nowrap", fontWeight: 700 };
const tdStyle = { padding: "10px", borderBottom: "1px solid #e5edf7", verticalAlign: "top", color: "#2b4763", fontWeight: 500 };
const buttonStyle = { padding: "5px 12px", background: "#2563b0", color: "#fff", border: "none", borderRadius: "6px", cursor: "pointer", fontSize: "13px", fontWeight: 600 };

export default ExamManager;
