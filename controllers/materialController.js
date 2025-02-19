import dotenv from 'dotenv';
dotenv.config(); // Specify the path relative to this file

import Material from "../models/Material.js";
import Subject from "../models/Subject.js";
import { v2 as cloudinary } from 'cloudinary';
import { CloudinaryStorage } from 'multer-storage-cloudinary';
import multer from 'multer';
import path from 'path';
import mongoose from 'mongoose';
import fs from 'fs';

// Add this debug log
console.log('Current directory:', process.cwd());
console.log('Cloudinary Config:', {
    cloud_name: process.env.CLOUDINARY_CLOUD_NAME,
    api_key: process.env.CLOUDINARY_API_KEY,
    api_secret: process.env.CLOUDINARY_API_SECRET?.substring(0, 4) + '...'
});

// Configure Cloudinary
cloudinary.config({
    cloud_name: process.env.CLOUDINARY_CLOUD_NAME,
    api_key: process.env.CLOUDINARY_API_KEY,
    api_secret: process.env.CLOUDINARY_API_SECRET
});

// Configure storage
const storage = new CloudinaryStorage({
    cloudinary: cloudinary,
    params: async (req, file) => {
        const extension = path.extname(file.originalname).toLowerCase().substring(1);
        const filename = path.parse(file.originalname).name;
        
        return {
            folder: 'materials',
            resource_type: 'raw',
            public_id: filename, // Simplified public_id
            format: extension,
            type: 'upload'
        };
    },
});

// Configure upload middleware
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
        console.log('Starting material creation...');
        console.log('Request body:', req.body);
        console.log('Request file:', req.file);
        
        const { title, subjectId, link } = req.body;
        const file = req.file;

        if (!file && !link) {
            console.log('Validation failed: No file or link provided');
            return res.status(400).json({ message: "Either a file or a link must be provided" });
        }

        // Log the uploaded file information
        if (file) {
            console.log('File details:', {
                originalname: file.originalname,
                filename: file.filename,
                path: file.path,
                mimetype: file.mimetype,
                size: file.size
            });
        }

        let fileUrl;
        if (file) {
            try {
                fileUrl = cloudinary.url(file.filename, {
                    resource_type: 'raw',
                    flags: 'attachment'
                });
                console.log('Generated Cloudinary URL:', fileUrl);
            } catch (urlError) {
                console.error('Error generating Cloudinary URL:', urlError);
                throw new Error('Failed to generate file URL');
            }
        }

        console.log('Creating material document with:', {
            title,
            subjectId,
            fileUrl,
            fileName: file?.originalname,
            cloudinaryId: file?.filename
        });

        const material = new Material({
            title,
            subject: subjectId,
            link: link || null,
            ...(file && {
                fileName: file.originalname,
                fileUrl: fileUrl,
                fileType: path.extname(file.originalname),
                cloudinaryId: file.filename
            })
        });

        console.log('Saving material to database...');
        await material.save();
        console.log('Material saved successfully:', material);
        
        console.log('Updating subject with new material...');
        await Subject.findByIdAndUpdate(
            subjectId,
            { $push: { materials: material._id } }
        );
        console.log('Subject updated successfully');

        res.status(201).json(material);
    } catch (error) {
        console.error('Detailed error in createMaterial:', {
            message: error.message,
            stack: error.stack,
            name: error.name
        });
        res.status(500).json({ 
            message: "Failed to add material", 
            error: error.message,
            details: error.stack
        });
    }
};

export const getMaterial = async (req, res) => {
    try {
        const material = await Material.findById(req.params.id);
        if (!material) {
            return res.status(404).json({ message: "Material not found" });
        }

        if (material.fileUrl) {
            // Generate a direct download URL from Cloudinary
            const downloadUrl = cloudinary.url(material.cloudinaryId, {
                resource_type: 'raw',
                flags: 'attachment'
            });
            return res.json({ downloadUrl });
        } else if (material.link) {
            return res.json({ downloadUrl: material.link });
        }

        res.status(404).json({ message: "No file or link available" });
    } catch (error) {
        res.status(500).json({ message: error.message });
    }
};

export const deleteMaterial = async (req, res) => {
    try {
        const { id } = req.params;
        const { subjectId } = req.body;

        if (!mongoose.Types.ObjectId.isValid(id)) {
            return res.status(400).json({ message: "Invalid material ID" });
        }

        const material = await Material.findById(id);
        if (!material) {
            return res.status(404).json({ message: "Material not found" });
        }

        // Delete file from Cloudinary if it exists
        if (material.cloudinaryId) {
            try {
                await cloudinary.uploader.destroy(material.cloudinaryId, { resource_type: 'raw' });
            } catch (cloudinaryError) {
                console.error('Cloudinary deletion error:', cloudinaryError);
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

// Add this new endpoint to get a fresh signed URL
export const getMaterialUrl = async (req, res) => {
    try {
        const material = await Material.findById(req.params.id);
        if (!material || !material.cloudinaryId) {
            return res.status(404).json({ message: "Material not found" });
        }

        // Generate the correct Cloudinary URL
        const downloadUrl = cloudinary.url(material.cloudinaryId, {
            resource_type: 'raw',
            flags: 'attachment'
        });

        console.log('Generated download URL:', downloadUrl); // Debug log
        res.json({ url: downloadUrl });
    } catch (error) {
        console.error('Error generating URL:', error);
        res.status(500).json({ message: error.message });
    }
};