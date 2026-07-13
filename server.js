// Victoria Braids & Weaves — single-solution entry point.
// Serves the API and the built frontend from one Express server.
//
// Build first:  npm run build   (compiles server to dist/server, frontend to dist/client)
// Then run:     npm start       (node server.js)

const { default: app, scheduleReminders, verifyDatabaseConnection } = require('./dist/server/app');

const PORT = process.env.PORT || 5000;

app.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
  verifyDatabaseConnection();
  scheduleReminders();
});
