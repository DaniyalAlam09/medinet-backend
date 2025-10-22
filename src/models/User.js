const mongoose = require('mongoose');
const bcrypt = require('bcrypt');

const userSchema = new mongoose.Schema({
    firstName: {
        type: String,
        required: [true, 'First name is required'],
        trim: true,
        maxlength: [50, 'First name cannot exceed 50 characters']
    },
    lastName: {
        type: String,
        required: [true, 'Last name is required'],
        trim: true,
        maxlength: [50, 'Last name cannot exceed 50 characters']
    },
    email: {
        type: String,
        required: [true, 'Email is required'],
        unique: true,
        lowercase: true,
        match: [/^\w+([.-]?\w+)*@\w+([.-]?\w+)*(\.\w{2,3})+$/, 'Please enter a valid email']
    },
    password: {
        type: String,
        required: [true, 'Password is required'],
        minlength: [6, 'Password must be at least 6 characters']
    },
    role: {
        type: String,
        enum: ['super_admin', 'hospital', 'doctor', 'patient'],
        required: [true, 'Role is required']
    },
    phone: {
        type: String,
        trim: true,
        match: [/^[\+]?[1-9][\d\s\-\(\)]{0,20}$/, 'Please enter a valid phone number']
    },
    dateOfBirth: {
        type: Date
    },
    gender: {
        type: String,
        enum: ['male', 'female', 'other']
    },
    address: {
        street: String,
        city: String,
        state: String,
        zipCode: String,
        country: String
    },
    profileImage: {
        type: String, // Cloudinary URL
        default: null
    },
    isActive: {
        type: Boolean,
        default: true
    },
    isEmailVerified: {
        type: Boolean,
        default: false
    },
    emailVerificationToken: String,
    passwordResetToken: String,
    passwordResetExpires: Date,
    lastLogin: Date,
    // Approval status
    approvalStatus: {
        type: String,
        enum: ['pending', 'approved', 'rejected'],
        default: 'pending'
    },
    approvedBy: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'User'
    },
    approvedAt: {
        type: Date
    },
    rejectionReason: {
        type: String,
        trim: true,
        maxlength: [500, 'Rejection reason cannot exceed 500 characters']
    },
    // Role-specific fields
    hospitalId: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'Hospital',
        required: function () {
            return this.role === 'doctor';
        }
    },
    licenseNumber: {
        type: String,
        required: function () {
            return this.role === 'doctor';
        }
    },
    specialization: {
        type: String,
        required: function () {
            return this.role === 'doctor';
        }
    },
    yearsOfExperience: {
        type: Number,
        min: 0,
        required: function () {
            return this.role === 'doctor';
        }
    },
    qualification: {
        type: String,
        required: function () {
            return this.role === 'doctor';
        }
    },
    // Patient fields
    emergencyContact: {
        type: String,
        required: function () {
            return this.role === 'patient';
        }
    },
    emergencyPhone: {
        type: String,
        required: function () {
            return this.role === 'patient';
        }
    },
    medicalHistory: {
        type: String,
        maxlength: [1000, 'Medical history cannot exceed 1000 characters']
    },
    // Super admin fields
    adminLevel: {
        type: String,
        enum: ['system', 'platform', 'support'],
        required: function () {
            return this.role === 'super_admin';
        }
    },
    organization: {
        type: String,
        required: function () {
            return this.role === 'super_admin';
        }
    },
    responsibilities: {
        type: String,
        required: function () {
            return this.role === 'super_admin';
        },
        maxlength: [1000, 'Responsibilities cannot exceed 1000 characters']
    }
}, {
    timestamps: true
});

// Indexes
// Note: `unique: true` on the email field already creates an index for email
userSchema.index({ role: 1 });
userSchema.index({ hospitalId: 1 });

// Hash password before saving
userSchema.pre('save', async function (next) {
    if (!this.isModified('password')) return next();

    try {
        const salt = await bcrypt.genSalt(12);
        this.password = await bcrypt.hash(this.password, salt);
        next();
    } catch (error) {
        next(error);
    }
});

// Compare password method
userSchema.methods.comparePassword = async function (candidatePassword) {
    return await bcrypt.compare(candidatePassword, this.password);
};

// Get full name
userSchema.virtual('fullName').get(function () {
    return `${this.firstName} ${this.lastName}`;
});

// Method to approve user
userSchema.methods.approve = function (approvedBy) {
    this.approvalStatus = 'approved';
    this.approvedBy = approvedBy;
    this.approvedAt = new Date();
    return this.save();
};

// Method to reject user
userSchema.methods.reject = function (rejectionReason, rejectedBy) {
    this.approvalStatus = 'rejected';
    this.rejectionReason = rejectionReason;
    this.approvedBy = rejectedBy;
    this.approvedAt = new Date();
    return this.save();
};

// Virtual for approval status
userSchema.virtual('isApproved').get(function () {
    return this.approvalStatus === 'approved';
});

// Virtual for pending status
userSchema.virtual('isPending').get(function () {
    return this.approvalStatus === 'pending';
});

// Remove password from JSON output
userSchema.methods.toJSON = function () {
    const userObject = this.toObject();
    delete userObject.password;
    delete userObject.emailVerificationToken;
    delete userObject.passwordResetToken;
    delete userObject.passwordResetExpires;
    return userObject;
};

module.exports = mongoose.model('User', userSchema);
