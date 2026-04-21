-- Tạo cơ sở dữ liệu
CREATE DATABASE IF NOT EXISTS othi_thi_thu;
USE othi_thi_thu;

-- 1. Bảng người dùng
CREATE TABLE users (
  id INT PRIMARY KEY AUTO_INCREMENT,
  username VARCHAR(50) UNIQUE NOT NULL,
  email VARCHAR(100) UNIQUE NOT NULL,
  password VARCHAR(255) NOT NULL,
  full_name VARCHAR(100),
  role ENUM('admin', 'student') DEFAULT 'student',
  is_active BOOLEAN DEFAULT TRUE,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
);

-- 2. Bảng môn học
CREATE TABLE subjects (
  id INT PRIMARY KEY AUTO_INCREMENT,
  subject_name VARCHAR(100) NOT NULL,
  subject_code VARCHAR(20) UNIQUE,
  description TEXT,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
);

-- 3. Bảng câu hỏi (ngân hàng câu hỏi)
-- Người dùng đẩy từng câu hỏi lên một
CREATE TABLE questions (
  id INT PRIMARY KEY AUTO_INCREMENT,
  subject_id INT NOT NULL,
  question_text LONGTEXT NOT NULL,
  -- Loại câu hỏi: 1 = Đơn (chọn 1), 2 = Đa/Mệnh đề (chọn nhiều), 3 = Điền từ
  question_type INT DEFAULT 1,
  -- Độ khó: 1 = Dễ, 2 = Trung bình, 3 = Khó
  difficulty_level INT DEFAULT 1,
  -- Phân chia: true = câu ôn tập, false = câu thi thử
  is_practice BOOLEAN DEFAULT TRUE,
  is_exam BOOLEAN DEFAULT FALSE,
  -- Đáp án đúng (hỗ trợ cả 1 hoặc nhiều đáp án)
  correct_answer VARCHAR(500) NOT NULL,
  -- Lời giải chi tiết
  explanation LONGTEXT,
  created_by INT,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  FOREIGN KEY (subject_id) REFERENCES subjects(id),
  FOREIGN KEY (created_by) REFERENCES users(id)
);

-- 4. Bảng các tùy chọn trả lời (cho loại câu hỏi 1 và 2)
CREATE TABLE question_options (
  id INT PRIMARY KEY AUTO_INCREMENT,
  question_id INT NOT NULL,
  option_letter CHAR(1) NOT NULL, -- A, B, C, D, E...
  option_text LONGTEXT NOT NULL,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (question_id) REFERENCES questions(id) ON DELETE CASCADE
);

-- 4b. Bảng chủ đề/chương ôn tập (chỉ áp dụng cho câu hỏi ôn tập)
CREATE TABLE question_practice_topics (
  question_id INT PRIMARY KEY,
  topic_name VARCHAR(150) NOT NULL,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  FOREIGN KEY (question_id) REFERENCES questions(id) ON DELETE CASCADE
);

-- 5. Bảng kết quả luyện tập (ôn thi)
CREATE TABLE practice_results (
  id INT PRIMARY KEY AUTO_INCREMENT,
  user_id INT NOT NULL,
  question_id INT NOT NULL,
  user_answer VARCHAR(500),
  is_correct BOOLEAN,
  attempt_time INT, -- thời gian làm (giây)
  attempt_date TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (user_id) REFERENCES users(id),
  FOREIGN KEY (question_id) REFERENCES questions(id)
);

-- 6. Bảng đề thi (thi thử)
CREATE TABLE exams (
  id INT PRIMARY KEY AUTO_INCREMENT,
  exam_name VARCHAR(200) NOT NULL,
  subject_id INT NOT NULL,
  description TEXT,
  duration INT NOT NULL, -- thời gian làm bài (phút)
  total_questions INT NOT NULL,
  passing_score INT, -- điểm đạt
  available_from DATETIME, -- thời gian mở đề
  available_to DATETIME, -- thời gian đóng đề
  is_published BOOLEAN DEFAULT FALSE,
  created_by INT,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  FOREIGN KEY (subject_id) REFERENCES subjects(id),
  FOREIGN KEY (created_by) REFERENCES users(id)
);

-- 7. Bảng các câu hỏi trong đề thi
CREATE TABLE exam_questions (
  id INT PRIMARY KEY AUTO_INCREMENT,
  exam_id INT NOT NULL,
  question_id INT NOT NULL,
  order_index INT NOT NULL, -- thứ tự câu hỏi trong đề
  FOREIGN KEY (exam_id) REFERENCES exams(id) ON DELETE CASCADE,
  FOREIGN KEY (question_id) REFERENCES questions(id)
);

-- 8. Bảng lịch sử làm bài thi (thi thử)
CREATE TABLE exam_attempts (
  id INT PRIMARY KEY AUTO_INCREMENT,
  user_id INT NOT NULL,
  exam_id INT NOT NULL,
  score DECIMAL(5, 2) DEFAULT 0, -- điểm đạt được
  total_score INT NOT NULL, -- tổng điểm
  duration_taken INT, -- thời gian thực tế làm bài (giây)
  status ENUM('in_progress', 'submitted', 'completed') DEFAULT 'in_progress',
  cheating_count INT DEFAULT 0, -- số lần phát hiện gian lận
  submitted_at TIMESTAMP,
  started_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (user_id) REFERENCES users(id),
  FOREIGN KEY (exam_id) REFERENCES exams(id)
);

-- 9. Bảng đáp án từng câu trong bài thi
CREATE TABLE exam_question_answers (
  id INT PRIMARY KEY AUTO_INCREMENT,
  exam_attempt_id INT NOT NULL,
  question_id INT NOT NULL,
  user_answer VARCHAR(500),
  is_correct BOOLEAN,
  answer_time INT, -- thời gian trả lời (giây)
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (exam_attempt_id) REFERENCES exam_attempts(id) ON DELETE CASCADE,
  FOREIGN KEY (question_id) REFERENCES questions(id)
);

-- 10. Bảng xếp hạng
CREATE TABLE rankings (
  id INT PRIMARY KEY AUTO_INCREMENT,
  user_id INT NOT NULL,
  exam_id INT,
  ranking INT,
  score DECIMAL(5, 2),
  total_attempts INT,
  best_score DECIMAL(5, 2),
  average_score DECIMAL(5, 2),
  fastest_time INT, -- thời gian làm nhanh nhất (giây)
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  FOREIGN KEY (user_id) REFERENCES users(id),
  FOREIGN KEY (exam_id) REFERENCES exams(id)
);

-- 11. Bảng giám sát gian lận
CREATE TABLE cheating_detection (
  id INT PRIMARY KEY AUTO_INCREMENT,
  exam_attempt_id INT NOT NULL,
  detection_type ENUM('tab_switch', 'window_blur', 'screenshot') DEFAULT 'tab_switch',
  violation_count INT DEFAULT 1,
  detected_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  action_taken ENUM('warning', 'auto_submit') DEFAULT 'warning',
  FOREIGN KEY (exam_attempt_id) REFERENCES exam_attempts(id) ON DELETE CASCADE
);

-- 12. Bảng thống kê người dùng
CREATE TABLE user_statistics (
  id INT PRIMARY KEY AUTO_INCREMENT,
  user_id INT NOT NULL UNIQUE,
  total_exams_taken INT DEFAULT 0,
  total_practice_questions INT DEFAULT 0,
  average_exam_score DECIMAL(5, 2) DEFAULT 0,
  average_practice_score DECIMAL(5, 2) DEFAULT 0,
  total_practice_time INT DEFAULT 0, -- tổng thời gian ôn tập (phút)
  total_exam_time INT DEFAULT 0, -- tổng thời gian thi (phút)
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  FOREIGN KEY (user_id) REFERENCES users(id)
);

-- Tạo INDEX để tối ưu hiệu suất
CREATE INDEX idx_questions_subject ON questions(subject_id);
CREATE INDEX idx_questions_type ON questions(question_type);
CREATE INDEX idx_questions_difficulty ON questions(difficulty_level);
CREATE INDEX idx_practice_results_user ON practice_results(user_id);
CREATE INDEX idx_exam_attempts_user ON exam_attempts(user_id);
CREATE INDEX idx_exam_attempts_exam ON exam_attempts(exam_id);
CREATE INDEX idx_exam_questions_exam ON exam_questions(exam_id);
