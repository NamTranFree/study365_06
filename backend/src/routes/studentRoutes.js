const express = require("express");
const router = express.Router();
const studentController = require("../controllers/studentController");
const { authenticate, authorizeRoles } = require("../middlewares/auth");

router.use(authenticate, authorizeRoles("student", "admin"));

router.get("/dashboard", studentController.getDashboard);
router.get("/subjects", studentController.getPracticeSubjects);
router.get("/practice/topics", studentController.getPracticeTopics);
router.get("/practice/questions", studentController.getPracticeQuestions);
router.post("/practice/check", studentController.checkPracticeAnswer);
router.get("/practice/summary", studentController.getPracticeSummary);
router.get("/practice/history", studentController.getPracticeHistory);

// Exam (Thi thử)
router.get("/exam/subjects", studentController.getExamSubjects);
router.get("/exams", studentController.getExams);
router.post("/exams/:examId/start", studentController.startExam);
router.post("/exams/:examId/submit", studentController.submitExam);
router.get("/exam/attempts/:attemptId/result", studentController.getExamResult);
router.get("/exam/history", studentController.getExamHistory);

module.exports = router;
