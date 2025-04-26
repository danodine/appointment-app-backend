const crypto = require('crypto');
const bcrypt = require('bcryptjs');
const mongoose = require('mongoose');
const validator = require('validator');

const addressSchema = new mongoose.Schema(
  {
    street: String,
    floor: Number,
    accessibility: [String],
    parking: Boolean,
    parkingCost: Boolean,
    city: String,
    country: String,
  },
  { _id: false },
);
const clinicProfileSchema = new mongoose.Schema(
  {
    userActive: {
      type: Boolean,
      default: true,
    },
    verified: { type: Boolean, default: false },
    doctorsManaged: [{ type: mongoose.Schema.Types.ObjectId, ref: 'User' }],
  },
  { _id: false },
);

const patientProfileSchema = new mongoose.Schema(
  {
    age: Number,
    gender: { type: String, enum: ['Male', 'Female', 'Other'] },
    photo: {
      type: String,
    },
    weightKg: Number,
    heightCm: Number,
    bloodType: String,
    medicalConditions: {
      allergies: [String],
    },
    cancellationCount: {
      type: Number,
      default: 0,
    },
    userActive: {
      type: Boolean,
      default: true,
    },
    lastCancellationDate: {
      type: Date,
    },
  },
  { _id: false },
);

const doctorProfileSchema = new mongoose.Schema(
  {
    consultationFee: Number,
    biography: String,
    photo: {
      type: String,
    },
    availability: [
      {
        day: {
          type: String,
          enum: [
            'Monday',
            'Tuesday',
            'Wednesday',
            'Thursday',
            'Friday',
            'Saturday',
            'Sunday',
          ],
        },
        timeSlots: [{ from: String, to: String, location: String, }],
        // duration: Number,
      },
    ],
    manualBlocks: {
      type: Map,
      of: [String], // Example: { "2025-04-25": ["09:00", "10:00"] }
      default: {},
    },
    consultationDuration: Number,
    insurances: [String],
    treatments: [String],
    languages: [String],
    paymentMethods: [String],
    profession: String,
    specialty: String,
    subSpecialty: String,
    subSpecialtyId: String,
    verified: { type: Boolean, default: false },
    clinicCode: String,
  },
  { _id: false },
);

// Main User Schema

const userSchema = new mongoose.Schema(
  {
    nationalId: { type: String, required: true },
    name: { type: String, required: true },

    email: {
      type: String,
      required: true,
      unique: true,
      lowercase: true,
      validate: [validator.isEmail, 'Please provide a valid email'],
    },

    phone: String,

    password: {
      type: String,
      required: true,
      minlength: 8,
      select: false,
    },

    passwordConfirm: {
      type: String,
      required: [true, 'confirm your password'],
      validate: {
        // only works on CREATE and SAVE
        validator: function (el) {
          return el === this.password;
        },
        message: 'Passwords are not the same',
      },
    },

    birthDate: {
      type: Date,
      required: false, // set to true if it's mandatory
    },

    role: {
      type: String,
      enum: ['patient', 'doctor', 'admin', 'clinic'],
      default: 'patient',
    },
    address: addressSchema,

    profile: {
      type: mongoose.Schema.Types.Mixed, // Either patientProfileSchema or doctorProfileSchema
    },

    active: { type: Boolean, default: true },

    passwordChangedAt: Date,
    passwordResetToken: String,
    passwordResetExpires: Date,
  },
  { timestamps: true },
);

userSchema.pre('save', async function (next) {
  if (!this.isModified('password')) return next();

  this.password = await bcrypt.hash(this.password, 12);

  this.passwordConfirm = undefined;
  next();
});

userSchema.pre('save', function (next) {
  if (!this.isModified('password') || this.isNew) return next();
  this.passwordChangedAt = Date.now() - 1000;
  next();
});

userSchema.pre('/^find/', function (next) {
  this.find({ active: { $ne: false } });
  next();
});

userSchema.methods.correctPassword = async function (
  candidatePassword,
  userPassword,
) {
  return await bcrypt.compare(candidatePassword, userPassword);
};

userSchema.methods.changedPasswordAfter = function (JWTTimestamp) {
  if (this.passwordChangedAt) {
    const changedTimestamp = parseInt(
      this.passwordChangedAt.getTime() / 1000,
      10,
    );
    return JWTTimestamp < changedTimestamp;
  }
  return false;
};

userSchema.methods.createPasswordResetToken = function () {
  const resetToken = crypto.randomBytes(32).toString('hex');

  this.passwordResetToken = crypto
    .createHash('sha256')
    .update(resetToken)
    .digest('hex');

  this.passwordResetExpires = Date.now() + 10 * 60 * 1000;

  return resetToken;
};

userSchema.pre('save', function (next) {
  if (this.role === 'doctor') {
    const TempDoctor = mongoose.model('TempDoctor', doctorProfileSchema);
    const temp = new TempDoctor(this.profile);
    const error = temp.validateSync();
    if (error) return next(error);
  }

  if (this.role === 'patient') {
    const TempPatient = mongoose.model('TempPatient', patientProfileSchema);
    const temp = new TempPatient(this.profile);
    const error = temp.validateSync();
    if (error) return next(error);
  }

  if (this.role === 'clinic') {
    const TempClinic = mongoose.model('TempClinic', clinicProfileSchema);
    const temp = new TempClinic(this.profile);
    const error = temp.validateSync();
    if (error) return next(error);
  }

  next();
});

const User = mongoose.model('User', userSchema);

module.exports = User;
