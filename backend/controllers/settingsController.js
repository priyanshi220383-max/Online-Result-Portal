const { HttpError, asyncHandler } = require('../middleware/errors');
const { v, parse } = require('../middleware/validate');
const settingsModel = require('../models/settingsModel');

exports.get = asyncHandler(async (req, res) => {
  const s = await settingsModel.getAll();
  res.json({
    school_name: s.school_name, school_address: s.school_address, principal_name: s.principal_name,
    pass_percentage: Number(s.pass_percentage), require_subject_pass: s.require_subject_pass === '1',
    grades: await settingsModel.grades(),
  });
});

exports.update = asyncHandler(async (req, res) => {
  const d = parse(req.body, {
    school_name: v.str('School name', { max: 100 }),
    school_address: v.str('Address', { max: 150, optional: true }),
    principal_name: v.str('Principal name', { max: 100, optional: true }),
    pass_percentage: v.num('Pass percentage', { min: 0, max: 100 }),
    require_subject_pass: v.bool('Subject pass rule'),
  });
  await settingsModel.save({
    school_name: d.school_name, school_address: d.school_address ?? '', principal_name: d.principal_name ?? '',
    pass_percentage: d.pass_percentage, require_subject_pass: d.require_subject_pass ? 1 : 0,
  });
  res.json({ message: 'Settings saved. Regenerate results for the new pass rule to take effect.' });
});

exports.updateGrades = asyncHandler(async (req, res) => {
  const list = Array.isArray(req.body?.grades) ? req.body.grades : null;
  if (!list || list.length < 2 || list.length > 15) throw new HttpError(400, 'Provide between 2 and 15 grade bands.');
  const bands = list.map((b) => parse(b, { grade: v.str('Grade', { max: 3 }), min_percentage: v.num('Minimum %', { min: 0, max: 100 }) }));
  if (new Set(bands.map((b) => b.grade)).size !== bands.length) throw new HttpError(400, 'Grade names must be unique.');
  if (new Set(bands.map((b) => b.min_percentage)).size !== bands.length) throw new HttpError(400, 'Each band needs a different minimum percentage.');
  if (!bands.some((b) => b.min_percentage === 0)) throw new HttpError(400, 'One band must start at 0% so every mark gets a grade.');
  await settingsModel.replaceGrades(bands);
  res.json({ message: 'Grade scale saved. Regenerate results to apply it.' });
});
