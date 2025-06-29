// CitaGo/utils/notificationScheduler.js

const cron = require('node-cron');
const Appointment = require('../models/appointmentModel');
const User = require('../models/userModel');
const { sendAppointmentReminder } = require('./email');

// Helper to format date/time for emails
function formatDateTime(date) {
  return new Date(date).toLocaleString('en-US', { timeZone: 'UTC', hour12: false });
}

// This function checks for appointments and sends reminders
async function sendReminders() {
  const now = new Date();
  const oneHourLater = new Date(now.getTime() + 60 * 60 * 1000);
  const twentyFourHoursLater = new Date(now.getTime() + 24 * 60 * 60 * 1000);

  // Find appointments 1h and 24h from now (±2min window to avoid missing due to timing)
  const windows = [
    { time: oneHourLater, hoursBefore: 1 },
    { time: twentyFourHoursLater, hoursBefore: 24 }
  ];

  for (const { time, hoursBefore } of windows) {
    const windowStart = new Date(time.getTime() - 2 * 60 * 1000);
    const windowEnd = new Date(time.getTime() + 2 * 60 * 1000);

    const appointments = await Appointment.find({
      dateTime: { $gte: windowStart, $lte: windowEnd },
      status: 'scheduled'
    }).populate('user doctor');

    for (const appointment of appointments) {
      // Send to patient (if registered)
      if (appointment.user && appointment.user.email) {
        await sendAppointmentReminder({
          email: appointment.user.email,
          name: appointment.user.name,
          doctorName: appointment.doctor.name,
          dateTime: formatDateTime(appointment.dateTime),
          hoursBefore
        });
      }
      // Optionally, send to guest if you store guest email/phone
      // Send to doctor (optional, uncomment if you want doctor reminders)
      // if (appointment.doctor && appointment.doctor.email) {
      //   await sendAppointmentReminder({
      //     email: appointment.doctor.email,
      //     name: appointment.doctor.name,
      //     doctorName: appointment.doctor.name,
      //     dateTime: formatDateTime(appointment.dateTime),
      //     hoursBefore
      //   });
      // }
    }
  }
}

// Schedule the job to run every 2 minutes
cron.schedule('*/2 * * * *', () => {
  sendReminders().catch(err => console.error('Reminder error:', err));
});

module.exports = { sendReminders };
