const mongoose = require('mongoose');

const appointmentSchema = new mongoose.Schema(
  {
    user: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      // no longer required if guest is provided
    },
    doctor: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: true,
    },
    doctorName: {
      type: String,
      required: true,
    },
    doctorSpeciality: {
      type: String,
      required: true,
    },
    dateTime: {
      type: Date,
      required: true,
    },
    duration: {
      type: Number, // in minutes
      required: true,
    },
    location: {
      type: String,
      required: true,
    },
    guest: {
      name: String,
      phone: String,
    },
    createdByDoctor: {
      type: Boolean,
      default: false,
    },
    status: {
      type: String,
      enum: ['scheduled', 'cancelled', 'completed'],
      default: 'scheduled',
    },
    doctorAdrress: {},
    doctorPhone: { type: String },
  },
  { timestamps: true },
);

// No double-booking for same doctor and timeSlot
appointmentSchema.index({ doctor: 1, date: 1, timeSlot: 1 }, { unique: true });

//
// Middleware
//

// Validate: appointment date must not be in the past
appointmentSchema.pre('save', function (next) {
  const appointmentDateTime = new Date(this.date);
  const now = new Date();
  if (appointmentDateTime < now.setHours(0, 0, 0, 0)) {
    return next(new Error('Appointment date must not be in the past'));
  }
  next();
});

// 🔁 Auto-populate doctor and user
appointmentSchema.pre(/^find/, function (next) {
  this.populate('user', 'name email role').populate(
    'doctor',
    'name email specialty',
  );
  next();
});

const Appointment = mongoose.model('Appointment', appointmentSchema);
module.exports = Appointment;
