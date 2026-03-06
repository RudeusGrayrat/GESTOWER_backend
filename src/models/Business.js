const mongoose = require("mongoose");

const businessSchema = new mongoose.Schema({
  ruc: {
    type: Number,
    required: true,
    unique: true,
  },
  razonSocial: {
    type: String,
    required: true,
  },
  domicilioFiscal: {
    type: String,
    required: true,
  },
  logo: {
    type: String,
    required: true,
  },
  representative: {
    name: {
      type: String,
      required: true,
    },
    documentType: {
      type: String,
      required: true,
    },
    documentNumber: {
      type: String,
      required: true,
    },
    signature: {
      type: String,
      required: true,
    },
  },
}, {
  timestamps: true,
});

const Business = mongoose.model("Business", businessSchema);

module.exports = Business;
