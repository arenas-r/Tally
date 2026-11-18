
const path = require('path');

const ALLOWED_TYPES = {
  '.pdf': 'application/pdf',
  '.doc': 'application/msword',
  '.docx': 'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
  '.xls': 'application/vnd.ms-excel',
  '.xlsx': 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
  '.ppt': 'application/vnd.ms-powerpoint',
  '.pptx': 'application/vnd.openxmlformats-officedocument.presentationml.presentation',
  '.txt': 'text/plain',
  '.rtf': 'application/rtf',
  '.png': 'image/png',
  '.jpg': 'image/jpeg',
  '.jpeg': 'image/jpeg',
};

function validateAttachment(file) {
  if (!file || !Buffer.isBuffer(file.buffer) || !file.buffer.length) {
    return 'Please choose a nonempty file.';
  }

  const ext = path.extname(file.originalname || '').toLowerCase();
  if (!Object.hasOwn(ALLOWED_TYPES, ext)) {
    return 'Unsupported file type.';
  }

  const bytes = file.buffer;
  const header = bytes.subarray(0, 8).toString('hex');
  const officeZip = ['.docx', '.xlsx', '.pptx'].includes(ext);
  const olderOffice = ['.doc', '.xls', '.ppt'].includes(ext);

  if (officeZip &&
      !(header.startsWith('504b0304') &&
        bytes.includes(Buffer.from('[Content_Types].xml')))) {
    return 'The Office document is not a valid DOCX, XLSX, or PPTX file.';
  }

  if (olderOffice && !header.startsWith('d0cf11e0a1b11ae1')) {
    return 'Invalid legacy Office document.';
  }

  if (ext === '.pdf' && !bytes.subarray(0, 5).equals(Buffer.from('%PDF-'))) {
    return 'Invalid PDF file.';
  }

  if (ext === '.png' && !header.startsWith('89504e470d0a1a0a')) {
    return 'Invalid PNG file.';
  }

  if (['.jpg', '.jpeg'].includes(ext) && !header.startsWith('ffd8ff')) {
    return 'Invalid JPEG file.';
  }

  if (ext === '.rtf' && bytes.subarray(0, 5).toString() !== '{\\rtf') {
    return 'Invalid RTF file.';
  }

  if (ext === '.txt') {
    try {
      new TextDecoder('utf-8', { fatal: true }).decode(bytes);
      if (bytes.includes(0)) return 'Invalid text file.';
    } catch {
      return 'Text file must be UTF-8 encoded.';
    }
  }

  return null;
}

function safeAttachmentName(originalName) {
  const normalized = String(originalName).replace(/\\/g, '/');
  const ext = path.extname(normalized).toLowerCase();

  const stem = path.basename(normalized, path.extname(normalized))
    .replace(/[^A-Za-z0-9._-]/g, '_')
    .slice(0, 80) || 'attachment';

  return `${stem}${ext}`;
}

module.exports = {
  ALLOWED_TYPES,
  validateAttachment,
  safeAttachmentName
};
