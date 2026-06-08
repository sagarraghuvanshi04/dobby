const mongoose = require('mongoose');

const imageSchema = new mongoose.Schema({
  name:     { type: String, required: true },
  filename: { type: String, required: true },
  size:     { type: Number, required: true },
  folder:   { type: mongoose.Schema.Types.ObjectId, ref: 'Folder', required: true },
  owner:    { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
}, { timestamps: true });

module.exports = mongoose.model('Image', imageSchema);
