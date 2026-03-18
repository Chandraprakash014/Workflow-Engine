const mongoose = require('mongoose');

const workflowSchema = new mongoose.Schema({
  name: { type: String, required: true },
  description: { type: String, default: '' },
  version: { type: Number, default: 1 },
  is_active: { type: Boolean, default: true },
  input_schema: { type: mongoose.Schema.Types.Mixed, default: {} },
  start_step_id: { type: mongoose.Schema.Types.ObjectId, ref: 'Step', default: null },
  created_at: { type: Date, default: Date.now },
  updated_at: { type: Date, default: Date.now }
});

workflowSchema.pre('save', async function() {
  this.updated_at = Date.now();
});
workflowSchema.pre('findOneAndUpdate', async function() {
  this.set({ updated_at: Date.now() });
});

module.exports = mongoose.model('Workflow', workflowSchema);
