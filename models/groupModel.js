const mongoose = require("mongoose");

const GroupSchema = new mongoose.Schema(
	{
		admin_id: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true},
		name: { type: String, required: true },
		description: { type: String, default: ""},
		image: { type: String, required: true },
		limit: { type: Number, required: true, default: 50 }
	},
	{
		timestamps: true
	}
);

module.exports = mongoose.model("Group", GroupSchema);