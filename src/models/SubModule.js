const mongoose = require("mongoose");

const submoduleSchema = mongoose.Schema({
  name: {
    type: String,
    required: true,
  },
  module: {
    type: String,
    ref: "Module",
    required: true,
  },
}, {
  timestamps: true,
});

const Submodule = mongoose.model("Submodule", submoduleSchema);
module.exports = Submodule;
