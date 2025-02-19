import mongoose from "mongoose";

const materialSchema = new mongoose.Schema({
    title: { 
        type: String, 
        required: true 
    },
    fileName: {
        type: String
    },
    filePath: {
        type: String
    },
    fileType: {
        type: String
    },
    link: {
        type: String
    },
    subject: { 
        type: mongoose.Schema.Types.ObjectId, 
        ref: 'Subject',
        required: true 
    },
    fileUrl: { type: String }, // Cloudinary URL
    cloudinaryId: { type: String }, // Cloudinary public_id
}, {
    timestamps: true
});

// Validate that either file or link is provided
materialSchema.pre('save', function(next) {
    if (!this.fileUrl && !this.link) {
        next(new Error('Either a file or a link must be provided'));
    }
    next();
});

// Export the model only if it hasn't been compiled yet
export default mongoose.models.Material || mongoose.model('Material', materialSchema);