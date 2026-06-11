const router = require('express').Router();
const multer = require('multer');
const path = require('path');
const auth = require('../middleware/auth');
const Image = require('../models/Image');
const Folder = require('../models/Folder');

const UPLOAD_DIR = path.resolve(__dirname, '../uploads');
const ALLOWED_TYPES = /jpeg|jpg|png|gif|webp/;

const storage = multer.diskStorage({
  destination: (req, file, cb) => cb(null, UPLOAD_DIR),
  filename: (req, file, cb) => {
    const ext = path.extname(file.originalname).toLowerCase();
    cb(null, Date.now() + '-' + Math.random().toString(36).slice(2) + ext);
  },
});

const upload = multer({
  storage,
  limits: { fileSize: 8 * 1024 * 1024 },
  fileFilter: (req, file, cb) => {
    const ext = path.extname(file.originalname).toLowerCase().replace('.', '');
    if (ALLOWED_TYPES.test(ext) && ALLOWED_TYPES.test(file.mimetype.split('/')[1])) return cb(null, true);
    cb(new Error('Only image files (jpg, png, gif, webp) are allowed'));
  },
});

// Get images in a folder
router.get('/', auth, async (req, res) => {
  const { folder } = req.query;
  if (!folder) return res.status(400).json({ message: 'folder param required' });
  const images = await Image.find({ folder, owner: req.user.id }).sort({ createdAt: -1 });
  res.json(images);
});

// Upload image
router.post('/', auth, upload.single('image'), async (req, res) => {
  try {
    const { name, folder } = req.body;
    const f = await Folder.findOne({ _id: folder, owner: req.user.id });
    if (!f) return res.status(404).json({ message: 'Folder not found' });
    const image = await Image.create({
      name,
      filename: req.file.filename,
      size: req.file.size,
      folder,
      owner: req.user.id,
    });
    res.json(image);
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

// Delete image
router.delete('/:id', auth, async (req, res) => {
  const image = await Image.findOneAndDelete({ _id: req.params.id, owner: req.user.id });
  if (!image) return res.status(404).json({ message: 'Image not found' });
  res.json({ message: 'Deleted' });
});

module.exports = router;
