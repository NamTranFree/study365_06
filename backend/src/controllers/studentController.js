const pool = require("../config/database");

const normalizeText = (value) => String(value || "").trim().toLowerCase();

const normalizeChoice = (value) => String(value || "").trim().toUpperCase();

const getExamAvailabilityStatus = (availableFrom, availableTo) => {
  const now = Date.now();
  const fromMs = availableFrom ? new Date(availableFrom).getTime() : null;
  const toMs = availableTo ? new Date(availableTo).getTime() : null;

  if (fromMs && now < fromMs) {
    return "upcoming";
  }

  if (toMs && now > toMs) {
    return "expired";
  }

  return "open";
};

const queryOrDefault = async (connection, sql, params, defaultValue) => {
  try {
    const [rows] = await connection.query(sql, params);
    return rows;
  } catch (error) {
    // Nếu thiếu bảng thống kê, vẫn cho dashboard chạy với giá trị mặc định
    if (error.code === "ER_NO_SUCH_TABLE") {
      return defaultValue;
    }
    throw error;
  }
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

exports.getDashboard = async (req, res) => {
  let connection;
  try {
    connection = await pool.getConnection();
    const userId = req.userId;

    const [practiceCountRow] = await queryOrDefault(
      connection,
      "SELECT COUNT(*) AS total FROM practice_results WHERE user_id = ?",
      [userId],
      [{ total: 0 }]
    );

    const [examCountRow] = await queryOrDefault(
      connection,
      "SELECT COUNT(*) AS total FROM exam_attempts WHERE user_id = ?",
      [userId],
      [{ total: 0 }]
    );

    const [avgScoreRow] = await queryOrDefault(
      connection,
      "SELECT ROUND(AVG(score), 2) AS avgScore FROM exam_attempts WHERE user_id = ? AND status IN ('submitted', 'completed')",
      [userId],
      [{ avgScore: 0 }]
    );

    const [recentAttempts] = await queryOrDefault(
      connection,
      "SELECT id, exam_id, score, total_score, status, started_at, submitted_at FROM exam_attempts WHERE user_id = ? ORDER BY started_at DESC LIMIT 5",
      [userId],
      []
    );

    return res.status(200).json({
      success: true,
      data: {
        totalPracticeQuestions: practiceCountRow.total || 0,
        totalExamAttempts: examCountRow.total || 0,
        averageExamScore: Number(avgScoreRow.avgScore || 0),
        recentAttempts,
      },
    });
  } catch (error) {
    console.error("Lỗi lấy dashboard student:", error);
    return res.status(500).json({
      success: false,
      message: "Không thể lấy dữ liệu dashboard",
      error: error.message,
    });
  } finally {
    if (connection) {
      connection.release();
    }
  }
};

exports.getPracticeSubjects = async (req, res) => {
  let connection;
  try {
    connection = await pool.getConnection();

    const [subjects] = await connection.query(
      `SELECT s.id, s.subject_name, s.subject_code, COUNT(q.id) AS practice_questions
       FROM subjects s
       JOIN questions q ON q.subject_id = s.id AND q.is_practice = 1
       GROUP BY s.id, s.subject_name, s.subject_code
       ORDER BY s.subject_name ASC`
    );

    return res.status(200).json({
      success: true,
      subjects,
    });
  } catch (error) {
    console.error("Lỗi lấy danh sách môn ôn thi:", error);
    return res.status(500).json({
      success: false,
      message: "Không thể lấy danh sách môn ôn thi",
      error: error.message,
    });
  } finally {
    if (connection) {
      connection.release();
    }
  }
};

exports.getPracticeTopics = async (req, res) => {
  let connection;
  try {
    const subjectId = Number(req.query.subject_id);

    if (!Number.isInteger(subjectId) || subjectId <= 0) {
      return res.status(400).json({
        success: false,
        message: "subject_id không hợp lệ",
      });
    }

    connection = await pool.getConnection();
    await ensurePracticeTopicTable(connection);

    const [topics] = await connection.query(
      `SELECT
         COALESCE(NULLIF(TRIM(qpt.topic_name), ''), 'Chưa phân loại') AS topic_name,
         COUNT(q.id) AS question_count
       FROM questions q
       LEFT JOIN question_practice_topics qpt ON qpt.question_id = q.id
       WHERE q.subject_id = ? AND q.is_practice = 1
       GROUP BY COALESCE(NULLIF(TRIM(qpt.topic_name), ''), 'Chưa phân loại')
       ORDER BY topic_name ASC`,
      [subjectId]
    );

    return res.status(200).json({
      success: true,
      topics,
    });
  } catch (error) {
    console.error("Lỗi lấy danh sách chương ôn thi:", error);
    return res.status(500).json({
      success: false,
      message: "Không thể lấy danh sách chương ôn thi",
      error: error.message,
    });
  } finally {
    if (connection) {
      connection.release();
    }
  }
};

exports.getPracticeQuestions = async (req, res) => {
  let connection;
  try {
    const subjectId = Number(req.query.subject_id);
    const limitRaw = Number(req.query.limit);
    const shuffle = String(req.query.shuffle || "0") === "1";
    const practiceTopic = String(req.query.practice_topic || "").trim();

    if (!Number.isInteger(subjectId) || subjectId <= 0) {
      return res.status(400).json({
        success: false,
        message: "subject_id không hợp lệ",
      });
    }

    const limit = Number.isInteger(limitRaw) && limitRaw > 0 ? Math.min(limitRaw, 100) : null;

    connection = await pool.getConnection();
     await ensurePracticeTopicTable(connection);

     let sql = `SELECT q.id, q.subject_id, q.question_text, q.question_type, q.difficulty_level,
                 qpt.topic_name AS practice_topic
       FROM questions q
       LEFT JOIN question_practice_topics qpt ON qpt.question_id = q.id
       WHERE q.subject_id = ? AND q.is_practice = 1`;
    const params = [subjectId];

    if (practiceTopic) {
      if (practiceTopic === "Chưa phân loại") {
        sql += " AND (qpt.topic_name IS NULL OR TRIM(qpt.topic_name) = '')";
      } else {
        sql += " AND qpt.topic_name = ?";
        params.push(practiceTopic);
      }
    }

    if (shuffle) {
      sql += " ORDER BY RAND()";
    } else {
      sql += " ORDER BY q.id ASC";
    }

    if (limit) {
      sql += " LIMIT ?";
      params.push(limit);
    }

    const [questions] = await connection.query(sql, params);

    const questionIds = questions.map((item) => item.id);
    let options = [];

    if (questionIds.length > 0) {
      const placeholders = questionIds.map(() => "?").join(",");
      const [optionRows] = await connection.query(
        `SELECT id, question_id, option_letter, option_text
         FROM question_options
         WHERE question_id IN (${placeholders})
         ORDER BY id ASC`,
        questionIds
      );
      options = optionRows;
    }

    const optionsMap = options.reduce((acc, item) => {
      if (!acc[item.question_id]) {
        acc[item.question_id] = [];
      }
      acc[item.question_id].push({
        id: item.id,
        option_letter: item.option_letter,
        option_text: item.option_text,
      });
      return acc;
    }, {});

    const payload = questions.map((question) => ({
      ...question,
      options: optionsMap[question.id] || [],
    }));

    return res.status(200).json({
      success: true,
      questions: payload,
    });
  } catch (error) {
    console.error("Lỗi lấy câu hỏi ôn thi:", error);
    return res.status(500).json({
      success: false,
      message: "Không thể lấy câu hỏi ôn thi",
      error: error.message,
    });
  } finally {
    if (connection) {
      connection.release();
    }
  }
};

exports.getPracticeSummary = async (req, res) => {
  let connection;
  try {
    connection = await pool.getConnection();
    const userId = req.userId;

    const [overallRows] = await queryOrDefault(
      connection,
      `SELECT
         COUNT(*) AS total_attempts,
         SUM(CASE WHEN is_correct = 1 THEN 1 ELSE 0 END) AS correct_attempts,
         ROUND(
           CASE WHEN COUNT(*) = 0 THEN 0 ELSE (SUM(CASE WHEN is_correct = 1 THEN 1 ELSE 0 END) * 100.0 / COUNT(*)) END,
           2
         ) AS accuracy
       FROM practice_results
       WHERE user_id = ?`,
      [userId],
      [{ total_attempts: 0, correct_attempts: 0, accuracy: 0 }]
    );

    const [bySubject] = await queryOrDefault(
      connection,
      `SELECT
         s.id AS subject_id,
         s.subject_name,
         COUNT(pr.id) AS total_attempts,
         SUM(CASE WHEN pr.is_correct = 1 THEN 1 ELSE 0 END) AS correct_attempts,
         ROUND(
           CASE WHEN COUNT(pr.id) = 0 THEN 0 ELSE (SUM(CASE WHEN pr.is_correct = 1 THEN 1 ELSE 0 END) * 100.0 / COUNT(pr.id)) END,
           2
         ) AS accuracy
       FROM practice_results pr
       JOIN questions q ON q.id = pr.question_id
       JOIN subjects s ON s.id = q.subject_id
       WHERE pr.user_id = ?
       GROUP BY s.id, s.subject_name
       ORDER BY accuracy DESC, total_attempts DESC, s.subject_name ASC`,
      [userId],
      []
    );

    return res.status(200).json({
      success: true,
      data: {
        totalAttempts: Number(overallRows[0]?.total_attempts || 0),
        correctAttempts: Number(overallRows[0]?.correct_attempts || 0),
        accuracy: Number(overallRows[0]?.accuracy || 0),
        bySubject,
      },
    });
  } catch (error) {
    console.error("Lỗi lấy thống kê ôn tập:", error);
    return res.status(500).json({
      success: false,
      message: "Không thể lấy thống kê ôn tập",
      error: error.message,
    });
  } finally {
    if (connection) {
      connection.release();
    }
  }
};

exports.getPracticeHistory = async (req, res) => {
  let connection;
  try {
    connection = await pool.getConnection();
    const userId = req.userId;
    const limitRaw = Number(req.query.limit);
    const limit = Number.isInteger(limitRaw) && limitRaw > 0 ? Math.min(limitRaw, 100) : 20;

    const [history] = await queryOrDefault(
      connection,
      `SELECT
         pr.id,
         pr.question_id,
         pr.user_answer,
         pr.is_correct,
         pr.attempt_time,
         pr.attempt_date,
         q.question_text,
         q.correct_answer,
         q.question_type,
         s.subject_name
       FROM practice_results pr
       JOIN questions q ON q.id = pr.question_id
       JOIN subjects s ON s.id = q.subject_id
       WHERE pr.user_id = ?
       ORDER BY pr.attempt_date DESC
       LIMIT ?`,
      [userId, limit],
      []
    );

    return res.status(200).json({
      success: true,
      history,
    });
  } catch (error) {
    console.error("Lỗi lấy lịch sử ôn tập:", error);
    return res.status(500).json({
      success: false,
      message: "Không thể lấy lịch sử ôn tập",
      error: error.message,
    });
  } finally {
    if (connection) {
      connection.release();
    }
  }
};

exports.checkPracticeAnswer = async (req, res) => {
  let connection;
  try {
    const questionId = Number(req.body.question_id);
    const attemptTimeRaw = req.body.attempt_time;
    const rawUserAnswer = req.body.user_answer;

    if (!Number.isInteger(questionId) || questionId <= 0) {
      return res.status(400).json({
        success: false,
        message: "question_id không hợp lệ",
      });
    }

    if (rawUserAnswer === undefined || rawUserAnswer === null || String(rawUserAnswer).trim() === "") {
      return res.status(400).json({
        success: false,
        message: "Vui lòng nhập/chọn đáp án trước khi kiểm tra",
      });
    }

    const attemptTime = Number(attemptTimeRaw);
    const normalizedAttemptTime = Number.isFinite(attemptTime) && attemptTime >= 0
      ? Math.floor(attemptTime)
      : null;

    connection = await pool.getConnection();

    const [questionRows] = await connection.query(
      `SELECT id, question_type, correct_answer, explanation, is_practice
       FROM questions
       WHERE id = ?`,
      [questionId]
    );

    if (questionRows.length === 0 || Number(questionRows[0].is_practice) !== 1) {
      return res.status(404).json({
        success: false,
        message: "Không tìm thấy câu hỏi ôn thi",
      });
    }

    const question = questionRows[0];
    const questionType = Number(question.question_type);
    let isCorrect = false;

    if (questionType === 1) {
      isCorrect = normalizeChoice(rawUserAnswer) === normalizeChoice(question.correct_answer);
    } else if (questionType === 2) {
      isCorrect = Number(rawUserAnswer) === Number(question.correct_answer);
    } else if (questionType === 3) {
      isCorrect = normalizeText(rawUserAnswer) === normalizeText(question.correct_answer);
    }

    await connection.query(
      `INSERT INTO practice_results (user_id, question_id, user_answer, is_correct, attempt_time)
       VALUES (?, ?, ?, ?, ?)`,
      [req.userId, questionId, String(rawUserAnswer), isCorrect ? 1 : 0, normalizedAttemptTime]
    );

    return res.status(200).json({
      success: true,
      result: {
        question_id: questionId,
        is_correct: isCorrect,
        user_answer: rawUserAnswer,
        correct_answer: question.correct_answer,
        explanation: question.explanation || "Chưa có lời giải chi tiết cho câu này.",
      },
    });
  } catch (error) {
    console.error("Lỗi kiểm tra đáp án ôn thi:", error);
    return res.status(500).json({
      success: false,
      message: "Không thể kiểm tra đáp án",
      error: error.message,
    });
  } finally {
    if (connection) {
      connection.release();
    }
  }
};

// ===== EXAM (THI THỬ) =====

exports.getExams = async (req, res) => {
  let connection;
  try {
    connection = await pool.getConnection();
    const subjectId = req.query.subject_id ? Number(req.query.subject_id) : null;

    let sql = `SELECT e.id, e.exam_name, e.description, e.duration, e.total_questions,
              e.passing_score, e.available_from, e.available_to,
              s.subject_name, s.id AS subject_id
               FROM exams e
               JOIN subjects s ON s.id = e.subject_id
               WHERE e.is_published = 1`;
    const params = [];

    if (subjectId && Number.isInteger(subjectId) && subjectId > 0) {
      sql += " AND e.subject_id = ?";
      params.push(subjectId);
    }

    sql += " ORDER BY e.created_at DESC";

    const [examRows] = await connection.query(sql, params);

    const exams = examRows.map((exam) => {
      const availabilityStatus = getExamAvailabilityStatus(exam.available_from, exam.available_to);
      return {
        ...exam,
        availability_status: availabilityStatus,
        can_start: availabilityStatus === "open",
      };
    });

    return res.status(200).json({ success: true, exams });
  } catch (error) {
    console.error("Lỗi lấy danh sách đề thi:", error);
    return res.status(500).json({ success: false, message: "Không thể lấy danh sách đề thi", error: error.message });
  } finally {
    if (connection) connection.release();
  }
};

exports.getExamSubjects = async (req, res) => {
  let connection;
  try {
    connection = await pool.getConnection();

    const [subjects] = await connection.query(
      `SELECT s.id, s.subject_name, COUNT(e.id) AS exam_count
       FROM subjects s
       JOIN exams e ON e.subject_id = s.id AND e.is_published = 1
       GROUP BY s.id, s.subject_name
       ORDER BY s.subject_name ASC`
    );

    return res.status(200).json({ success: true, subjects });
  } catch (error) {
    console.error("Lỗi lấy môn thi:", error);
    return res.status(500).json({ success: false, message: "Không thể lấy danh sách môn thi", error: error.message });
  } finally {
    if (connection) connection.release();
  }
};

exports.startExam = async (req, res) => {
  let connection;
  try {
    const examId = Number(req.params.examId);
    if (!Number.isInteger(examId) || examId <= 0) {
      return res.status(400).json({ success: false, message: "examId không hợp lệ" });
    }

    connection = await pool.getConnection();

    const [examRows] = await connection.query(
      `SELECT id, exam_name, duration, total_questions, passing_score, is_published,
              available_from, available_to
       FROM exams
       WHERE id = ?`,
      [examId]
    );

    if (examRows.length === 0 || !examRows[0].is_published) {
      return res.status(404).json({ success: false, message: "Đề thi không tồn tại hoặc chưa được xuất bản" });
    }

    const exam = examRows[0];
    const availabilityStatus = getExamAvailabilityStatus(exam.available_from, exam.available_to);

    if (availabilityStatus === "upcoming") {
      return res.status(403).json({ success: false, message: "Chưa đến thời gian mở đề thi" });
    }

    if (availabilityStatus === "expired") {
      return res.status(403).json({ success: false, message: "Đề thi đã hết thời gian làm bài" });
    }

    const nowMs = Date.now();
    const availableToMs = exam.available_to ? new Date(exam.available_to).getTime() : null;
    const remainingWindowSeconds = availableToMs ? Math.floor((availableToMs - nowMs) / 1000) : null;
    const durationSeconds = Number(exam.duration) * 60;

    if (remainingWindowSeconds !== null && remainingWindowSeconds <= 0) {
      return res.status(403).json({ success: false, message: "Đề thi đã hết thời gian làm bài" });
    }

    const allowedDurationSeconds = remainingWindowSeconds !== null
      ? Math.min(durationSeconds, remainingWindowSeconds)
      : durationSeconds;

    const [result] = await connection.query(
      "INSERT INTO exam_attempts (user_id, exam_id, total_score, status) VALUES (?, ?, ?, 'in_progress')",
      [req.userId, examId, exam.total_questions]
    );

    const attemptId = result.insertId;

    const [questions] = await connection.query(
      `SELECT q.id, q.question_text, q.question_type, q.difficulty_level, eq.order_index
       FROM exam_questions eq
       JOIN questions q ON q.id = eq.question_id
       WHERE eq.exam_id = ?
       ORDER BY eq.order_index ASC`,
      [examId]
    );

    const questionIds = questions.map((q) => q.id);
    let options = [];

    if (questionIds.length > 0) {
      const placeholders = questionIds.map(() => "?").join(",");
      const [optionRows] = await connection.query(
        `SELECT id, question_id, option_letter, option_text FROM question_options WHERE question_id IN (${placeholders}) ORDER BY id ASC`,
        questionIds
      );
      options = optionRows;
    }

    const optionsMap = options.reduce((acc, item) => {
      if (!acc[item.question_id]) acc[item.question_id] = [];
      acc[item.question_id].push({ id: item.id, option_letter: item.option_letter, option_text: item.option_text });
      return acc;
    }, {});

    const payload = questions.map((q) => ({
      ...q,
      options: optionsMap[q.id] || [],
    }));

    return res.status(200).json({
      success: true,
      attemptId,
      exam: {
        id: exam.id,
        exam_name: exam.exam_name,
        duration: exam.duration,
        total_questions: exam.total_questions,
        available_from: exam.available_from,
        available_to: exam.available_to,
        allowed_duration_seconds: allowedDurationSeconds,
      },
      questions: payload,
    });
  } catch (error) {
    console.error("Lỗi bắt đầu thi:", error);
    return res.status(500).json({ success: false, message: "Không thể bắt đầu bài thi", error: error.message });
  } finally {
    if (connection) connection.release();
  }
};

exports.submitExam = async (req, res) => {
  let connection;
  try {
    const examId = Number(req.params.examId);
    const attemptId = Number(req.body.attemptId);
    const answers = req.body.answers;
    const durationTaken = Number(req.body.duration_taken) || 0;

    if (!Number.isInteger(examId) || examId <= 0) {
      return res.status(400).json({ success: false, message: "examId không hợp lệ" });
    }
    if (!Number.isInteger(attemptId) || attemptId <= 0) {
      return res.status(400).json({ success: false, message: "attemptId không hợp lệ" });
    }
    if (!answers || typeof answers !== "object") {
      return res.status(400).json({ success: false, message: "answers không hợp lệ" });
    }

    connection = await pool.getConnection();

    const [attemptRows] = await connection.query(
      `SELECT ea.id, ea.status, ea.total_score, e.available_to
       FROM exam_attempts ea
       JOIN exams e ON e.id = ea.exam_id
       WHERE ea.id = ? AND ea.user_id = ? AND ea.exam_id = ?`,
      [attemptId, req.userId, examId]
    );

    if (attemptRows.length === 0) {
      return res.status(404).json({ success: false, message: "Không tìm thấy bài thi" });
    }
    if (attemptRows[0].status !== "in_progress") {
      return res.status(400).json({ success: false, message: "Bài thi này đã được nộp rồi" });
    }

    const availableTo = attemptRows[0].available_to ? new Date(attemptRows[0].available_to).getTime() : null;
    if (availableTo) {
      const graceMs = 5000;
      if (Date.now() > availableTo + graceMs) {
        return res.status(403).json({ success: false, message: "Đã quá thời gian làm bài của đề thi" });
      }
    }

    const [examQuestions] = await connection.query(
      `SELECT q.id, q.question_type, q.correct_answer
       FROM exam_questions eq
       JOIN questions q ON q.id = eq.question_id
       WHERE eq.exam_id = ?`,
      [examId]
    );

    let correctCount = 0;
    const answerRows = [];

    for (const question of examQuestions) {
      const qId = String(question.id);
      const userAnswer = answers[qId] !== undefined ? String(answers[qId]) : "";
      const questionType = Number(question.question_type);
      let isCorrect = false;

      if (userAnswer !== "") {
        if (questionType === 1) {
          isCorrect = normalizeChoice(userAnswer) === normalizeChoice(question.correct_answer);
        } else if (questionType === 2) {
          isCorrect = Number(userAnswer) === Number(question.correct_answer);
        } else if (questionType === 3) {
          isCorrect = normalizeText(userAnswer) === normalizeText(question.correct_answer);
        }
      }

      if (isCorrect) correctCount++;
      answerRows.push([attemptId, question.id, userAnswer || null, isCorrect ? 1 : 0]);
    }

    const totalQuestions = examQuestions.length || 1;
    const score = Number(((correctCount / totalQuestions) * 10).toFixed(2));

    if (answerRows.length > 0) {
      await connection.query(
        "INSERT INTO exam_question_answers (exam_attempt_id, question_id, user_answer, is_correct) VALUES ?",
        [answerRows]
      );
    }

    await connection.query(
      "UPDATE exam_attempts SET score = ?, status = 'submitted', submitted_at = NOW(), duration_taken = ? WHERE id = ?",
      [score, durationTaken, attemptId]
    );

    return res.status(200).json({
      success: true,
      result: {
        attemptId,
        score,
        total_questions: totalQuestions,
        correct_count: correctCount,
        total_score: 10,
      },
    });
  } catch (error) {
    console.error("Lỗi nộp bài thi:", error);
    return res.status(500).json({ success: false, message: "Không thể nộp bài thi", error: error.message });
  } finally {
    if (connection) connection.release();
  }
};

exports.getExamResult = async (req, res) => {
  let connection;
  try {
    const attemptId = Number(req.params.attemptId);
    if (!Number.isInteger(attemptId) || attemptId <= 0) {
      return res.status(400).json({ success: false, message: "attemptId không hợp lệ" });
    }

    connection = await pool.getConnection();

    const [attemptRows] = await connection.query(
      `SELECT ea.id, ea.score, ea.total_score, ea.duration_taken, ea.status, ea.submitted_at,
              e.exam_name, e.passing_score, s.subject_name
       FROM exam_attempts ea
       JOIN exams e ON e.id = ea.exam_id
       JOIN subjects s ON s.id = e.subject_id
       WHERE ea.id = ? AND ea.user_id = ?`,
      [attemptId, req.userId]
    );

    if (attemptRows.length === 0) {
      return res.status(404).json({ success: false, message: "Không tìm thấy kết quả bài thi" });
    }

    const attempt = attemptRows[0];

    const [answers] = await connection.query(
      `SELECT eqa.question_id, eqa.user_answer, eqa.is_correct,
              q.question_text, q.correct_answer, q.explanation, q.question_type,
              eq.order_index
       FROM exam_question_answers eqa
       JOIN questions q ON q.id = eqa.question_id
       JOIN exam_questions eq ON eq.question_id = q.id AND eq.exam_id = (SELECT exam_id FROM exam_attempts WHERE id = ?)
       WHERE eqa.exam_attempt_id = ?
       ORDER BY eq.order_index ASC`,
      [attemptId, attemptId]
    );

    const questionIds = answers.map((a) => a.question_id);
    let options = [];
    if (questionIds.length > 0) {
      const placeholders = questionIds.map(() => "?").join(",");
      const [optRows] = await connection.query(
        `SELECT id, question_id, option_letter, option_text FROM question_options WHERE question_id IN (${placeholders}) ORDER BY id ASC`,
        questionIds
      );
      options = optRows;
    }

    const optionsMap = options.reduce((acc, item) => {
      if (!acc[item.question_id]) acc[item.question_id] = [];
      acc[item.question_id].push(item);
      return acc;
    }, {});

    const answersWithOptions = answers.map((a) => ({
      ...a,
      options: optionsMap[a.question_id] || [],
    }));

    return res.status(200).json({
      success: true,
      attempt,
      answers: answersWithOptions,
    });
  } catch (error) {
    console.error("Lỗi lấy kết quả bài thi:", error);
    return res.status(500).json({ success: false, message: "Không thể lấy kết quả bài thi", error: error.message });
  } finally {
    if (connection) connection.release();
  }
};

exports.getExamHistory = async (req, res) => {
  let connection;
  try {
    connection = await pool.getConnection();
    const userId = req.userId;

    const [history] = await connection.query(
      `SELECT ea.id, ea.score, ea.total_score, ea.status, ea.started_at, ea.submitted_at,
              e.exam_name, s.subject_name, e.passing_score
       FROM exam_attempts ea
       JOIN exams e ON e.id = ea.exam_id
       JOIN subjects s ON s.id = e.subject_id
       WHERE ea.user_id = ?
       ORDER BY ea.started_at DESC
       LIMIT 50`,
      [userId]
    );

    return res.status(200).json({ success: true, history });
  } catch (error) {
    console.error("Lỗi lấy lịch sử thi:", error);
    return res.status(500).json({ success: false, message: "Không thể lấy lịch sử thi", error: error.message });
  } finally {
    if (connection) connection.release();
  }
};
