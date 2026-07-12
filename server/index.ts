import app, { scheduleReminders } from './app';

const PORT = process.env.PORT || 5000;

// Start Server
app.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
  scheduleReminders();
});
