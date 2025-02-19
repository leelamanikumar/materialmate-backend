import Material from "../models/Material.js";
import Subject from "../models/Subject.js";
import multer from 'multer';
import path from 'path';
import mongoose from 'mongoose';
import fs from 'fs';

// Configure multer for file upload
const storage = multer.diskStorage({
    destination: function (req, file, cb) {
        cb(null, 'uploads/') // Make sure this directory exists
    },
    filename: function (req, file, cb) {
        cb(null, Date.now() + '-' + file.originalname)
    }
});

export const upload = multer({ 
    storage: storage,
    limits: { fileSize: 10 * 1024 * 1024 }, // 10MB limit
    fileFilter: (req, file, cb) => {
        const allowedTypes = ['.pdf', '.doc', '.docx', '.txt', '.ppt', '.pptx'];
        const ext = path.extname(file.originalname).toLowerCase();
        if (allowedTypes.includes(ext)) {
            cb(null, true);
        } else {
            cb(new Error('Invalid file type'));
        }
    }
});

export const createMaterial = async (req, res) => {
    try {
        const { title, subjectId, link } = req.body;
        const file = req.file;

        if (!file && !link) {
            return res.status(400).json({ message: "Either a file or a link must be provided" });
        }

        const material = new Material({
            title,
            subject: subjectId,
            link: link || null,
            ...(file && {
                fileName: file.originalname,
                filePath: file.path,
                fileType: path.extname(file.originalname)
            })
        });

        await material.save();
        
        await Subject.findByIdAndUpdate(
            subjectId,
            { $push: { materials: material._id } }
        );

        res.status(201).json(material);
    } catch (error) {
        res.status(500).json({ message: error.message });
    }
};

export const deleteMaterial = async (req, res) => {
    try {
        const { id } = req.params;
        const { subjectId } = req.body;

        console.log('Delete material request:', { id, subjectId }); // Debug log

        // Validate IDs
        if (!id || !mongoose.Types.ObjectId.isValid(id)) {
            return res.status(400).json({ message: "Invalid material ID" });
        }

        if (!subjectId || !mongoose.Types.ObjectId.isValid(subjectId)) {
            return res.status(400).json({ message: "Invalid subject ID" });
        }

        // Find the material
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
            } catch (fileError) {
                console.error('File deletion error:', fileError);
                // Continue with material deletion even if file deletion fails
            }
        }

        // Remove material reference from subject
        await Subject.findByIdAndUpdate(
            subjectId,
            { $pull: { materials: id } }
        );

        // Delete the material document
        await Material.findByIdAndDelete(id);

        res.json({ message: "Material deleted successfully" });
    } catch (error) {
        console.error("Delete material error:", error);
        res.status(500).json({ 
            message: "Error deleting material", 
            error: error.message 
        });
    }
};