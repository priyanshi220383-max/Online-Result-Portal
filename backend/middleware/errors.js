// Central error handling: turns database / validation errors into clean JSON.
class HttpError extends Error {
  constructor(status, message) {
    super(message);
    this.status = status;
  }
}

const asyncHandler = (fn) => (req, res, next) => Promise.resolve(fn(req, res, next)).catch(next);

function notFound(req, res) {
  res.status(404).json({ message: 'Route not found.' });
}

// eslint-disable-next-line no-unused-vars
function errorHandler(err, req, res, next) {
  if (err instanceof HttpError) return res.status(err.status).json({ message: err.message });

  // SIGNAL SQLSTATE '45000' raised by our triggers / procedures: a business-rule message.
  if (err.sqlState === '45000') return res.status(400).json({ message: err.sqlMessage });

  switch (err.code) {
    case 'ER_DUP_ENTRY':
      return res.status(409).json({ message: 'A record with the same unique value already exists.' });
    case 'ER_NO_REFERENCED_ROW_2':
      return res.status(400).json({ message: 'A referenced record (class, subject, student ...) does not exist.' });
    case 'ER_ROW_IS_REFERENCED_2':
      return res.status(409).json({ message: 'This record is in use by other records and cannot be deleted.' });
    case 'ER_CHECK_CONSTRAINT_VIOLATED':
      return res.status(400).json({ message: 'A value violates a database rule (check constraint).' });
    case 'ECONNREFUSED':
    case 'PROTOCOL_CONNECTION_LOST':
      return res.status(503).json({ message: 'Database is unavailable.' });
    default:
  }
  if (err.type === 'entity.parse.failed') return res.status(400).json({ message: 'Invalid JSON body.' });

  console.error(err); // details stay in the server log, never sent to the client
  return res.status(500).json({ message: 'Something went wrong on the server.' });
}

module.exports = { HttpError, asyncHandler, notFound, errorHandler };
