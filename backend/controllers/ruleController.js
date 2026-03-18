const Rule = require('../models/Rule');

exports.getRulesByStep = async (req, res) => {
    try {
        const rules = await Rule.find({ step_id: req.params.stepId }).sort('priority');
        res.status(200).json(rules);
    } catch (error) {
        res.status(500).json({ message: error.message });
    }
};

exports.createRule = async (req, res) => {
    try {
        const rule = new Rule({ ...req.body, step_id: req.params.stepId });
        const savedRule = await rule.save();
        res.status(201).json(savedRule);
    } catch (error) {
        res.status(400).json({ message: error.message });
    }
};

exports.updateRule = async (req, res) => {
    try {
        const updatedRule = await Rule.findByIdAndUpdate(req.params.id, req.body, { new: true, runValidators: true });
        if (!updatedRule) return res.status(404).json({ message: 'Rule not found' });
        res.status(200).json(updatedRule);
    } catch (error) {
        res.status(400).json({ message: error.message });
    }
};

exports.deleteRule = async (req, res) => {
    try {
        const deletedRule = await Rule.findByIdAndDelete(req.params.id);
        if (!deletedRule) return res.status(404).json({ message: 'Rule not found' });
        res.status(200).json({ message: 'Rule deleted' });
    } catch (error) {
        res.status(500).json({ message: error.message });
    }
};
