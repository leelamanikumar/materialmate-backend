import bcrypt from "bcryptjs";
import jwt from "jsonwebtoken";
import User from "../models/User.js";

export const registerUser = async (req, res) => {
    const { name, email, password } = req.body;
    const hashedPassword = await bcrypt.hash(password, 10);
    const user = await User.create({ name, email, password: hashedPassword });

    res.status(201).json({ message: "User registered successfully" });
};

export const loginUser = async (req, res) => {
    const { email, password } = req.body;
    const user = await User.findOne({ email });

    if (user && await bcrypt.compare(password, user.password)) {
        const token = jwt.sign({ id: user._id, role: user.role }, process.env.JWT_SECRET);
        res.json({ token });
    } else {
        res.status(401).json({ message: "Invalid credentials" });
    }
};

export const loginAdmin = async (req, res) => {
    const { email, password } = req.body;
    const admin = await User.findOne({ email, role: "admin" });

    if (admin && await bcrypt.compare(password, admin.password)) {
        const token = jwt.sign({ id: admin._id, role: "admin" }, process.env.JWT_SECRET);
        res.json({ token });
    } else {
        res.status(401).json({ message: "Invalid admin credentials" });
    }
};
