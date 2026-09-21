import mongoose from 'mongoose';

const auditLogSchema = new mongoose.Schema({
  fileName: {
    type: String,
    default: 'untitled'
  },
  code: {
    type: String,
    required: true
  },
  issues: [
    {
      type: { type: String },
      severity: { type: String },
      line: { type: Number },
      explanation: { type: String },
      originalCode: { type: String },
      fixedCode: { type: String },
      applied: { type: Boolean, default: false }
    }
  ],
  stats: {
    total: { type: Number, default: 0 },
    engine: { type: String, default: 'Gemini AI' }
  },
  createdAt: {
    type: Date,
    default: Date.now
  }
});

export const AuditLog = mongoose.model('AuditLog', auditLogSchema);
