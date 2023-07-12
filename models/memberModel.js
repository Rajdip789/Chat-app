const mongoose = require("mongoose");

const MemberSchema = new mongoose.Schema(
	{
		group_id: { type: mongoose.Schema.Types.ObjectId, ref: 'Group' },
		member_id: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
	},
	{
		timestamps: true
	}
);

module.exports = mongoose.model("Member", MemberSchema);