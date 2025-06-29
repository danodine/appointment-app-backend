// CitaGo/utils/email.js

const nodemailer = require('nodemailer');

const sendEmail = async (options) => {
  const transporter = nodemailer.createTransport({
    host: process.env.EMAIL_HOST,
    port: process.env.EMAIL_PORT,
    auth: {
      user: process.env.EMAIL_USERNAME,
      pass: process.env.EMAIL_PASSWORD,
    },
  });
  const mailOptions = {
    from: 'David Nodine <davidnodine@david.io>',
    to: options.email,
    subject: options.subject,
    text: options.message,
  };

  await transporter.sendMail(mailOptions);
};

const sendDeactivationEmail = async (user) => {
  await sendEmail({
    email: user.email,
    subject: 'Account Deactivated Due to Frequent Cancellations',
    message: `Dear ${user.name || 'User'},\n\nYour account has been temporarily deactivated because you've cancelled too many appointments. Please contact support or wait 30 days to automatically reset your cancellation history.\n\nBest,\nCitaGo Team`,
  });
};

// New: Appointment Reminder
const sendAppointmentReminder = async ({
  email,
  name,
  doctorName,
  dateTime,
  hoursBefore,
}) => {
  await sendEmail({
    email,
    subject: `Appointment Reminder: ${hoursBefore} hour${hoursBefore > 1 ? 's' : ''} left`,
    message: `Dear ${name},\n\nThis is a reminder that you have an appointment with Dr. ${doctorName} scheduled at ${dateTime}.\n\nThis reminder is sent ${hoursBefore} hour${hoursBefore > 1 ? 's' : ''} before your appointment.\n\nBest,\nCitaGo Team`,
  });
};

// New: Notify Doctor of Patient Cancellation
const sendPatientCancelledNotification = async ({
  doctorEmail,
  doctorName,
  patientName,
  dateTime,
}) => {
  await sendEmail({
    email: doctorEmail,
    subject: 'Appointment Cancelled by Patient',
    message: `Dear Dr. ${doctorName},\n\nYour patient ${patientName} has cancelled their appointment scheduled at ${dateTime}.\n\nBest,\nCitaGo Team`,
  });
};

const sendDoctorCancelledNotification = async ({
  patientEmail,
  patientName,
  doctorName,
  dateTime,
}) => {
  await sendEmail({
    email: patientEmail,
    subject: 'Appointment Cancelled by Doctor',
    message: `Dear ${patientName},\n\nWe regret to inform you that Dr. ${doctorName} has cancelled your appointment scheduled at ${dateTime}.\n\nBest,\nCitaGo Team`,
  });
};

module.exports = {
  sendEmail,
  sendPatientCancelledNotification,
  sendDoctorCancelledNotification,
  sendAppointmentReminder,
  sendDeactivationEmail,
};
