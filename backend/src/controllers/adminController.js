const pool = require("../config/database");

const normalizeBoolean = (value) => {
  if (typeof value === "boolean") return value;
  if (typeof value === "number") return value === 1;
  if (typeof value === "string") {
    const lower = value.toLowerCase();
    return lower === "true" || lower === "1";
  }
  return false;
};

const normalizeCorrectAnswer = (questionType, correctAnswer) => {
  if (Number(questionType) === 3) {
    return String(correctAnswer).trim().toLowerCase();
  }

  return String(correctAnswer).trim();
};

const sanitizePastedText = (value) => {
  const text = String(value ?? "")
    .replace(/\r/g, "")
    .replace(/\u00a0/g, " ")
    .replace(/\t/g, " ")
    .trim();

  if (!text) {
    return "";
  }

  const lines = text
    .split("\n")
    .map((line) => line.trim())
    .filter((line) => line !== "");

  if (lines.length === 0) {
    return "";
  }

  const shortLineCount = lines.filter((line) => line.length <= 2).length;
  const shortLineRatio = shortLineCount / lines.length;

  // Dạng copy lỗi từ PDF/OCR: mỗi ký tự nằm trên một dòng.
  if (lines.length >= 8 && shortLineRatio >= 0.6) {
    return lines.join("").replace(/\s{2,}/g, " ").trim();
  }

  return text
    .replace(/[ \t]+\n/g, "\n")
    .replace(/\n{3,}/g, "\n\n")
    .trim();
};

const sanitizeInlineText = (value) =>
  sanitizePastedText(value)
    .replace(/\n+/g, " ")
    .replace(/\s{2,}/g, " ")
    .trim();

const sanitizeQuestionPayload = (payload) => {
  const rawOptions = Array.isArray(payload.options) ? payload.options : [];

  return {
    ...payload,
    question_text: sanitizePastedText(payload.question_text),
    practice_topic: sanitizeInlineText(payload.practice_topic),
    correct_answer: sanitizeInlineText(payload.correct_answer),
    explanation: sanitizePastedText(payload.explanation),
    options: rawOptions.map((option) => ({
      option_letter: String(option.option_letter || "").trim().toUpperCase(),
      option_text: sanitizeInlineText(option.option_text),
    })),
  };
};

const validateQuestionPayload = (payload) => {
  const {
    subject_id,
    question_text,
    question_type,
    difficulty_level,
    is_practice,
    is_exam,
    practice_topic,
    correct_answer,
    options,
  } = payload;

  if (!subject_id || !question_text || !question_type || !difficulty_level || !correct_answer) {
    return "Vui lòng nhập đầy đủ thông tin bắt buộc";
  }

  if (![1, 2, 3].includes(Number(question_type))) {
    return "Loại câu hỏi không hợp lệ (chỉ nhận 1, 2, 3)";
  }

  if (![1, 2, 3].includes(Number(difficulty_level))) {
    return "Độ khó không hợp lệ (chỉ nhận 1, 2, 3)";
  }

  const practice = normalizeBoolean(is_practice);
  const exam = normalizeBoolean(is_exam);
  if ((practice && exam) || (!practice && !exam)) {
    return "Câu hỏi phải thuộc đúng 1 nhóm: ôn tập hoặc thi thử";
  }

  if (practice && !practice_topic) {
    return "Câu hỏi ôn tập cần nhập chủ đề/chương";
  }

  if ([1, 2].includes(Number(question_type))) {
    if (!Array.isArray(options) || options.length < 2) {
      return "Câu hỏi trắc nghiệm phải có ít nhất 2 phương án";
    }
  }

  if (Number(question_type) === 2) {
    const validOptionCount = options.filter(
      (item) => item && item.option_text && String(item.option_text).trim() !== ""
    ).length;
    const correctCount = Number(correct_answer);

    if (!Number.isInteger(correctCount) || correctCount < 1) {
      return "Loại 2 yêu cầu nhập số đáp án đúng là số nguyên >= 1";
    }

    if (correctCount > validOptionCount) {
      return "Số đáp án đúng không được lớn hơn số phương án đã nhập";
    }
  }

  return null;
};

const ensurePracticeTopicTable = async (connection) => {
  await connection.query(
    `CREATE TABLE IF NOT EXISTS question_practice_topics (
      question_id INT PRIMARY KEY,
      topic_name VARCHAR(150) NOT NULL,
      created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
      updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
      FOREIGN KEY (question_id) REFERENCES questions(id) ON DELETE CASCADE
    )`
  );
};

// Thống kê nhanh cho admin
exports.getOverview = async (req, res) => {
  let connection;
  try {
    connection = await pool.getConnection();

    const [[usersTotal]] = await connection.query("SELECT COUNT(*) AS total FROM users");
    const [[adminsTotal]] = await connection.query(
      "SELECT COUNT(*) AS total FROM users WHERE role = 'admin'"
    );
    const [[studentsTotal]] = await connection.query(
      "SELECT COUNT(*) AS total FROM users WHERE role = 'student'"
    );
    const [[activeUsersTotal]] = await connection.query(
      "SELECT COUNT(*) AS total FROM users WHERE is_active = 1"
    );

    return res.status(200).json({
      success: true,
      data: {
        usersTotal: usersTotal.total,
        adminsTotal: adminsTotal.total,
        studentsTotal: studentsTotal.total,
        activeUsersTotal: activeUsersTotal.total,
      },
    });
  } catch (error) {
    console.error("Lỗi lấy thống kê admin:", error);
    return res.status(500).json({
      success: false,
      message: "Không thể lấy thống kê admin",
      error: error.message,
    });
  } finally {
    if (connection) {
      connection.release();
    }
  }
};

// Danh sách user cho admin
exports.getUsers = async (req, res) => {
  let connection;
  try {
    connection = await pool.getConnection();

    const [users] = await connection.query(
      "SELECT id, username, email, full_name, role, is_active, created_at FROM users ORDER BY created_at DESC"
    );

    return res.status(200).json({
      success: true,
      users,
    });
  } catch (error) {
    console.error("Lỗi lấy danh sách user:", error);
    return res.status(500).json({
      success: false,
      message: "Không thể lấy danh sách người dùng",
      error: error.message,
    });
  } finally {
    if (connection) {
      connection.release();
    }
  }
};

// Đổi role user (admin <-> student)
exports.updateUserRole = async (req, res) => {
  let connection;
  try {
    const { id } = req.params;
    const { role } = req.body;

    if (!["admin", "student"].includes(role)) {
      return res.status(400).json({
        success: false,
        message: "Role không hợp lệ",
      });
    }

    // Không cho admin tự hạ quyền chính mình
    if (Number(id) === Number(req.userId) && role !== "admin") {
      return res.status(400).json({
        success: false,
        message: "Bạn không thể tự đổi quyền admin của chính mình",
      });
    }

    connection = await pool.getConnection();

    const [result] = await connection.query(
      "UPDATE users SET role = ? WHERE id = ?",
      [role, id]
    );

    if (result.affectedRows === 0) {
      return res.status(404).json({
        success: false,
        message: "Không tìm thấy người dùng",
      });
    }

    return res.status(200).json({
      success: true,
      message: "Cập nhật quyền thành công",
    });
  } catch (error) {
    console.error("Lỗi cập nhật role:", error);
    return res.status(500).json({
      success: false,
      message: "Không thể cập nhật quyền",
      error: error.message,
    });
  } finally {
    if (connection) {
      connection.release();
    }
  }
};

// Khóa/mở user
exports.updateUserStatus = async (req, res) => {
  let connection;
  try {
    const { id } = req.params;
    const { is_active } = req.body;

    if (typeof is_active !== "boolean") {
      return res.status(400).json({
        success: false,
        message: "is_active phải là boolean",
      });
    }

    // Không cho admin tự khóa tài khoản của mình
    if (Number(id) === Number(req.userId) && is_active === false) {
      return res.status(400).json({
        success: false,
        message: "Bạn không thể tự khóa tài khoản của chính mình",
      });
    }

    connection = await pool.getConnection();

    const [result] = await connection.query(
      "UPDATE users SET is_active = ? WHERE id = ?",
      [is_active, id]
    );

    if (result.affectedRows === 0) {
      return res.status(404).json({
        success: false,
        message: "Không tìm thấy người dùng",
      });
    }

    return res.status(200).json({
      success: true,
      message: "Cập nhật trạng thái thành công",
    });
  } catch (error) {
    console.error("Lỗi cập nhật trạng thái user:", error);
    return res.status(500).json({
      success: false,
      message: "Không thể cập nhật trạng thái",
      error: error.message,
    });
  } finally {
    if (connection) {
      connection.release();
    }
  }
};

// Xóa tài khoản người dùng
exports.deleteUser = async (req, res) => {
  let connection;
  try {
    const { id } = req.params;
    const userId = Number(id);

    if (!Number.isInteger(userId) || userId <= 0) {
      return res.status(400).json({
        success: false,
        message: "ID người dùng không hợp lệ",
      });
    }

    // Không cho admin tự xóa tài khoản của mình
    if (userId === Number(req.userId)) {
      return res.status(400).json({
        success: false,
        message: "Bạn không thể xóa tài khoản của chính mình",
      });
    }

    connection = await pool.getConnection();

    // Bắt đầu transaction để đảm bảo toàn vẹn dữ liệu
    await connection.beginTransaction();

    try {
      // Kiểm tra user có tồn tại không
      const [users] = await connection.query(
        "SELECT id, username FROM users WHERE id = ?",
        [userId]
      );

      if (users.length === 0) {
        await connection.rollback();
        return res.status(404).json({
          success: false,
          message: "Không tìm thấy người dùng",
        });
      }

      // Xóa các kết quả luyện tập của user
      await connection.query("DELETE FROM practice_results WHERE user_id = ?", [userId]);

      // Lấy danh sách đề thi do user tạo
      const [createdExams] = await connection.query(
        "SELECT id FROM exams WHERE created_by = ?",
        [userId]
      );
      const createdExamIds = createdExams.map((exam) => exam.id);

      if (createdExamIds.length > 0) {
        // Xóa dữ liệu phụ thuộc đề thi (theo thứ tự để tránh lỗi FK)
        await connection.query("DELETE FROM rankings WHERE exam_id IN (?)", [createdExamIds]);
        await connection.query("DELETE FROM exam_attempts WHERE exam_id IN (?)", [createdExamIds]);
        await connection.query("DELETE FROM exam_questions WHERE exam_id IN (?)", [createdExamIds]);
      }

      // Xóa các lần thi của user (nếu có)
      await connection.query("DELETE FROM exam_attempts WHERE user_id = ?", [userId]);

      // Xóa thống kê/xếp hạng của user
      await connection.query("DELETE FROM rankings WHERE user_id = ?", [userId]);
      await connection.query("DELETE FROM user_statistics WHERE user_id = ?", [userId]);

      // Lấy danh sách câu hỏi do user tạo
      const [createdQuestions] = await connection.query(
        "SELECT id FROM questions WHERE created_by = ?",
        [userId]
      );
      const createdQuestionIds = createdQuestions.map((question) => question.id);

      if (createdQuestionIds.length > 0) {
        // Xóa các bản ghi phụ thuộc câu hỏi trước khi xóa câu hỏi
        await connection.query("DELETE FROM exam_question_answers WHERE question_id IN (?)", [
          createdQuestionIds,
        ]);
        await connection.query("DELETE FROM exam_questions WHERE question_id IN (?)", [createdQuestionIds]);
        await connection.query("DELETE FROM practice_results WHERE question_id IN (?)", [
          createdQuestionIds,
        ]);
      }

      // Xóa questions do user tạo (question_options sẽ tự xóa theo ON DELETE CASCADE)
      await connection.query("DELETE FROM questions WHERE created_by = ?", [userId]);

      // Xóa exams do user tạo
      await connection.query("DELETE FROM exams WHERE created_by = ?", [userId]);

      // Xóa user
      await connection.query("DELETE FROM users WHERE id = ?", [userId]);

      // Commit transaction
      await connection.commit();

      return res.status(200).json({
        success: true,
        message: "Xóa tài khoản người dùng thành công",
        deletedUser: users[0],
      });
    } catch (error) {
      await connection.rollback();
      throw error;
    }
  } catch (error) {
    console.error("Lỗi xóa user:", error);
    return res.status(500).json({
      success: false,
      message: "Không thể xóa tài khoản người dùng",
      error: error.message,
    });
  } finally {
    if (connection) {
      connection.release();
    }
  }
};

// Danh sách môn học
exports.getSubjects = async (req, res) => {
  let connection;
  try {
    connection = await pool.getConnection();
    const [subjects] = await connection.query(
      `SELECT
         s.id,
         s.subject_name,
         s.subject_code,
         s.description,
         COUNT(DISTINCT q.id) AS question_count,
         COUNT(DISTINCT e.id) AS exam_count
       FROM subjects s
       LEFT JOIN questions q ON q.subject_id = s.id
       LEFT JOIN exams e ON e.subject_id = s.id
       GROUP BY s.id, s.subject_name, s.subject_code, s.description
       ORDER BY s.id DESC`
    );

    return res.status(200).json({
      success: true,
      subjects,
    });
  } catch (error) {
    console.error("Lỗi lấy môn học:", error);
    return res.status(500).json({
      success: false,
      message: "Không thể lấy danh sách môn học",
      error: error.message,
    });
  } finally {
    if (connection) {
      connection.release();
    }
  }
};

// Xóa môn học
exports.deleteSubject = async (req, res) => {
  let connection;
  try {
    const subjectId = Number(req.params.id);
    if (!Number.isInteger(subjectId) || subjectId <= 0) {
      return res.status(400).json({
        success: false,
        message: "id môn học không hợp lệ",
      });
    }

    connection = await pool.getConnection();

    const [[subjectRow]] = await connection.query(
      "SELECT id FROM subjects WHERE id = ?",
      [subjectId]
    );

    if (!subjectRow) {
      return res.status(404).json({
        success: false,
        message: "Không tìm thấy môn học",
      });
    }

    const [[questionCountRow]] = await connection.query(
      "SELECT COUNT(*) AS total FROM questions WHERE subject_id = ?",
      [subjectId]
    );

    if (Number(questionCountRow.total) > 0) {
      return res.status(400).json({
        success: false,
        message: "Không thể xóa môn học vì vẫn còn câu hỏi thuộc môn này",
      });
    }

    const [[examCountRow]] = await connection.query(
      "SELECT COUNT(*) AS total FROM exams WHERE subject_id = ?",
      [subjectId]
    );

    if (Number(examCountRow.total) > 0) {
      return res.status(400).json({
        success: false,
        message: "Không thể xóa môn học vì vẫn còn đề thi thuộc môn này",
      });
    }

    await connection.query("DELETE FROM subjects WHERE id = ?", [subjectId]);

    return res.status(200).json({
      success: true,
      message: "Xóa môn học thành công",
    });
  } catch (error) {
    console.error("Lỗi xóa môn học:", error);
    return res.status(500).json({
      success: false,
      message: "Không thể xóa môn học",
      error: error.message,
    });
  } finally {
    if (connection) {
      connection.release();
    }
  }
};

// Tạo môn học
exports.createSubject = async (req, res) => {
  let connection;
  try {
    const { subject_name, subject_code, description } = req.body;
    if (!subject_name) {
      return res.status(400).json({
        success: false,
        message: "subject_name là bắt buộc",
      });
    }

    connection = await pool.getConnection();
    const [result] = await connection.query(
      "INSERT INTO subjects (subject_name, subject_code, description) VALUES (?, ?, ?)",
      [subject_name, subject_code || null, description || null]
    );

    return res.status(201).json({
      success: true,
      message: "Tạo môn học thành công",
      id: result.insertId,
    });
  } catch (error) {
    console.error("Lỗi tạo môn học:", error);
    return res.status(500).json({
      success: false,
      message: "Không thể tạo môn học",
      error: error.message,
    });
  } finally {
    if (connection) {
      connection.release();
    }
  }
};

// Danh sách câu hỏi có lọc
exports.getQuestions = async (req, res) => {
  let connection;
  try {
    const { subject_id, difficulty_level, question_type, target, search, practice_topic } = req.query;
    connection = await pool.getConnection();
    await ensurePracticeTopicTable(connection);

    const conditions = [];
    const params = [];

    if (subject_id) {
      conditions.push("q.subject_id = ?");
      params.push(Number(subject_id));
    }

    if (difficulty_level) {
      conditions.push("q.difficulty_level = ?");
      params.push(Number(difficulty_level));
    }

    if (question_type) {
      conditions.push("q.question_type = ?");
      params.push(Number(question_type));
    }

    if (target === "practice") {
      conditions.push("q.is_practice = 1");
    }

    if (target === "exam") {
      conditions.push("q.is_exam = 1");
    }

    if (search) {
      conditions.push("q.question_text LIKE ?");
      params.push(`%${search}%`);
    }

    if (practice_topic) {
      conditions.push("qpt.topic_name LIKE ?");
      params.push(`%${practice_topic}%`);
    }

    const whereClause = conditions.length > 0 ? `WHERE ${conditions.join(" AND ")}` : "";

    const [questions] = await connection.query(
      `SELECT q.id, q.subject_id, s.subject_name, q.question_text, q.question_type,
              q.difficulty_level, q.is_practice, q.is_exam, q.correct_answer, q.explanation,
          q.created_at, qpt.topic_name AS practice_topic
       FROM questions q
       JOIN subjects s ON s.id = q.subject_id
        LEFT JOIN question_practice_topics qpt ON qpt.question_id = q.id
       ${whereClause}
       ORDER BY q.id DESC`,
      params
    );

    const questionIds = questions.map((q) => q.id);
    let options = [];
    if (questionIds.length > 0) {
      const placeholders = questionIds.map(() => "?").join(",");
      const [rows] = await connection.query(
        `SELECT id, question_id, option_letter, option_text FROM question_options WHERE question_id IN (${placeholders}) ORDER BY id ASC`,
        questionIds
      );
      options = rows;
    }

    const optionsMap = options.reduce((acc, item) => {
      if (!acc[item.question_id]) acc[item.question_id] = [];
      acc[item.question_id].push(item);
      return acc;
    }, {});

    const response = questions.map((q) => ({
      ...q,
      options: optionsMap[q.id] || [],
    }));

    return res.status(200).json({
      success: true,
      questions: response,
    });
  } catch (error) {
    console.error("Lỗi lấy câu hỏi:", error);
    return res.status(500).json({
      success: false,
      message: "Không thể lấy danh sách câu hỏi",
      error: error.message,
    });
  } finally {
    if (connection) {
      connection.release();
    }
  }
};

// Tạo câu hỏi
exports.createQuestion = async (req, res) => {
  let connection;
  try {
    const sanitizedPayload = sanitizeQuestionPayload(req.body);
    const validationError = validateQuestionPayload(sanitizedPayload);
    if (validationError) {
      return res.status(400).json({ success: false, message: validationError });
    }

    const {
      subject_id,
      question_text,
      question_type,
      difficulty_level,
      is_practice,
      is_exam,
      practice_topic,
      correct_answer,
      explanation,
      options,
    } = sanitizedPayload;

    connection = await pool.getConnection();
    await ensurePracticeTopicTable(connection);
    await connection.beginTransaction();

    const [result] = await connection.query(
      `INSERT INTO questions (
        subject_id, question_text, question_type, difficulty_level,
        is_practice, is_exam, correct_answer, explanation, created_by
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      [
        Number(subject_id),
        question_text,
        Number(question_type),
        Number(difficulty_level),
        normalizeBoolean(is_practice),
        normalizeBoolean(is_exam),
        normalizeCorrectAnswer(question_type, correct_answer),
        explanation || null,
        req.userId,
      ]
    );

    const questionId = result.insertId;

    if (normalizeBoolean(is_practice)) {
      await connection.query(
        `INSERT INTO question_practice_topics (question_id, topic_name)
         VALUES (?, ?)
         ON DUPLICATE KEY UPDATE topic_name = VALUES(topic_name)`,
        [questionId, practice_topic]
      );
    }

    if ([1, 2].includes(Number(question_type))) {
      for (const option of options) {
        if (!option.option_letter || !option.option_text) {
          await connection.rollback();
          return res.status(400).json({
            success: false,
            message: "Mỗi phương án phải có ký hiệu và nội dung",
          });
        }

        await connection.query(
          "INSERT INTO question_options (question_id, option_letter, option_text) VALUES (?, ?, ?)",
          [questionId, option.option_letter, option.option_text]
        );
      }
    }

    await connection.commit();
    return res.status(201).json({
      success: true,
      message: "Tạo câu hỏi thành công",
      id: questionId,
    });
  } catch (error) {
    if (connection) {
      await connection.rollback();
    }
    console.error("Lỗi tạo câu hỏi:", error);
    return res.status(500).json({
      success: false,
      message: "Không thể tạo câu hỏi",
      error: error.message,
    });
  } finally {
    if (connection) {
      connection.release();
    }
  }
};

// Cập nhật câu hỏi
exports.updateQuestion = async (req, res) => {
  let connection;
  try {
    const { id } = req.params;
    const sanitizedPayload = sanitizeQuestionPayload(req.body);
    const validationError = validateQuestionPayload(sanitizedPayload);
    if (validationError) {
      return res.status(400).json({ success: false, message: validationError });
    }

    const {
      subject_id,
      question_text,
      question_type,
      difficulty_level,
      is_practice,
      is_exam,
      practice_topic,
      correct_answer,
      explanation,
      options,
    } = sanitizedPayload;

    connection = await pool.getConnection();
    await ensurePracticeTopicTable(connection);
    await connection.beginTransaction();

    const [updateResult] = await connection.query(
      `UPDATE questions
       SET subject_id = ?, question_text = ?, question_type = ?, difficulty_level = ?,
           is_practice = ?, is_exam = ?, correct_answer = ?, explanation = ?
       WHERE id = ?`,
      [
        Number(subject_id),
        question_text,
        Number(question_type),
        Number(difficulty_level),
        normalizeBoolean(is_practice),
        normalizeBoolean(is_exam),
        normalizeCorrectAnswer(question_type, correct_answer),
        explanation || null,
        Number(id),
      ]
    );

    if (updateResult.affectedRows === 0) {
      await connection.rollback();
      return res.status(404).json({
        success: false,
        message: "Không tìm thấy câu hỏi",
      });
    }

    if (normalizeBoolean(is_practice)) {
      await connection.query(
        `INSERT INTO question_practice_topics (question_id, topic_name)
         VALUES (?, ?)
         ON DUPLICATE KEY UPDATE topic_name = VALUES(topic_name)`,
        [Number(id), practice_topic]
      );
    } else {
      await connection.query("DELETE FROM question_practice_topics WHERE question_id = ?", [Number(id)]);
    }

    await connection.query("DELETE FROM question_options WHERE question_id = ?", [Number(id)]);

    if ([1, 2].includes(Number(question_type))) {
      for (const option of options) {
        if (!option.option_letter || !option.option_text) {
          await connection.rollback();
          return res.status(400).json({
            success: false,
            message: "Mỗi phương án phải có ký hiệu và nội dung",
          });
        }

        await connection.query(
          "INSERT INTO question_options (question_id, option_letter, option_text) VALUES (?, ?, ?)",
          [Number(id), option.option_letter, option.option_text]
        );
      }
    }

    await connection.commit();
    return res.status(200).json({
      success: true,
      message: "Cập nhật câu hỏi thành công",
    });
  } catch (error) {
    if (connection) {
      await connection.rollback();
    }
    console.error("Lỗi cập nhật câu hỏi:", error);
    return res.status(500).json({
      success: false,
      message: "Không thể cập nhật câu hỏi",
      error: error.message,
    });
  } finally {
    if (connection) {
      connection.release();
    }
  }
};

// Xóa câu hỏi
exports.deleteQuestion = async (req, res) => {
  let connection;
  try {
    const { id } = req.params;
    const questionId = Number(id);
    if (!Number.isInteger(questionId) || questionId <= 0) {
      return res.status(400).json({
        success: false,
        message: "ID câu hỏi không hợp lệ",
      });
    }

    connection = await pool.getConnection();
    await connection.beginTransaction();

    const [existingRows] = await connection.query("SELECT id FROM questions WHERE id = ?", [questionId]);
    if (existingRows.length === 0) {
      await connection.rollback();
      return res.status(404).json({
        success: false,
        message: "Không tìm thấy câu hỏi",
      });
    }

    // Xóa dữ liệu phụ thuộc trước để tránh lỗi khóa ngoại.
    await connection.query("DELETE FROM exam_question_answers WHERE question_id = ?", [questionId]);
    await connection.query("DELETE FROM practice_results WHERE question_id = ?", [questionId]);
    await connection.query("DELETE FROM exam_questions WHERE question_id = ?", [questionId]);
    await connection.query("DELETE FROM question_options WHERE question_id = ?", [questionId]);

    const [result] = await connection.query("DELETE FROM questions WHERE id = ?", [questionId]);

    if (result.affectedRows === 0) {
      await connection.rollback();
      return res.status(404).json({
        success: false,
        message: "Không tìm thấy câu hỏi",
      });
    }

    await connection.commit();

    return res.status(200).json({
      success: true,
      message: "Xóa câu hỏi thành công",
    });
  } catch (error) {
    if (connection) {
      await connection.rollback();
    }
    console.error("Lỗi xóa câu hỏi:", error);
    return res.status(500).json({
      success: false,
      message: "Không thể xóa câu hỏi",
      error: error.message,
    });
  } finally {
    if (connection) {
      connection.release();
    }
  }
};

// ===== QUẢN LÝ ĐỀ THI =====

exports.getExams = async (req, res) => {
  let connection;
  try {
    connection = await pool.getConnection();

    const [exams] = await connection.query(
      `SELECT e.id, e.exam_name, e.description, e.duration, e.total_questions,
              e.passing_score, e.is_published, e.available_from, e.available_to, e.created_at,
              s.subject_name, s.id AS subject_id,
              CASE
                WHEN e.available_from IS NULL THEN 1
                WHEN NOW() < e.available_from THEN 1
                ELSE 0
              END AS can_edit_by_time,
              CASE
                WHEN EXISTS (SELECT 1 FROM exam_attempts ea WHERE ea.exam_id = e.id LIMIT 1) THEN 1
                ELSE 0
              END AS has_attempts
       FROM exams e
       JOIN subjects s ON s.id = e.subject_id
       ORDER BY e.created_at DESC`
    );

    return res.status(200).json({ success: true, exams });
  } catch (error) {
    console.error("Lỗi lấy danh sách đề thi:", error);
    return res.status(500).json({ success: false, message: "Không thể lấy danh sách đề thi", error: error.message });
  } finally {
    if (connection) connection.release();
  }
};

exports.createExam = async (req, res) => {
  let connection;
  try {
    const {
      exam_name,
      subject_id,
      description,
      duration,
      passing_score,
      question_ids,
      available_from,
      available_to,
    } = req.body;

    if (!exam_name || !subject_id || !duration || !Array.isArray(question_ids) || question_ids.length === 0) {
      return res.status(400).json({ success: false, message: "Vui lòng điền đầy đủ thông tin và chọn câu hỏi" });
    }

    if (!available_from || !available_to) {
      return res.status(400).json({ success: false, message: "Vui lòng chọn thời gian bắt đầu và kết thúc" });
    }

    const normalizedFrom = String(available_from).replace("T", " ") + ":00";
    const normalizedTo = String(available_to).replace("T", " ") + ":00";

    if (new Date(available_from).getTime() >= new Date(available_to).getTime()) {
      return res.status(400).json({ success: false, message: "Thời gian kết thúc phải sau thời gian bắt đầu" });
    }

    const total_questions = question_ids.length;
    connection = await pool.getConnection();
    await connection.beginTransaction();

    const [result] = await connection.query(
      "INSERT INTO exams (exam_name, subject_id, description, duration, total_questions, passing_score, available_from, available_to, is_published, created_by) VALUES (?, ?, ?, ?, ?, ?, ?, ?, 0, ?)",
      [
        exam_name.trim(),
        Number(subject_id),
        description || null,
        Number(duration),
        total_questions,
        passing_score ? Number(passing_score) : null,
        normalizedFrom,
        normalizedTo,
        req.userId,
      ]
    );

    const examId = result.insertId;

    for (let i = 0; i < question_ids.length; i++) {
      await connection.query(
        "INSERT INTO exam_questions (exam_id, question_id, order_index) VALUES (?, ?, ?)",
        [examId, Number(question_ids[i]), i + 1]
      );
    }

    await connection.commit();

    return res.status(201).json({ success: true, message: "Tạo đề thi thành công", examId });
  } catch (error) {
    if (connection) await connection.rollback();
    console.error("Lỗi tạo đề thi:", error);
    return res.status(500).json({ success: false, message: "Không thể tạo đề thi", error: error.message });
  } finally {
    if (connection) connection.release();
  }
};

exports.toggleExamPublish = async (req, res) => {
  let connection;
  try {
    const examId = Number(req.params.id);
    if (!Number.isInteger(examId) || examId <= 0) {
      return res.status(400).json({ success: false, message: "ID không hợp lệ" });
    }

    connection = await pool.getConnection();

    const [rows] = await connection.query("SELECT id, is_published FROM exams WHERE id = ?", [examId]);
    if (rows.length === 0) {
      return res.status(404).json({ success: false, message: "Không tìm thấy đề thi" });
    }

    const newStatus = rows[0].is_published ? 0 : 1;
    await connection.query("UPDATE exams SET is_published = ? WHERE id = ?", [newStatus, examId]);

    return res.status(200).json({ success: true, is_published: Boolean(newStatus), message: newStatus ? "Đã xuất bản đề thi" : "Đã ẩn đề thi" });
  } catch (error) {
    console.error("Lỗi thay đổi trạng thái đề thi:", error);
    return res.status(500).json({ success: false, message: "Không thể thay đổi trạng thái", error: error.message });
  } finally {
    if (connection) connection.release();
  }
};

exports.deleteExam = async (req, res) => {
  let connection;
  try {
    const examId = Number(req.params.id);
    if (!Number.isInteger(examId) || examId <= 0) {
      return res.status(400).json({ success: false, message: "ID không hợp lệ" });
    }

    connection = await pool.getConnection();
    await connection.beginTransaction();

    await connection.query(
      "DELETE eqa FROM exam_question_answers eqa JOIN exam_attempts ea ON ea.id = eqa.exam_attempt_id WHERE ea.exam_id = ?",
      [examId]
    );
    await connection.query("DELETE FROM exam_attempts WHERE exam_id = ?", [examId]);
    await connection.query("DELETE FROM exam_questions WHERE exam_id = ?", [examId]);
    await connection.query("DELETE FROM exams WHERE id = ?", [examId]);

    await connection.commit();

    return res.status(200).json({ success: true, message: "Xóa đề thi thành công" });
  } catch (error) {
    if (connection) await connection.rollback();
    console.error("Lỗi xóa đề thi:", error);
    return res.status(500).json({ success: false, message: "Không thể xóa đề thi", error: error.message });
  } finally {
    if (connection) connection.release();
  }
};

exports.updateExam = async (req, res) => {
  let connection;
  try {
    const examId = Number(req.params.id);
    if (!Number.isInteger(examId) || examId <= 0) {
      return res.status(400).json({ success: false, message: "ID không hợp lệ" });
    }

    const {
      exam_name,
      subject_id,
      description,
      duration,
      passing_score,
      question_ids,
      available_from,
      available_to,
    } = req.body;

    if (!exam_name || !subject_id || !duration || !Array.isArray(question_ids) || question_ids.length === 0) {
      return res.status(400).json({ success: false, message: "Vui lòng điền đầy đủ thông tin và chọn câu hỏi" });
    }

    if (!available_from || !available_to) {
      return res.status(400).json({ success: false, message: "Vui lòng chọn thời gian bắt đầu và kết thúc" });
    }

    const normalizedFrom = String(available_from).replace("T", " ") + ":00";
    const normalizedTo = String(available_to).replace("T", " ") + ":00";

    if (new Date(available_from).getTime() >= new Date(available_to).getTime()) {
      return res.status(400).json({ success: false, message: "Thời gian kết thúc phải sau thời gian bắt đầu" });
    }

    const total_questions = question_ids.length;
    connection = await pool.getConnection();

    const [existing] = await connection.query(
      `SELECT e.id, e.available_from,
              CASE
                WHEN EXISTS (SELECT 1 FROM exam_attempts ea WHERE ea.exam_id = e.id LIMIT 1) THEN 1
                ELSE 0
              END AS has_attempts
       FROM exams e
       WHERE e.id = ?`,
      [examId]
    );
    if (existing.length === 0) {
      return res.status(404).json({ success: false, message: "Không tìm thấy đề thi" });
    }

    const hasAttempts = Number(existing[0].has_attempts) === 1;
    const startedByTime = existing[0].available_from
      ? new Date(existing[0].available_from).getTime() <= Date.now()
      : false;

    if (hasAttempts || startedByTime) {
      return res.status(400).json({
        success: false,
        message: "Chỉ được sửa đề thi trước thời gian bắt đầu và khi chưa có học sinh làm bài",
      });
    }

    await connection.beginTransaction();

    await connection.query(
      "UPDATE exams SET exam_name=?, subject_id=?, description=?, duration=?, total_questions=?, passing_score=?, available_from=?, available_to=? WHERE id=?",
      [
        exam_name.trim(),
        Number(subject_id),
        description || null,
        Number(duration),
        total_questions,
        passing_score ? Number(passing_score) : null,
        normalizedFrom,
        normalizedTo,
        examId,
      ]
    );

    await connection.query("DELETE FROM exam_questions WHERE exam_id = ?", [examId]);

    for (let i = 0; i < question_ids.length; i++) {
      await connection.query(
        "INSERT INTO exam_questions (exam_id, question_id, order_index) VALUES (?, ?, ?)",
        [examId, Number(question_ids[i]), i + 1]
      );
    }

    await connection.commit();

    return res.status(200).json({ success: true, message: "Cập nhật đề thi thành công" });
  } catch (error) {
    if (connection) await connection.rollback();
    console.error("Lỗi cập nhật đề thi:", error);
    return res.status(500).json({ success: false, message: "Không thể cập nhật đề thi", error: error.message });
  } finally {
    if (connection) connection.release();
  }
};

exports.getExamQuestions = async (req, res) => {
  let connection;
  try {
    const examId = Number(req.params.id);
    if (!Number.isInteger(examId) || examId <= 0) {
      return res.status(400).json({ success: false, message: "ID không hợp lệ" });
    }

    connection = await pool.getConnection();

    const [questions] = await connection.query(
      `SELECT q.id, q.question_text, q.question_type, q.difficulty_level, q.correct_answer, eq.order_index
       FROM exam_questions eq
       JOIN questions q ON q.id = eq.question_id
       WHERE eq.exam_id = ?
       ORDER BY eq.order_index ASC`,
      [examId]
    );

    return res.status(200).json({ success: true, questions });
  } catch (error) {
    console.error("Lỗi lấy câu hỏi đề thi:", error);
    return res.status(500).json({ success: false, message: "Không thể lấy câu hỏi đề thi", error: error.message });
  } finally {
    if (connection) connection.release();
  }
};
