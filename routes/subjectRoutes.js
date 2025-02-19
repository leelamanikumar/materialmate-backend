import express from "express";
import { auth } from "../middleware/auth.js";
import { createSubject, deleteSubject } from "../controllers/subjectController.js";
import Subject from '../models/Subject.js';

const router = express.Router();

router.post("/create", auth, createSubject);
router.delete("/:id", auth, deleteSubject);

// Get all subjects (user)
router.get('/', auth, async (req, res) => {
    try {
        const subjects = await Subject.find()
            .populate({
                path: 'materials',
                select: 'title fileName link' // Explicitly select the fields we want
            });
        res.json(subjects);
    } catch (error) {
        res.status(500).json({ message: error.message });
    }
});

export default router;