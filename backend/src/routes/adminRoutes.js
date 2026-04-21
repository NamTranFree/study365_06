const express = require("express");
const router = express.Router();
const adminController = require("../controllers/adminController");
const { authenticate, authorizeRoles } = require("../middlewares/auth");

router.use(authenticate, authorizeRoles("admin"));

router.get("/overview", adminController.getOverview);
router.get("/users", adminController.getUsers);
router.patch("/users/:id/role", adminController.updateUserRole);
router.patch("/users/:id/status", adminController.updateUserStatus);
router.delete("/users/:id", adminController.deleteUser);

router.get("/subjects", adminController.getSubjects);
router.post("/subjects", adminController.createSubject);
router.delete("/subjects/:id", adminController.deleteSubject);

router.get("/questions", adminController.getQuestions);
router.post("/questions", adminController.createQuestion);
router.put("/questions/:id", adminController.updateQuestion);
router.delete("/questions/:id", adminController.deleteQuestion);

// Quản lý đề thi
router.get("/exams", adminController.getExams);
router.post("/exams", adminController.createExam);
router.put("/exams/:id", adminController.updateExam);
router.patch("/exams/:id/publish", adminController.toggleExamPublish);
router.delete("/exams/:id", adminController.deleteExam);
router.get("/exams/:id/questions", adminController.getExamQuestions);

module.exports = router;
