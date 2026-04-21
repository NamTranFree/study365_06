-- Hướng dẫn thêm câu hỏi từng cái một
-- Copy các khối code này vào MySQL Workbench hoặc command line

-- ==========================================
-- THÊM CÂU HỎI TOÁN HỌC
-- ==========================================

-- Câu 1: Giải phương trình (Loại 1 - Đơn)
INSERT INTO questions (subject_id, question_text, question_type, difficulty_level, is_practice, is_exam, correct_answer, explanation, created_by) 
VALUES (1, 'Giải phương trình: 2x + 5 = 15', 1, 1, TRUE, TRUE, 'A', 'Chuyển vế: 2x = 15 - 5 = 10. Chia 2: x = 5. Đáp án A', 1);
-- Lấy ID từ LAST_INSERT_ID() hoặc check bảng
INSERT INTO question_options (question_id, option_letter, option_text) VALUES
(9, 'A', 'x = 5'),
(9, 'B', 'x = 10'),
(9, 'C', 'x = 3'),
(9, 'D', 'x = 2');

-- ==========================================
-- THÊM CÂU HỎI VẬT LÝ
-- ==========================================

-- Câu 1: Định nghĩa lực (Loại 1 - Đơn)
INSERT INTO questions (subject_id, question_text, question_type, difficulty_level, is_practice, is_exam, correct_answer, explanation, created_by) 
VALUES (2, 'Lực là gì?', 1, 1, TRUE, TRUE, 'A', 'Lực là đại lượng vectơ, đặc trưng cho tác dụng của vật này lên vật khác', 1);
INSERT INTO question_options (question_id, option_letter, option_text) VALUES
(10, 'A', 'Đại lượng vectơ, đặc trưng cho tác dụng của vật này lên vật khác'),
(10, 'B', 'Một dạng chuyển động'),
(10, 'C', 'Một dạng năng lượng'),
(10, 'D', 'Một đại lượng mô tả vị trí');

-- ==========================================
-- THÊM CÂU HỎI HÓA HỌC
-- ==========================================

-- Câu 1: Định nghĩa hóa trị (Loại 1)
INSERT INTO questions (subject_id, question_text, question_type, difficulty_level, is_practice, is_exam, correct_answer, explanation, created_by) 
VALUES (3, 'Hóa trị của Carbon trong CO₂ là bao nhiêu?', 1, 1, TRUE, TRUE, 'B', 'Carbon trong CO₂ có hóa trị +4', 1);
INSERT INTO question_options (question_id, option_letter, option_text) VALUES
(11, 'A', '+2'),
(11, 'B', '+4'),
(11, 'C', '+1'),
(11, 'D', '+3');

-- ==========================================
-- THÊM CÂU HỎI TIẾNG ANH
-- ==========================================

-- Câu 1: Chia động từ (Loại 1)
INSERT INTO questions (subject_id, question_text, question_type, difficulty_level, is_practice, is_exam, correct_answer, explanation, created_by) 
VALUES (4, 'Chọn từ đúng: She ___ to school every day.', 1, 1, TRUE, TRUE, 'C', 'She (cô ấy) là chủ ngữ số ít, chia ở thì hiện tại đơn: goes', 1);
INSERT INTO question_options (question_id, option_letter, option_text) VALUES
(12, 'A', 'go'),
(12, 'B', 'going'),
(12, 'C', 'goes'),
(12, 'D', 'has gone');

-- ==========================================
-- THÊM CÂU HỎI LOẠI 2 (ĐA / MỆNH ĐỀ)
-- ==========================================

-- Ví dụ: Loại câu hỏi "chọn các phát biểu đúng" (có thể chọn A, B, C...)
INSERT INTO questions (subject_id, question_text, question_type, difficulty_level, is_practice, is_exam, correct_answer, explanation, created_by) 
VALUES (1, 'Phương trình y = 2x + 1 có đặc điểm nào sau đây? (Chọn nhiều)', 2, 2, TRUE, TRUE, 'A,B', 'A đúng: hệ số góc 2. B đúng: giao Y ở 1', 1);
INSERT INTO question_options (question_id, option_letter, option_text) VALUES
(13, 'A', 'Hệ số góc k = 2'),
(13, 'B', 'Giao trục tung tại điểm (0, 1)'),
(13, 'C', 'Đây là hàm bậc 2'),
(13, 'D', 'Đi qua gốc tọa độ');

-- ==========================================
-- THÊM CÂU HỎI LOẠI 3 (ĐIỀN TỪ)
-- ==========================================

-- Ví dụ: Điền từ mà không có option
INSERT INTO questions (subject_id, question_text, question_type, difficulty_level, is_practice, is_exam, correct_answer, explanation, created_by) 
VALUES (2, 'Công thức năng lượng: E = _____ (Hãy điền công thức)', 3, 2, TRUE, FALSE, 'mc²', 'Công thức nổi tiếng của Einstein: E = mc². Trong đó m là khối lượng, c là tốc độ ánh sáng', 1);

-- Lưu ý: Câu hỏi loại 3 KHÔNG cần thêm question_options

-- ==========================================
-- KIỂM TRA DỮ LIỆU
-- ==========================================

-- Xem tất cả câu hỏi đã thêm
SELECT q.id, q.question_text, q.question_type, q.difficulty_level, q.is_practice, q.is_exam, s.subject_name 
FROM questions q 
JOIN subjects s ON q.subject_id = s.id 
ORDER BY q.id DESC;

-- Xem tùy chọn của câu hỏi
SELECT qo.question_id, qo.option_letter, qo.option_text 
FROM question_options qo 
WHERE qo.question_id = 9 
ORDER BY qo.option_letter;

-- Đếm số câu hỏi theo môn
SELECT s.subject_name, COUNT(q.id) as tong_cau_hoi 
FROM subjects s 
LEFT JOIN questions q ON s.id = q.subject_id 
GROUP BY s.id;

-- Đếm câu hỏi theo loại
SELECT question_type, COUNT(id) as so_luong 
FROM questions 
GROUP BY question_type;

-- Đếm câu hỏi ôn tập vs thi thử
SELECT is_practice, is_exam, COUNT(id) as so_luong 
FROM questions 
WHERE is_practice = TRUE OR is_exam = TRUE 
GROUP BY is_practice, is_exam;
