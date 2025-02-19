import express from "express";
import connectDB from "./config/db.js";
import authRoutes from "./routes/authRoutes.js";
import subjectRoutes from "./routes/subjectRoutes.js";
import materialRoutes from "./routes/materialRoutes.js";
import adminRoutes from "./routes/adminRoutes.js";
import dotenv from "dotenv";
import cors from "cors";

// Configure environment variables
dotenv.config();

// Connect to MongoDB
connectDB();

const app = express();

// Middleware
app.use(cors({
    origin: 'http://localhost:5173', // Your React frontend URL
    credentials: true
}));

app.use(express.json());

// Serve uploaded files
app.use('/uploads', express.static('uploads'));
// Routes
app.use("/api/auth", authRoutes);
app.use("/api/subjects", subjectRoutes);
app.use("/api/materials", materialRoutes);
app.use("/api/admin", adminRoutes);

// Basic route for testing
app.get('/', (req, res) => {
    res.send("API is running");
});

// Error handling middleware
app.use((err, req, res, next) => {
    console.error(err.stack);
    res.status(500).send('Something broke!');
});

// Start server
const PORT = process.env.PORT || 5000;
app.listen(PORT, () => console.log(`Server running on port ${PORT}`));