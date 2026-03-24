// models/Brand.js
const mongoose = require('mongoose')
const { Schema } = mongoose

const brandSchema = new Schema({
  name: { type: String, required: true, trim: true },
  category: { type: Schema.Types.ObjectId, ref: 'Category', required: true },
  isActive: { type: Boolean, default: true }
}, { timestamps: true })

// ✅ Unique per category
brandSchema.index({ name: 1, category: 1 }, { unique: true })

module.exports = mongoose.models.Brand || mongoose.model('Brand', brandSchema)
