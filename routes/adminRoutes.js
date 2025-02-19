import express from 'express';
import { adminAuth } from '../middleware/auth.js';
import Subject from '../models/Subject.js';
import Material from '../models/Material.js';
import fs from 'fs';

const router = express.Router();

// Get all subjects (admin)
router.get('/subjects', adminAuth, async (req, res) => {
    try {
        const subjects = await Subject.find()
            .populate({
                path: 'materials',
                select: 'title fileName link _id' // Make sure we're selecting all needed fields
            });
        res.json(subjects);
    } catch (error) {
        console.error("Error fetching subjects:", error);
        res.status(500).json({ message: error.message });
    }
});

// Add new subject
router.post('/subjects', adminAuth, async (req, res) => {
    try {
        const { name, description } = req.body;
        const subject = new Subject({ name, description });
        await subject.save();
        res.status(201).json(subject);
    } catch (error) {
        res.status(400).json({ message: error.message });
    }
});

// Delete subject
router.delete('/subjects/:id', adminAuth, async (req, res) => {
    try {
        const subject = await Subject.findById(req.params.id);
        if (!subject) {
            return res.status(404).json({ message: "Subject not found" });
        }

        // Delete all materials associated with this subject
        for (const materialId of subject.materials) {
            const material = await Material.findById(materialId);
            if (material && material.filePath) {
                // Delete file if it exists
                try {
                    if (fs.existsSync(material.filePath)) {
                        fs.unlinkSync(material.filePath);
                    }
                } catch (error) {
                    console.error('Error deleting file:', error);
                }
            }
            await Material.findByIdAndDelete(materialId);
        }

        // Delete the subject
        await Subject.findByIdAndDelete(req.params.id);
        res.json({ message: "Subject and associated materials deleted successfully" });
    } catch (error) {
        console.error("Delete subject error:", error);
        res.status(500).json({ message: error.message });
    }
});

// Delete material
router.delete('/materials/:id', adminAuth, async (req, res) => {
    try {
        const { id } = req.params;
        const { subjectId } = req.body;

        console.log('Delete material request:', { id, subjectId });

        const material = await Material.findById(id);
        if (!material) {
            return res.status(404).json({ message: "Material not found" });
        }

        // Delete file if it exists
        if (material.filePath) {
            try {
                if (fs.existsSync(material.filePath)) {
                    fs.unlinkSync(material.filePath);
                }
            } catch (error) {
                console.error('Error deleting file:', error);
            }
        }

        // Remove material reference from subject
        await Subject.findByIdAndUpdate(
            subjectId,
            { $pull: { materials: id } }
        );

        // Delete the material
        await Material.findByIdAndDelete(id);
        res.json({ message: "Material deleted successfully" });
    } catch (error) {
        console.error("Delete material error:", error);
        res.status(500).json({ message: error.message });
    }
});

// Add this route to handle file downloads
router.get('/materials/download/:id', adminAuth, async (req, res) => {
    try {
        const material = await Material.findById(req.params.id);
        if (!material || !material.filePath) {
            return res.status(404).json({ message: "File not found" });
        }

        res.download(material.filePath, material.fileName);
    } catch (error) {
        console.error("Download error:", error);
        res.status(500).json({ message: "Error downloading file" });
    }
});

export default router; 