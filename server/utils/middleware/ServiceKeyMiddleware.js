async function serviceKeyRequest(request, response, next) {
  const serviceKey = process.env.SCALES_BOARDS_SERVICE_KEY;
  if (!serviceKey) return response.status(401).json({ success: false, error: 'Service key not configured.' });

  const key = request.header('X-Service-Key');
  if (key && key === serviceKey) {
    // Inject a service user so userFromSession() finds a valid teacher
   response.locals.user = { id: 999999, role: 'teacher', name: 'Scales Boards Service' };
    return next();
  }
  return response.status(401).json({ success: false, error: 'Invalid service key.' });
}
module.exports = { serviceKeyRequest };
