const authRoutes = require('./authRoutes');
const resumeRoutes = require('./resumeRoutes');

function registerRoutes(app) {
  app.get('/health', (_req, res) => {
    res.json({ status: 'ok' });
  });

  app.use('/api', authRoutes);
  app.use('/api/resume', resumeRoutes);
}

module.exports = {
  registerRoutes,
};
