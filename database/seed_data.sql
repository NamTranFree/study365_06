-- Dữ liệu mẫu cho hệ thống

-- 1. Thêm môn học
INSERT INTO subjects (subject_name, subject_code, description) VALUES
('Toán học', 'MATH', 'Môn toán học cấp III'),
('Vật lý', 'PHYSICS', 'Môn vật lý cấp III'),
('Hóa học', 'CHEMISTRY', 'Môn hóa học cấp III'),
('Tiếng Anh', 'ENGLISH', 'Môn tiếng Anh cấp III');

-- 2. Thêm người dùng (mật khẩu: hash từ 123456)
INSERT INTO users (username, email, password, full_name, role) VALUES
('admin', 'admin@othi.com', '$2a$10$/mfvyGV1Rqdar.3kB5E2Gew4zcsSD1dhySK5YXlwT2pcHM1oF3gIe', 'Quản trị viên', 'admin'),
('student1', 'student1@othi.com', '$2a$10$/mfvyGV1Rqdar.3kB5E2Gew4zcsSD1dhySK5YXlwT2pcHM1oF3gIe', 'Nguyễn Văn A', 'student'),
('student2', 'student2@othi.com', '$2a$10$/mfvyGV1Rqdar.3kB5E2Gew4zcsSD1dhySK5YXlwT2pcHM1oF3gIe', 'Trần Thị B', 'student'),
('student3', 'student3@othi.com', '$2a$10$/mfvyGV1Rqdar.3kB5E2Gew4zcsSD1dhySK5YXlwT2pcHM1oF3gIe', 'Lê Văn C', 'student');

-- 3. Thêm câu hỏi mẫu cho Toán học (Loại 1 - Đơn chọn)
INSERT INTO questions (subject_id, question_text, question_type, difficulty_level, is_practice, is_exam, correct_answer, explanation, created_by) VALUES
(1, 'Giải phương trình: 2x + 5 = 15', 1, 1, TRUE, TRUE, 'A', 'Chuyển vế: 2x = 15 - 5 = 10. Chia 2: x = 5. Đáp án A', 1),
(1, 'Tính giá trị: (3^2 - 5) × 2', 1, 1, TRUE, FALSE, 'B', '(9 - 5) × 2 = 4 × 2 = 8. Đáp án B', 1),
(1, 'Hàm số y = x² + 2x + 1 có đỉnh tại điểm nào?', 1, 2, TRUE, TRUE, 'C', 'Dạng chuẩn: y = (x+1)². Đỉnh tại (-1, 0). Đáp án C', 1),
(1, 'Giải bất phương trình: x² - 5x + 6 > 0', 1, 2, TRUE, TRUE, 'D', 'Phân tích: (x-2)(x-3) > 0. Nghiệm: x < 2 hoặc x > 3. Đáp án D', 1),
(1, 'Tính tích phân: ∫(2x + 3)dx từ 0 đến 1', 1, 3, TRUE, FALSE, 'A', 'Nguyên hàm: x² + 3x. Thay cận: (1 + 3) - (0) = 4. Đáp án A', 1);

-- 4. Thêm tùy chọn cho các câu hỏi Toán (Loại đơn chọn)
INSERT INTO question_options (question_id, option_letter, option_text) VALUES
(1, 'A', 'x = 5'),
(1, 'B', 'x = 10'),
(1, 'C', 'x = 3'),
(1, 'D', 'x = 2'),
(1, 'E', 'x = 7'),

(2, 'A', '6'),
(2, 'B', '8'),
(2, 'C', '10'),
(2, 'D', '12'),
(2, 'E', '14'),

(3, 'A', '(0, 1)'),
(3, 'B', '(1, 0)'),
(3, 'C', '(-1, 0)'),
(3, 'D', '(-1, -1)'),
(3, 'E', '(1, 1)'),

(4, 'A', 'x < -3 hoặc x > 2'),
(4, 'B', '-3 < x < 2'),
(4, 'C', 'x < -2 hoặc x > -3'),
(4, 'D', 'x < 2 hoặc x > 3'),
(4, 'E', '2 < x < 3'),

(5, 'A', '4'),
(5, 'B', '3'),
(5, 'C', '5'),
(5, 'D', '6'),
(5, 'E', '7');

-- 5. Thêm câu hỏi Vật lý
INSERT INTO questions (subject_id, question_text, question_type, difficulty_level, is_practice, is_exam, correct_answer, explanation, created_by) VALUES
(2, 'Lực là gì?', 1, 1, TRUE, TRUE, 'A', 'Lực là đại lượng vectơ, đặc trưng cho tác dụng của vật này lên vật khác. Đáp án A', 1),
(2, 'Công thức tính động năng là?', 1, 1, TRUE, FALSE, 'B', 'Động năng: Wđ = 1/2 × m × v². Đáp án B', 1),
(2, 'Tốc độ ánh sáng trong chân không xấp xỉ bằng bao nhiêu?', 1, 1, TRUE, TRUE, 'C', 'c ≈ 3 × 10⁸ m/s. Đáp án C', 1);

-- 6. Thêm tùy chọn cho câu hỏi Vật lý
INSERT INTO question_options (question_id, option_letter, option_text) VALUES
(6, 'A', 'Đại lượng vectơ, đặc trưng cho tác dụng của vật này lên vật khác'),
(6, 'B', 'Một dạng chuyển động'),
(6, 'C', 'Một dạng năng lượng'),
(6, 'D', 'Một dạng momentum'),
(6, 'E', 'Một đại lượng mô tả vị trí'),

(7, 'A', 'Wđ = m × g × h'),
(7, 'B', 'Wđ = 1/2 × m × v²'),
(7, 'C', 'Wđ = m × v'),
(7, 'D', 'Wđ = m × a × t'),
(7, 'E', 'Wđ = m × v²'),

(8, 'A', '3 × 10⁶ m/s'),
(8, 'B', '3 × 10⁷ m/s'),
(8, 'C', '3 × 10⁸ m/s'),
(8, 'D', '3 × 10⁹ m/s'),
(8, 'E', '3 × 10¹⁰ m/s');

-- 7. Tạo một đề thi thử
INSERT INTO exams (exam_name, subject_id, description, duration, total_questions, passing_score, is_published, created_by) VALUES
('Đề thi thử Toán - Kỳ 1', 1, 'Đề thi thử giữa kỳ 1 môn Toán', 90, 5, 100, TRUE, 1),
('Đề thi thử Vật lý - Cơ bản', 2, 'Đề thi thử từng nội dung môn Vật lý', 60, 3, 60, TRUE, 1);

-- 8. Thêm câu hỏi vào đề thi
INSERT INTO exam_questions (exam_id, question_id, order_index) VALUES
(1, 1, 1),
(1, 2, 2),
(1, 3, 3),
(1, 4, 4),
(1, 5, 5),
(2, 6, 1),
(2, 7, 2),
(2, 8, 3);

-- 9. Thêm kết quả luyện tập mẫu
INSERT INTO practice_results (user_id, question_id, user_answer, is_correct, attempt_time) VALUES
(2, 1, 'A', TRUE, 120),
(2, 2, 'B', TRUE, 150),
(2, 3, 'C', FALSE, 180),
(3, 1, 'B', FALSE, 90),
(3, 2, 'B', TRUE, 120);

-- 10. Thêm lịch sử thi
INSERT INTO exam_attempts (user_id, exam_id, score, total_score, duration_taken, status, submitted_at) VALUES
(2, 1, 80, 100, 5400, 'completed', NOW()),
(2, 2, 60, 100, 3600, 'completed', NOW()),
(3, 1, 70, 100, 5580, 'completed', NOW());

-- 11. Thêm đáp án chi tiết
INSERT INTO exam_question_answers (exam_attempt_id, question_id, user_answer, is_correct) VALUES
(1, 1, 'A', TRUE),
(1, 2, 'B', TRUE),
(1, 3, 'C', FALSE),
(1, 4, 'D', TRUE),
(1, 5, 'A', TRUE),
(2, 6, 'A', TRUE),
(2, 7, 'B', TRUE),
(2, 8, 'C', TRUE),
(3, 1, 'C', FALSE),
(3, 2, 'B', TRUE),
(3, 3, 'C', FALSE),
(3, 4, 'D', TRUE),
(3, 5, 'A', TRUE);

-- 12. Cập nhật thống kê người dùng
INSERT INTO user_statistics (user_id, total_exams_taken, total_practice_questions, average_exam_score) VALUES
(2, 2, 2, 70.00),
(3, 1, 3, 70.00);
