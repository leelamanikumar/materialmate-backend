import Subject from "../models/Subject.js";
export const createSubject = async (req, res) => {
    try {
        const { name } = req.body;
        const subject = new Subject({ name, createdBy: req.user.id });
        await subject.save();
        res.status(201).json(subject);
    } catch (error) {
        res.status(500).json({ message: "Error creating subject" });
    }
};
export const deleteSubject = async (req, res) => {
    try {
        await Subject.findByIdAndDelete(req.params.id);
        res.json({ message: "Subject deleted" });
    } catch (error) {
        res.status(500).json({ message: "Error deleting subject" });
    }
};