
const express = require('express');
const multer = require('multer');
const { randomUUID } = require('node:crypto');

const {
  S3Client,
  PutObjectCommand,
  ListObjectsV2Command,
  HeadObjectCommand,
  GetObjectCommand,
} = require('@aws-sdk/client-s3');

const { getSignedUrl } = require('@aws-sdk/s3-request-presigner');
const { db } = require('../db');

// Authentication for Calendar attachments
const { requireAuth, getCurrentUser } = require('./auth');

const {
  ALLOWED_TYPES,
  validateAttachment,
  safeAttachmentName,
} = require('./attachmentValidation');

const router = express.Router();


function makeS3Client(endpoint) {
  const options = {
    region: process.env.AWS_REGION || process.env.AWS_DEFAULT_REGION || 'us-east-1',
  };

  if (endpoint) {
    options.endpoint = endpoint;
    options.forcePathStyle = true;
  }

  return new S3Client(options);
}

const s3 = makeS3Client(process.env.S3_ENDPOINT);

const downloadS3 = process.env.S3_PUBLIC_ENDPOINT
  ? makeS3Client(process.env.S3_PUBLIC_ENDPOINT)
  : s3;


const BUCKET = process.env.AWS_S3_BUCKET;
const MAX_FILE_SIZE = 10 * 1024 * 1024;

const upload = multer({
  storage: multer.memoryStorage(),
  limits: {
    fileSize: MAX_FILE_SIZE,
    files: 1
  },
});

// Require login before accessing assignment attachments
router.use(requireAuth);

// Use the logged-in user's ID for attachment permissions
router.use((req, res, next) => {
  req.attachmentUserId = getCurrentUser(req).user_id;
  next();
});

// Verify that the assignment belongs to this user.
router.use('/:assignmentId/files', async (req, res, next) => {
  const assignmentId = Number(req.params.assignmentId);

  if (!Number.isSafeInteger(assignmentId) || assignmentId <= 0) {
    return res.status(400).json({
      error: 'Invalid assignment ID.'
    });
  }

  try {
    const assignment = await db.oneOrNone(
      `SELECT a.assignment_id
       FROM assignments a
       JOIN courses c ON c.course_id = a.course_id
       WHERE a.assignment_id = $1 AND c.user_id = $2`,
      [assignmentId, req.attachmentUserId]
    );

    if (!assignment) {
      return res.status(404).json({
        error: 'Assignment not found.'
      });
    }

    if (!BUCKET) {
      return res.status(503).json({
        error: 'S3 bucket is not configured.'
      });
    }

    req.assignmentFilesPrefix =
      `calendar-assignments/${req.attachmentUserId}/${assignmentId}/`;

    next();

  } catch (error) {
    console.error('Attachment permission check failed:', error);

    res.status(500).json({
      error: 'Could not verify assignment access.'
    });
  }
});

// Upload one file to an existing assignment.
router.post('/:assignmentId/files', (req, res) => {
  upload.single('attachment')(req, res, async (uploadError) => {
    if (uploadError) {
      const message = uploadError.code === 'LIMIT_FILE_SIZE'
        ? 'File must be 10 MB or smaller.'
        : 'Unable to read the uploaded file.';

      return res.status(400).json({ error: message });
    }

    const validationError = validateAttachment(req.file);

    if (validationError) {
      return res.status(415).json({
        error: validationError
      });
    }

    const filename = safeAttachmentName(req.file.originalname);
    const extension = filename.slice(filename.lastIndexOf('.')).toLowerCase();

    const fileId = `${randomUUID()}-${filename}`;
    const key = req.assignmentFilesPrefix + fileId;

    try {
      await s3.send(new PutObjectCommand({
        Bucket: BUCKET,
        Key: key,
        Body: req.file.buffer,
        ContentType: ALLOWED_TYPES[extension],
        ContentDisposition: `attachment; filename="${filename}"`,
      }));

      return res.status(201).json({
        message: 'File uploaded successfully.',
        fileId,
        name: filename
      });

    } catch (error) {
      console.error('S3 upload failed:', error);

      return res.status(502).json({
        error: 'Upload to S3 failed.'
      });
    }
  });
});

// Get all attachments belonging to an assignment.
router.get('/:assignmentId/files', async (req, res) => {
  try {
    const files = [];
    let continuationToken;

    do {
      const page = await s3.send(new ListObjectsV2Command({
        Bucket: BUCKET,
        Prefix: req.assignmentFilesPrefix,
        ContinuationToken: continuationToken,
      }));

      for (const item of page.Contents || []) {
        const fileId = item.Key.slice(req.assignmentFilesPrefix.length);

        if (!/^[a-f0-9]{8}-[a-f0-9]{4}-4[a-f0-9]{3}-[89ab][a-f0-9]{3}-[a-f0-9]{12}-[A-Za-z0-9._-]+$/i.test(fileId)) {
          continue;
        }

        files.push({
          fileId,
          name: fileId.slice(37),
          size: item.Size,
          uploadedAt: item.LastModified,
        });
      }

      continuationToken = page.IsTruncated
        ? page.NextContinuationToken
        : undefined;

    } while (continuationToken);

    files.sort(
      (a, b) => new Date(b.uploadedAt) - new Date(a.uploadedAt)
    );

    res.json({ files });

  } catch (error) {
    console.error('S3 list failed:', error);

    res.status(502).json({
      error: 'Could not load attachments.'
    });
  }
});

// Download a file using a short-lived signed S3 URL.
router.get('/:assignmentId/files/:fileId/download', async (req, res) => {
  const { fileId } = req.params;

  if (!/^[a-f0-9]{8}-[a-f0-9]{4}-4[a-f0-9]{3}-[89ab][a-f0-9]{3}-[a-f0-9]{12}-[A-Za-z0-9._-]+$/i.test(fileId)) {
    return res.status(400).json({
      error: 'Invalid file ID.'
    });
  }

  const key = req.assignmentFilesPrefix + fileId;

  try {
    await s3.send(new HeadObjectCommand({
      Bucket: BUCKET,
      Key: key
    }));

    const url = await getSignedUrl(
      downloadS3,
      new GetObjectCommand({
        Bucket: BUCKET,
        Key: key
      }),
      { expiresIn: 60 }
    );

    res.redirect(302, url);

  } catch (error) {
    if (error.name === 'NotFound' ||
        error.$metadata?.httpStatusCode === 404) {
      return res.status(404).json({
        error: 'File not found.'
      });
    }

    console.error('S3 download failed:', error);

    res.status(502).json({
      error: 'Could not download attachment.'
    });
  }
});

module.exports = router;
