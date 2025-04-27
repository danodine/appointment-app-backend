const Appointment = require('./../models/appointmentModel');
const User = require('./../models/userModel');
const catchAsync = require('./../utils/catchAsync');
const AppError = require('./../utils/appError');
const { sendDeactivationEmail } = require('./../utils/email');
const generateTimeSlots = require('../utils/slotGenerator');

// sacar a otro lugar
const toHHMM = (dateTime) => {
  const date = new Date(dateTime);
  const h = date.getUTCHours();
  const m = date.getUTCMinutes();
  return `${String(h).padStart(2, '0')}:${String(m).padStart(2, '0')}`;
};

exports.createAppointment = catchAsync(async (req, res, next) => {
  const {
    doctor,
    doctorName,
    doctorSpeciality,
    dateTime,
    location,
    guest,
    duration,
  } = req.body;
  const user = req?.user?.id;

  if (!user && (!guest || !guest.name || !guest.phone)) {
    return next(
      new AppError('Either a registered user or guest info is required', 400),
    );
  }

  const doctorDoc = await User.findById(doctor);
  if (!doctorDoc || doctorDoc.role !== 'doctor') {
    return next(new AppError('Doctor not found or invalid role', 404));
  }

  const appointmentDateTime = new Date(dateTime);

  const weekday = appointmentDateTime.toLocaleDateString('en-US', {
    weekday: 'long',
  });

  const scheduleBlocks =
    doctorDoc?.profile?.availability?.filter((block) => {
      return block.day?.toLowerCase() === weekday.toLowerCase();
    }) || [];

  let selectedDuration = null;

  const formattedTimeSlot = toHHMM(appointmentDateTime);

  // Generate slots and check if the time is within doctor availability
  for (const block of scheduleBlocks) {
    const { timeSlots = [] } = block;
    for (const range of timeSlots) {
      if (range?.from && range?.to) {
        const slots = generateTimeSlots(range.from, range.to, duration);

        if (slots.includes(formattedTimeSlot)) {
          selectedDuration = duration;
        }
      }
    }
  }
  if (!selectedDuration) {
    return next(
      new AppError('Time slot not valid for doctor availability', 400),
    );
  }

  const existingAppointment = await Appointment.findOne({
    doctor,
    dateTime: appointmentDateTime,
    status: { $ne: 'cancelled' },
  });

  if (existingAppointment) {
    return next(new AppError('This time slot is not available', 400));
  }

  // Check for manual blocks still have to validate this
  const dateKey = appointmentDateTime.toISOString().split('T')[0];
  const manualBlocks = doctorDoc?.profile?.manualBlocks?.[dateKey] || [];

  if (manualBlocks.includes(formattedTimeSlot)) {
    return next(new AppError('This time slot is blocked by the doctor', 400));
  }

  // Create and save the appointment
  const appointment = await Appointment.create({
    user,
    doctor,
    dateTime: appointmentDateTime,
    duration: selectedDuration,
    doctorName,
    doctorSpeciality,
    location,
    guest: guest || undefined,
  });

  res.status(201).json({
    status: 'success',
    data: {
      appointment,
    },
  });
});

exports.getUpcomingAppointmentsByUser = catchAsync(async (req, res, next) => {
  const now = new Date();
  const appointments = await Appointment.find({
    user: req.params.userId,
    dateTime: { $gte: now },
  }).sort({ dateTime: 1 });

  res.status(200).json({
    status: 'success',
    data: { appointments },
  });
});

exports.getPastAppointmentsByUser = catchAsync(async (req, res, next) => {
  const now = new Date();
  const appointments = await Appointment.find({
    user: req.params.userId,
    dateTime: { $lt: now },
  }).sort({ dateTime: -1 });

  res.status(200).json({
    status: 'success',
    data: { appointments },
  });
});

exports.cancelAppointment = catchAsync(async (req, res, next) => {
  const { appointmentId } = req.params;
  const appointment = await Appointment.findById(appointmentId);

  if (!appointment) {
    return next(new AppError('No appointment found with that ID', 404));
  }

  const isOwner = appointment.user._id.toString() === req.user._id.toString();
  const isDoctor =
    appointment.doctor._id.toString() === req.user._id.toString();
  const isAdmin = req.user.role === 'admin';

  if (!isOwner && !isDoctor && !isAdmin) {
    return next(
      new AppError('You are not authorized to cancel this appointment', 403),
    );
  }

  appointment.status = 'cancelled';
  await appointment.save();

  // Check and update cancellation count only if user is a patient cancelling
  if (isOwner && req.user.role === 'user') {
    const user = await User.findById(req.user._id);

    const now = new Date();
    const lastDate = user.lastCancellationDate || new Date(0); // default to epoch
    const daysSinceLastCancel = (now - lastDate) / (1000 * 60 * 60 * 24); // in days

    // Reset count if last cancellation was over 30 days ago
    if (daysSinceLastCancel > 30) {
      user.cancellationCount = 0;
    }

    user.cancellationCount += 1;
    user.lastCancellationDate = now;

    if (user.cancellationCount >= 3) {
      user.active = false;
      await sendDeactivationEmail(user);
    }

    await user.save();
  }

  res.status(200).json({
    status: 'success',
    message: 'Appointment cancelled successfully',
    data: { appointment },
  });
});

exports.getAvailableDates = catchAsync(async (req, res, next) => {
  const { doctorId, location } = req.params;

  if (!doctorId || !location) {
    return next(new AppError('Doctor ID and location are required.', 400));
  }

  const doctorDoc = await User.findById(doctorId);
  if (!doctorDoc || doctorDoc.role !== 'doctor') {
    return next(new AppError('Doctor not found or invalid role', 404));
  }

  const today = new Date();
  today.setUTCHours(0, 0, 0, 0);

  const endDate = new Date(today);
  endDate.setDate(today.getDate() + 183);
  endDate.setUTCHours(23, 59, 59, 999);

  const allAppointments = await Appointment.find({
    doctor: doctorId,
    dateTime: { $gte: today, $lte: endDate },
    location,
    status: { $ne: 'cancelled' },
  });

  const appointmentsByDate = {};
  for (const appointment of allAppointments) {
    const dateKey = appointment.dateTime.toISOString().split('T')[0];
    if (!appointmentsByDate[dateKey]) {
      appointmentsByDate[dateKey] = [];
    }
    appointmentsByDate[dateKey].push(appointment);
  }

  const availabilityMap = new Map();
  for (const entry of doctorDoc.profile.availability) {
    availabilityMap.set(entry.day, entry);
  }

  const availableDates = [];

  for (let i = 0; i <= 183; i++) {
    const date = new Date(today);
    date.setDate(today.getDate() + i);
    const dateISO = date.toISOString().split('T')[0];
    const weekday = date.toLocaleDateString('en-US', { weekday: 'long' });

    const dayEntry = availabilityMap.get(weekday);
    if (!dayEntry) continue;

    const timeSlots = dayEntry.timeSlots.filter(
      (slot) => slot.location === location,
    );
    if (timeSlots.length === 0) continue;

    const bookedAppointments = appointmentsByDate[dateISO] || [];

    let totalMinutesAvailable = 0;
    for (const slot of timeSlots) {
      const fromParts = slot.from.split(':').map(Number);
      const toParts = slot.to.split(':').map(Number);

      const fromMinutes = fromParts[0] * 60 + fromParts[1];
      const toMinutes = toParts[0] * 60 + toParts[1];
      totalMinutesAvailable += toMinutes - fromMinutes;
    }

    const estimatedBookedMinutes = bookedAppointments.length * 30;

    if (estimatedBookedMinutes < totalMinutesAvailable) {
      availableDates.push(dateISO);
    }
  }

  res.status(200).json({
    status: 'success',
    data: availableDates,
  });
});

exports.getAvailableTimesForDate = catchAsync(async (req, res, next) => {
  const { doctorId, date, location } = req.params;
  const selectedDuration = parseInt(req.query.duration);
  const currentTime = req.query.currentTime;
  if (!doctorId || !date || !location || !selectedDuration) {
    return next(
      new AppError(
        'Doctor ID, date, location, and duration are required.',
        400,
      ),
    );
  }

  const doctorDoc = await User.findById(doctorId);
  if (!doctorDoc || doctorDoc.role !== 'doctor') {
    return next(new AppError('Doctor not found or invalid role', 404));
  }

  const weekday = new Date(date).toLocaleDateString('en-US', {
    weekday: 'long',
  });

  const dayEntry = doctorDoc.profile.availability.find(
    (d) => d.day === weekday,
  );
  if (!dayEntry) {
    return res
      .status(200)
      .json({ status: 'success', data: [], isFullyBooked: true });
  }

  const startOfDay = new Date(date);
  const endOfDay = new Date(date);
  endOfDay.setUTCHours(23, 59, 59, 999);

  const blockedAppointments = await Appointment.find({
    doctor: doctorId,
    dateTime: { $gte: startOfDay, $lte: endOfDay },
    status: { $ne: 'cancelled' },
    location,
  });

  const blockedRanges = blockedAppointments.map((app) => {
    const start = new Date(app.dateTime);
    const end = new Date(start.getTime() + app.duration * 60 * 1000);
    return [start, end];
  });

  const isSlotAvailable = (start) => {
    const end = new Date(start.getTime() + selectedDuration * 60000);
    return !blockedRanges.some(
      ([bStart, bEnd]) => start < bEnd && end > bStart,
    );
  };

  const { timeSlots } = dayEntry;
  const allAvailableSlots = [];

  for (const slot of timeSlots) {
    if (slot.location !== location) continue;

    const from = new Date(`${date}T${slot.from}:00Z`);

    const to = new Date(`${date}T${slot.to}:00Z`);

    let current = new Date(from);
    console.log(currentTime);
    const customTime = `${date}T${currentTime}:00Z`;

    const currentUserTime = new Date(customTime);

    while (current.getTime() + selectedDuration * 60000 <= to.getTime()) {
      if (
        startOfDay.toDateString() === currentUserTime.toDateString() &&
        current < currentUserTime
      ) {
        current = new Date(current.getTime() + selectedDuration * 60000);
        continue;
      }

      if (isSlotAvailable(current)) {
        allAvailableSlots.push(toHHMM(current));
      }

      current = new Date(current.getTime() + selectedDuration * 60000);
    }
  }

  res.status(200).json({
    status: 'success',
    data: allAvailableSlots,
    isFullyBooked: allAvailableSlots.length === 0,
  });
});

// Get all appointments (admin use)
exports.getAllAppointments = catchAsync(async (req, res, next) => {
  const appointments = await Appointment.find();
  res.status(200).json({
    status: 'success',
    results: appointments.length,
    data: { appointments },
  });
});

// Get appointments for a specific doctor
exports.getAppointmentsByDoctor = catchAsync(async (req, res, next) => {
  const now = new Date();
  const filter = {
    doctor: req.params.doctorId,
    status: { $nin: ['cancelled', 'blocked'] },
  };

  if (req.query.upcoming === 'true') {
    filter.dateTime = { $gte: now };
  }

  if (req.query.past === 'true') {
    filter.dateTime = { $lt: now };
  }

  if (req.query.location) {
    filter.location = req.query.location;
  }

  // Optionally skip blocks (if you use a flag)
  if (req.query.excludeBlocks === 'true') {
    filter.createdByDoctor = false;
  }

  const appointments = await Appointment.find(filter).sort({ dateTime: 1 });

  res.status(200).json({
    status: 'success',
    results: appointments.length,
    data: { appointments },
  });
});
// Get filtered appointments
exports.getFilteredAppointments = catchAsync(async (req, res, next) => {
  const queryObj = {};

  if (req.query.doctor) queryObj.doctor = req.query.doctor;
  if (req.query.user) queryObj.user = req.query.user;
  if (req.query.status) queryObj.status = req.query.status;

  if (req.query.from) {
    queryObj.dateTime = {
      ...queryObj.dateTime,
      $gte: new Date(req.query.from),
    };
  }

  if (req.query.to) {
    queryObj.dateTime = {
      ...queryObj.dateTime,
      $lte: new Date(req.query.to),
    };
  }

  const appointments = await Appointment.find(queryObj).sort({ dateTime: 1 });

  res.status(200).json({
    status: 'success',
    results: appointments.length,
    data: { appointments },
  });
});
