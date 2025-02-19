import express from "express";
import { auth } from "../middleware/auth.js";
import { createMaterial, deleteMaterial, upload, getMaterialUrl } from "../controllers/materialController.js";
import Material from "../models/Material.js";
import path from 'path';

const router = express.Router();

router.post("/", upload.single('file'), createMaterial);
router.delete("/:id", auth, deleteMaterial);
router.get("/:subjectId", auth, async (req, res) => {
    try {
        const materials = await Material.find({ subject: req.params.subjectId });
        res.json(materials);
    } catch (error) {
        res.status(500).json({ message: error.message });
    }
});

// Add this new route for downloading materials
router.get("/download/:id", auth, async (req, res) => {
    try {
        const material = await Material.findById(req.params.id);
        if (!material) {
            return res.status(404).json({ message: "Material not found" });
        }

        // Send the file
        const filePath = path.resolve(material.filePath);
        res.download(filePath, material.fileName);
    } catch (error) {
        res.status(500).json({ message: error.message });
    }
});

router.get('/url/:id', getMaterialUrl);

export default router;