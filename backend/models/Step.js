const mongoose = require('mongoose');

const stepSchema = new mongoose.Schema({
  workflow_id: { type: mongoose.Schema.Types.ObjectId, ref: 'Workflow', required: true },
  name: { type: String, required: true },
  step_type: { type: String, enum: ['task', 'approval', 'notification'], required: true },
  order: { type: Number, required: true },
  metadata: { type: mongoose.Schema.Types.Mixed, default: {} },
  created_at: { type: Date, default: Date.now },
  updated_at: { type: Date, default: Date.now }
});

stepSchema.pre('save', async function() {
  this.updated_at = Date.now();
});
stepSchema.pre('findOneAndUpdate', async function() {
  this.set({ updated_at: Date.now() });
});

module.exports = mongoose.model('Step', stepSchema);
