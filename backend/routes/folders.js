const router = require('express').Router();
const auth = require('../middleware/auth');
const Folder = require('../models/Folder');
const Image = require('../models/Image');

// Get all descendant folder ids (recursive)
async function getDescendantIds(folderId) {
  const children = await Folder.find({ parent: folderId });
  let ids = children.map(c => c._id);
  for (const child of children) {
    ids = ids.concat(await getDescendantIds(child._id));
  }
  return ids;
}

// Calculate folder size (images in folder + all nested)
async function calcSize(folderId) {
  const allIds = [folderId, ...(await getDescendantIds(folderId))];
  const result = await Image.aggregate([
    { $match: { folder: { $in: allIds } } },
    { $group: { _id: null, total: { $sum: '$size' } } }
  ]);
  return result[0]?.total || 0;
}

// Get folders (root or by parent)
router.get('/', auth, async (req, res) => {
  const { parent } = req.query;
  const query = { owner: req.user.id, parent: parent || null };
  const folders = await Folder.find(query).sort({ createdAt: -1 });
  const foldersWithSize = await Promise.all(
    folders.map(async f => ({ ...f.toObject(), size: await calcSize(f._id) }))
  );
  res.json(foldersWithSize);
});

// Get single folder
router.get('/:id', auth, async (req, res) => {
  const folder = await Folder.findOne({ _id: req.params.id, owner: req.user.id });
  if (!folder) return res.status(404).json({ message: 'Folder not found' });
  res.json({ ...folder.toObject(), size: await calcSize(folder._id) });
});

// Get breadcrumb path
router.get('/:id/path', auth, async (req, res) => {
  const path = [];
  let current = await Folder.findOne({ _id: req.params.id, owner: req.user.id });
  while (current) {
    path.unshift({ _id: current._id, name: current.name });
    current = current.parent ? await Folder.findById(current.parent) : null;
  }
  res.json(path);
});

// Create folder
router.post('/', auth, async (req, res) => {
  try {
    const { name, parent } = req.body;
    const folder = await Folder.create({ name, owner: req.user.id, parent: parent || null });
    res.json(folder);
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

// Rename folder
router.put('/:id', auth, async (req, res) => {
  const folder = await Folder.findOneAndUpdate(
    { _id: req.params.id, owner: req.user.id },
    { name: req.body.name },
    { new: true }
  );
  if (!folder) return res.status(404).json({ message: 'Folder not found' });
  res.json(folder);
});

// Delete folder (and all children + images)
router.delete('/:id', auth, async (req, res) => {
  const folder = await Folder.findOne({ _id: req.params.id, owner: req.user.id });
  if (!folder) return res.status(404).json({ message: 'Folder not found' });
  const allIds = [folder._id, ...(await getDescendantIds(folder._id))];
  await Image.deleteMany({ folder: { $in: allIds } });
  await Folder.deleteMany({ _id: { $in: allIds } });
  res.json({ message: 'Deleted' });
});

module.exports = router;
module.exports.calcSize = calcSize;
