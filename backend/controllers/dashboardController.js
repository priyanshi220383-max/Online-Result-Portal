const { asyncHandler } = require('../middleware/errors');
const dashboardModel = require('../models/dashboardModel');

exports.summary = asyncHandler(async (req, res) => res.json(await dashboardModel.summary(req.user)));
