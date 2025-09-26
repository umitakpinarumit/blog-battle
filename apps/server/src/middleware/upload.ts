import multer from 'multer';
import path from 'path';
import fs from 'fs';

const uploadDir = process.env.UPLOAD_DIR || 'uploads';

const storage = multer.diskStorage({
  destination: (_req, _file, cb) => {
    const abs = path.resolve(uploadDir);
    if (!fs.existsSync(abs)) {
      fs.mkdirSync(abs, { recursive: true });
    }
    cb(null, abs);
  },
  filename: (_req, file, cb) => {
    const unique = `${Date.now()}-${Math.round(Math.random() * 1e9)}`;
    const ext = path.extname(file.originalname) || '';
    cb(null, `${unique}${ext}`);
  },
});

export const upload = multer({
  storage,
  limits: { fileSize: 5 * 1024 * 1024 }, // 5MB
});


