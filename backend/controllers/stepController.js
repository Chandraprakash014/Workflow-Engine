const Step = require('../models/Step');

exports.getStepsByWorkflow = async (req, res) => {
    try {
        const steps = await Step.find({ workflow_id: req.params.workflowId }).sort('order');
        res.status(200).json(steps);
    } catch (error) {
        res.status(500).json({ message: error.message });
    }
};

exports.getStepById = async (req, res) => {
    try {
        const step = await Step.findById(req.params.id);
        if (!step) return res.status(404).json({ message: 'Step not found' });
        res.status(200).json(step);
    } catch (error) {
        res.status(500).json({ message: error.message });
    }
};

exports.createStep = async (req, res) => {
    try {
        const step = new Step({ ...req.body, workflow_id: req.params.workflowId });
        const savedStep = await step.save();
        res.status(201).json(savedStep);
    } catch (error) {
        res.status(400).json({ message: error.message });
    }
};

exports.updateStep = async (req, res) => {
    try {
        const updatedStep = await Step.findByIdAndUpdate(req.params.id, req.body, { new: true, runValidators: true });
        if (!updatedStep) return res.status(404).json({ message: 'Step not found' });
        res.status(200).json(updatedStep);
    } catch (error) {
        res.status(400).json({ message: error.message });
    }
};

exports.deleteStep = async (req, res) => {
    try {
        const deletedStep = await Step.findByIdAndDelete(req.params.id);
        if (!deletedStep) return res.status(404).json({ message: 'Step not found' });
        res.status(200).json({ message: 'Step deleted' });
    } catch (error) {
        res.status(500).json({ message: error.message });
    }
};
