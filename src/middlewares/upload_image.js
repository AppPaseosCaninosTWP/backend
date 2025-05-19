const multer = require('multer');
const path = require('path');

// Configuración de almacenamiento
const storage = multer.diskStorage({
  destination: (req, file, cb) => cb(null, 'uploads/'),
  filename: (req, file, cb) => {
    const unique_name = Date.now() + '-' + Math.round(Math.random() * 1e9);
    cb(null, unique_name);
  },
});

// Filtro de archivo
const file_filter = (req, file, cb) => {
  const allowed_extensions = ['.jpg', '.jpeg', '.png'];
  const ext = path.extname(file.originalname).toLowerCase();
  if (!allowed_extensions.includes(ext)) {
    return cb(new Error('Solo se permiten archivos .jpg, .jpeg o .png'));
  }
  cb(null, true);
};

// Configuración final
const upload_image = multer({
  storage,
  fileFilter: file_filter,
  limits: { fileSize: 1 * 1024 * 1024 }, // 1 MB
});

module.exports = upload_image;
