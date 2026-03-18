const mongoose = require('mongoose');

const ruleSchema = new mongoose.Schema({
  step_id: { type: mongoose.Schema.Types.ObjectId, ref: 'Step', required: true },
  condition: { type: String, required: true },
  next_step_id: { type: mongoose.Schema.Types.ObjectId, ref: 'Step', required: false, default: null },
  priority: { type: Number, default: 0 },
  created_at: { type: Date, default: Date.now },
  updated_at: { type: Date, default: Date.now }
});

ruleSchema.pre('save', async function() {
  this.updated_at = Date.now();
});
ruleSchema.pre('findOneAndUpdate', async function() {
  this.set({ updated_at: Date.now() });
});

module.exports = mongoose.model('Rule', ruleSchema);
