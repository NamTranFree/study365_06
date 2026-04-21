import { useEffect, useState } from "react";
import API from "../services/api";
import MathText from "./MathText";
import { normalizeInlineMathText, normalizeMathText } from "../utils/mathText";

const defaultForm = {
  id: null,
  subject_id: "",
  question_text: "",
  practice_topic: "",
  question_type: 1,
  difficulty_level: 1,
  target: "practice",
  correct_answer: "",
  explanation: "",
  options: [
    { option_letter: "A", option_text: "" },
    { option_letter: "B", option_text: "" },
    { option_letter: "C", option_text: "" },
    { option_letter: "D", option_text: "" },
  ],
};

const createOption = (index) => ({
  option_letter: String.fromCharCode(65 + index),
  option_text: "",
});

const normalizeOptions = (options) =>
  options.map((option, index) => ({
    ...option,
    option_letter: String.fromCharCode(65 + index),
  }));

const handleNormalizedPaste = (event, setter, inline = false) => {
  event.preventDefault();
  const pastedText = event.clipboardData?.getData("text") || "";
  setter(inline ? normalizeInlineMathText(pastedText) : normalizeMathText(pastedText));
};

const autoResizeTextarea = (event) => {
  const element = event.target;
  element.style.height = "auto";
  element.style.height = `${element.scrollHeight}px`;
};

function QuestionManager() {
  const [subjects, setSubjects] = useState([]);
  const [questions, setQuestions] = useState([]);
  const [filters, setFilters] = useState({
    subject_id: "",
    difficulty_level: "",
    question_type: "",
    target: "",
    practice_topic: "",
    search: "",
  });

  const [subjectForm, setSubjectForm] = useState({ subject_name: "" });
  const [form, setForm] = useState(defaultForm);
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState("");
  const [error, setError] = useState("");

  const fetchSubjects = async () => {
    const res = await API.get("/admin/subjects");
    setSubjects(res.data.subjects || []);
  };

  const fetchQuestions = async () => {
    const params = Object.fromEntries(
      Object.entries(filters).filter(([, value]) => value !== "" && value !== null)
    );
    const res = await API.get("/admin/questions", { params });
    setQuestions(res.data.questions || []);
  };

  const fetchAll = async () => {
    try {
      setLoading(true);
      await Promise.all([fetchSubjects(), fetchQuestions()]);
    } catch (err) {
      setError(err.response?.data?.message || "Không thể tải dữ liệu câu hỏi");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchAll();
  }, []);

  const resetForm = () => {
    setForm(defaultForm);
  };

  const handleAddOption = () => {
    setForm((prev) => ({
      ...prev,
      options: [...prev.options, createOption(prev.options.length)],
    }));
  };

  const handleRemoveOption = (index) => {
    setForm((prev) => {
      if (prev.options.length <= 2) {
        return prev;
      }

      const nextOptions = prev.options.filter((_, optionIndex) => optionIndex !== index);
      return {
        ...prev,
        options: normalizeOptions(nextOptions),
      };
    });
  };

  const handleCreateSubject = async (e) => {
    e.preventDefault();
    setError("");
    setMessage("");
    try {
      await API.post("/admin/subjects", { subject_name: subjectForm.subject_name });
      setSubjectForm({ subject_name: "" });
      setMessage("Tạo môn học thành công");
      await fetchSubjects();
    } catch (err) {
      setError(err.response?.data?.message || "Tạo môn học thất bại");
    }
  };

  const handleDeleteSubject = async (subjectId) => {
    if (!confirm("Bạn chắc chắn muốn xóa môn học này?")) return;

    setError("");
    setMessage("");
    try {
      await API.delete(`/admin/subjects/${subjectId}`);
      setMessage("Xóa môn học thành công");

      if (String(form.subject_id) === String(subjectId)) {
        setForm((prev) => ({ ...prev, subject_id: "" }));
      }

      if (String(filters.subject_id) === String(subjectId)) {
        setFilters((prev) => ({ ...prev, subject_id: "" }));
      }

      await fetchSubjects();
    } catch (err) {
      setError(err.response?.data?.message || "Xóa môn học thất bại");
    }
  };

  const buildPayload = () => {
    const isPractice = form.target === "practice";
    const isExam = form.target === "exam";
    const payload = {
      subject_id: Number(form.subject_id),
      question_text: normalizeMathText(form.question_text),
      question_type: Number(form.question_type),
      difficulty_level: Number(form.difficulty_level),
      is_practice: isPractice,
      is_exam: isExam,
      practice_topic: isPractice ? normalizeInlineMathText(form.practice_topic) : "",
      correct_answer:
        Number(form.question_type) === 2
          ? String(normalizeInlineMathText(form.correct_answer || ""))
          : normalizeInlineMathText(form.correct_answer),
      explanation: normalizeMathText(form.explanation),
      options: [1, 2].includes(Number(form.question_type))
        ? form.options
            .map((o) => ({
              ...o,
              option_text: normalizeInlineMathText(o.option_text),
            }))
            .filter((o) => o.option_text !== "")
        : [],
    };

    return payload;
  };

  const handleSubmitQuestion = async (e) => {
    e.preventDefault();
    setError("");
    setMessage("");

    try {
      const payload = buildPayload();
      if (form.id) {
        await API.put(`/admin/questions/${form.id}`, payload);
        setMessage("Cập nhật câu hỏi thành công");
      } else {
        await API.post("/admin/questions", payload);
        setMessage("Thêm câu hỏi thành công");
      }

      resetForm();
      await fetchQuestions();
    } catch (err) {
      setError(err.response?.data?.message || "Lưu câu hỏi thất bại");
    }
  };

  const handleDeleteQuestion = async (id) => {
    if (!confirm("Bạn chắc chắn muốn xóa câu hỏi này?")) return;

    setError("");
    setMessage("");
    try {
      await API.delete(`/admin/questions/${id}`);
      setMessage("Xóa câu hỏi thành công");
      await fetchQuestions();
    } catch (err) {
      setError(err.response?.data?.message || "Xóa câu hỏi thất bại");
    }
  };

  const handleEditQuestion = (question) => {
    setForm({
      id: question.id,
      subject_id: String(question.subject_id),
      question_text: question.question_text,
      question_type: Number(question.question_type),
      difficulty_level: Number(question.difficulty_level),
      target: question.is_exam ? "exam" : "practice",
      practice_topic: normalizeInlineMathText(question.practice_topic || ""),
      correct_answer: normalizeInlineMathText(question.correct_answer),
      explanation: normalizeMathText(question.explanation || ""),
      options:
        question.options && question.options.length > 0
          ? normalizeOptions(
              question.options.map((o) => ({
                option_letter: o.option_letter,
                option_text: normalizeInlineMathText(o.option_text),
              }))
            )
          : [
              { option_letter: "A", option_text: "" },
              { option_letter: "B", option_text: "" },
              { option_letter: "C", option_text: "" },
              { option_letter: "D", option_text: "" },
            ],
    });
  };

  const handleFilter = async (e) => {
    e.preventDefault();
    setError("");
    await fetchQuestions();
  };

  if (loading) {
    return <p style={{ marginTop: "16px" }}>Đang tải ngân hàng câu hỏi...</p>;
  }

  return (
    <section style={{ marginTop: "28px" }}>
      <h3>Quản lý ngân hàng câu hỏi</h3>

      {message && <div style={okBox}>{message}</div>}
      {error && <div style={errBox}>{error}</div>}

      <form onSubmit={handleCreateSubject} style={cardBox}>
        <h4>Tạo môn học</h4>
        <div style={rowWrap}>
          <input
            style={inputStyle}
            placeholder="Tên môn học"
            value={subjectForm.subject_name}
            onChange={(e) => setSubjectForm({ ...subjectForm, subject_name: e.target.value })}
            required
          />
          <button type="submit" style={primaryBtn}>Thêm môn</button>
        </div>
      </form>

      <div style={cardBox}>
        <h4>Danh sách môn học ({subjects.length})</h4>
        <div style={{ overflowX: "auto", marginTop: "10px" }}>
          <table style={{ width: "100%", borderCollapse: "collapse", background: "#fff" }}>
            <thead>
              <tr>
                <th style={thStyle}>ID</th>
                <th style={thStyle}>Tên môn</th>
                <th style={thStyle}>Số câu hỏi</th>
                <th style={thStyle}>Số đề thi</th>
                <th style={thStyle}>Thao tác</th>
              </tr>
            </thead>
            <tbody>
              {subjects.length === 0 ? (
                <tr>
                  <td style={tdStyle} colSpan={5}>Chưa có môn học.</td>
                </tr>
              ) : (
                subjects.map((subject) => (
                  <tr key={subject.id}>
                    <td style={tdStyle}>{subject.id}</td>
                    <td style={tdStyle}>{subject.subject_name}</td>
                    <td style={tdStyle}>{Number(subject.question_count || 0)}</td>
                    <td style={tdStyle}>{Number(subject.exam_count || 0)}</td>
                    <td style={tdStyle}>
                      <button
                        type="button"
                        style={dangerBtn}
                        onClick={() => handleDeleteSubject(subject.id)}
                      >
                        Xóa môn
                      </button>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>

      <form onSubmit={handleSubmitQuestion} style={cardBox}>
        <h4>{form.id ? "Chỉnh sửa câu hỏi" : "Thêm câu hỏi mới"}</h4>

        <div style={rowWrap}>
          <select
            style={inputStyle}
            value={form.subject_id}
            onChange={(e) => setForm({ ...form, subject_id: e.target.value })}
            required
          >
            <option value="">Chọn môn học</option>
            {subjects.map((s) => (
              <option key={s.id} value={s.id}>
                {s.subject_name}
              </option>
            ))}
          </select>

          <select
            style={inputStyle}
            value={form.question_type}
            onChange={(e) => setForm({ ...form, question_type: Number(e.target.value) })}
          >
            <option value={1}>Loại 1 - Đơn</option>
            <option value={2}>Loại 2 - Đa/Mệnh đề</option>
            <option value={3}>Loại 3 - Điền từ</option>
          </select>

          <select
            style={inputStyle}
            value={form.difficulty_level}
            onChange={(e) => setForm({ ...form, difficulty_level: Number(e.target.value) })}
          >
            <option value={1}>Độ khó 1 - Dễ</option>
            <option value={2}>Độ khó 2 - Trung bình</option>
            <option value={3}>Độ khó 3 - Khó</option>
          </select>

          <select
            style={inputStyle}
            value={form.target}
            onChange={(e) =>
              setForm((prev) => ({
                ...prev,
                target: e.target.value,
                practice_topic: e.target.value === "practice" ? prev.practice_topic : "",
              }))
            }
          >
            <option value="practice">Ôn tập</option>
            <option value="exam">Thi thử</option>
          </select>
        </div>

        {form.target === "practice" ? (
          <input
            style={inputStyle}
            placeholder="Chủ đề/chương ôn tập (VD: Chương 1 - Hàm số)"
            value={form.practice_topic}
            onChange={(e) => setForm({ ...form, practice_topic: e.target.value })}
            required
          />
        ) : null}

        <textarea
          style={textareaStyle}
          rows={3}
          placeholder="Nội dung câu hỏi"
          value={form.question_text}
          onChange={(e) => setForm({ ...form, question_text: e.target.value })}
          onPaste={(event) =>
            handleNormalizedPaste(event, (value) => setForm((prev) => ({ ...prev, question_text: value })))
          }
          required
        />

        {form.question_text ? (
          <div style={previewBoxStyle}>
            <div style={previewLabelStyle}>Xem trước công thức</div>
            <MathText text={form.question_text} />
          </div>
        ) : null}

        {[1, 2].includes(Number(form.question_type)) && (
          <div style={{ marginTop: "10px" }}>
            <div style={{ ...rowWrap, justifyContent: "space-between", marginBottom: "8px" }}>
              <p>Phương án trả lời</p>
              {Number(form.question_type) === 2 && (
                <button type="button" style={primaryBtn} onClick={handleAddOption}>
                  Thêm đáp án
                </button>
              )}
            </div>
            {form.options.map((option, idx) => (
              <div key={`${option.option_letter}-${idx}`} style={{ ...rowWrap, marginBottom: "8px" }}>
                <input
                  style={{ ...inputStyle, maxWidth: "90px" }}
                  readOnly
                  value={option.option_letter}
                />
                <textarea
                  rows={1}
                  style={optionTextareaStyle}
                  value={option.option_text}
                  placeholder="Nội dung phương án"
                  onInput={autoResizeTextarea}
                  onChange={(e) => {
                    const next = [...form.options];
                    next[idx].option_text = e.target.value;
                    setForm({ ...form, options: next });
                  }}
                  onPaste={(event) =>
                    handleNormalizedPaste(
                      event,
                      (value) => {
                        setForm((prev) => {
                          const next = [...prev.options];
                          next[idx].option_text = value;
                          return { ...prev, options: next };
                        });
                      },
                      false
                    )
                  }
                />
                {Number(form.question_type) === 2 && form.options.length > 2 && (
                  <button
                    type="button"
                    style={dangerBtn}
                    onClick={() => handleRemoveOption(idx)}
                  >
                    Xóa
                  </button>
                )}
              </div>
            ))}
          </div>
        )}

        <input
          style={inputStyle}
          type={Number(form.question_type) === 2 ? "number" : "text"}
          min={Number(form.question_type) === 2 ? 1 : undefined}
          placeholder={
            Number(form.question_type) === 2
              ? "Số đáp án đúng (VD: 2)"
              : Number(form.question_type) === 3
                ? "Đáp án điền từ (không phân biệt hoa thường)"
              : "Đáp án đúng (VD: A hoặc từ cần điền)"
          }
          value={form.correct_answer}
          onChange={(e) => setForm({ ...form, correct_answer: e.target.value })}
          onPaste={(event) =>
            handleNormalizedPaste(event, (value) => setForm((prev) => ({ ...prev, correct_answer: value })), true)
          }
          required
        />

        <textarea
          style={{ ...textareaStyle, marginTop: "10px" }}
          rows={2}
          placeholder="Lời giải (tùy chọn)"
          value={form.explanation}
          onChange={(e) => setForm({ ...form, explanation: e.target.value })}
          onPaste={(event) =>
            handleNormalizedPaste(event, (value) => setForm((prev) => ({ ...prev, explanation: value })))
          }
        />

        <div style={{ ...rowWrap, marginTop: "10px" }}>
          <button type="submit" style={primaryBtn}>{form.id ? "Cập nhật" : "Thêm câu hỏi"}</button>
          <button
            type="button"
            style={secondaryBtn}
            onClick={resetForm}
          >
            Làm mới form
          </button>
        </div>
      </form>

      <form onSubmit={handleFilter} style={cardBox}>
        <h4>Lọc câu hỏi</h4>
        <div style={rowWrap}>
          <select
            style={inputStyle}
            value={filters.subject_id}
            onChange={(e) => setFilters({ ...filters, subject_id: e.target.value })}
          >
            <option value="">Tất cả môn</option>
            {subjects.map((s) => (
              <option key={s.id} value={s.id}>
                {s.subject_name}
              </option>
            ))}
          </select>

          <select
            style={inputStyle}
            value={filters.difficulty_level}
            onChange={(e) => setFilters({ ...filters, difficulty_level: e.target.value })}
          >
            <option value="">Tất cả độ khó</option>
            <option value="1">Dễ</option>
            <option value="2">Trung bình</option>
            <option value="3">Khó</option>
          </select>

          <select
            style={inputStyle}
            value={filters.question_type}
            onChange={(e) => setFilters({ ...filters, question_type: e.target.value })}
          >
            <option value="">Tất cả loại</option>
            <option value="1">Loại 1 - Đơn</option>
            <option value="2">Loại 2 - Đa/Mệnh đề</option>
            <option value="3">Loại 3 - Điền từ</option>
          </select>

          <select
            style={inputStyle}
            value={filters.target}
            onChange={(e) => setFilters({ ...filters, target: e.target.value })}
          >
            <option value="">Ôn tập + Thi thử</option>
            <option value="practice">Ôn tập</option>
            <option value="exam">Thi thử</option>
          </select>

          <input
            style={inputStyle}
            placeholder="Lọc chủ đề ôn tập"
            value={filters.practice_topic}
            onChange={(e) => setFilters({ ...filters, practice_topic: e.target.value })}
          />

          <input
            style={inputStyle}
            placeholder="Tìm theo nội dung"
            value={filters.search}
            onChange={(e) => setFilters({ ...filters, search: e.target.value })}
          />

          <button type="submit" style={primaryBtn}>Lọc</button>
        </div>
      </form>

      <div style={cardBox}>
        <h4>Danh sách câu hỏi ({questions.length})</h4>
        <div style={{ overflowX: "auto", marginTop: "10px" }}>
          <table style={{ width: "100%", borderCollapse: "collapse", background: "#fff" }}>
            <thead>
              <tr>
                <th style={thStyle}>ID</th>
                <th style={thStyle}>Môn</th>
                <th style={thStyle}>Nội dung</th>
                <th style={thStyle}>Loại</th>
                <th style={thStyle}>Độ khó</th>
                <th style={thStyle}>Nhóm</th>
                <th style={thStyle}>Chủ đề ôn tập</th>
                <th style={thStyle}>Đáp án</th>
                <th style={thStyle}>Thao tác</th>
              </tr>
            </thead>
            <tbody>
              {questions.map((q) => (
                <tr key={q.id}>
                  <td style={tdStyle}>{q.id}</td>
                  <td style={tdStyle}>{q.subject_name}</td>
                  <td style={tdStyle}><MathText text={q.question_text} /></td>
                  <td style={tdStyle}>{q.question_type}</td>
                  <td style={tdStyle}>{q.difficulty_level}</td>
                  <td style={tdStyle}>{q.is_exam ? "Thi thử" : "Ôn tập"}</td>
                  <td style={tdStyle}><MathText text={q.practice_topic || "-"} /></td>
                  <td style={tdStyle}><MathText text={q.correct_answer} /></td>
                  <td style={tdStyle}>
                    <button style={primaryBtn} onClick={() => handleEditQuestion(q)}>Sửa</button>
                    <button
                      style={{ ...dangerBtn, marginLeft: "8px" }}
                      onClick={() => handleDeleteQuestion(q.id)}
                    >
                      Xóa
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </section>
  );
}

const cardBox = {
  marginTop: "14px",
  border: "1px solid #e4e4e4",
  borderRadius: "8px",
  background: "#fff",
  padding: "14px",
};

const rowWrap = {
  display: "flex",
  flexWrap: "wrap",
  gap: "10px",
  alignItems: "center",
};

const inputStyle = {
  minWidth: "180px",
  flex: 1,
  border: "1px solid #d0d0d0",
  borderRadius: "6px",
  padding: "8px 10px",
  color: "#2b4763",
  fontSize: "16px",
  fontWeight: 500,
};

const textareaStyle = {
  width: "100%",
  maxWidth: "100%",
  boxSizing: "border-box",
  border: "1px solid #d0d0d0",
  borderRadius: "6px",
  padding: "8px 10px",
  color: "#2b4763",
  fontSize: "16px",
  fontWeight: 500,
  marginTop: "10px",
  resize: "vertical",
  overflowX: "hidden",
};

const optionTextareaStyle = {
  ...inputStyle,
  minHeight: "42px",
  resize: "none",
  overflowY: "hidden",
  whiteSpace: "pre-wrap",
};

const previewBoxStyle = {
  marginTop: "10px",
  padding: "12px 14px",
  border: "1px solid #d5e3f1",
  borderRadius: "8px",
  background: "#f8fbff",
  color: "#24425f",
  lineHeight: 1.7,
};

const previewLabelStyle = {
  marginBottom: "6px",
  color: "#274b6f",
  fontSize: "13px",
  fontWeight: 600,
};

const primaryBtn = {
  border: "none",
  background: "#0066cc",
  color: "#fff",
  borderRadius: "6px",
  padding: "8px 12px",
  cursor: "pointer",
  fontWeight: 600,
};

const secondaryBtn = {
  border: "none",
  background: "#777",
  color: "#fff",
  borderRadius: "6px",
  padding: "8px 12px",
  cursor: "pointer",
  fontWeight: 600,
};

const dangerBtn = {
  border: "none",
  background: "#cc3333",
  color: "#fff",
  borderRadius: "6px",
  padding: "8px 12px",
  cursor: "pointer",
  fontWeight: 600,
};

const okBox = {
  marginTop: "10px",
  background: "#e8f7eb",
  border: "1px solid #b9e3c0",
  color: "#1f7a2f",
  borderRadius: "6px",
  padding: "8px 10px",
};

const errBox = {
  marginTop: "10px",
  background: "#fdeeee",
  border: "1px solid #f2b8b8",
  color: "#b42323",
  borderRadius: "6px",
  padding: "8px 10px",
};

const thStyle = {
  textAlign: "left",
  padding: "10px",
  borderBottom: "1px solid #d5e3f1",
  background: "#f6f6f6",
  color: "#284764",
  fontWeight: 700,
};

const tdStyle = {
  padding: "10px",
  borderBottom: "1px solid #e3edf7",
  verticalAlign: "top",
  color: "#2b4763",
  fontWeight: 500,
};

export default QuestionManager;
