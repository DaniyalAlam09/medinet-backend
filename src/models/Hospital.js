const mongoose = require('mongoose');

const hospitalSchema = new mongoose.Schema({
    name: {
        type: String,
        required: [true, 'Hospital name is required'],
        trim: true,
        maxlength: [100, 'Hospital name cannot exceed 100 characters']
    },
    email: {
        type: String,
        required: [true, 'Email is required'],
        unique: true,
        lowercase: true,
        match: [/^\w+([.-]?\w+)*@\w+([.-]?\w+)*(\.\w{2,3})+$/, 'Please enter a valid email']
    },
    phone: {
        type: String,
        required: [true, 'Phone number is required'],
        trim: true,
        match: [/^[\+]?[1-9][\d]{0,15}$/, 'Please enter a valid phone number']
    },
    address: {
        street: {
            type: String,
            required: [true, 'Street address is required'],
            trim: true,
            maxlength: [200, 'Street address cannot exceed 200 characters']
        },
        city: {
            type: String,
            required: [true, 'City is required'],
            trim: true,
            maxlength: [50, 'City cannot exceed 50 characters']
        },
        state: {
            type: String,
            required: [true, 'State is required'],
            trim: true,
            maxlength: [50, 'State cannot exceed 50 characters']
        },
        zipCode: {
            type: String,
            required: [true, 'ZIP code is required'],
            trim: true,
            maxlength: [10, 'ZIP code cannot exceed 10 characters']
        },
        country: {
            type: String,
            required: [true, 'Country is required'],
            trim: true,
            maxlength: [50, 'Country cannot exceed 50 characters'],
            default: 'USA'
        }
    },
    type: {
        type: String,
        enum: ['public', 'private', 'non-profit', 'government'],
        required: [true, 'Hospital type is required']
    },
    specialties: [{
        type: String,
        trim: true
    }],
    capacity: {
        beds: {
            type: Number,
            min: [1, 'Bed capacity must be at least 1'],
            required: [true, 'Bed capacity is required']
        },
        icuBeds: {
            type: Number,
            min: [0, 'ICU bed capacity cannot be negative'],
            default: 0
        },
        emergencyBeds: {
            type: Number,
            min: [0, 'Emergency bed capacity cannot be negative'],
            default: 0
        }
    },
    services: [{
        type: String,
        trim: true
    }],
    accreditation: {
        jcaho: {
            type: Boolean,
            default: false
        },
        cap: {
            type: Boolean,
            default: false
        },
        aoa: {
            type: Boolean,
            default: false
        }
    },
    website: {
        type: String,
        trim: true,
        match: [/^https?:\/\/.+/, 'Please enter a valid website URL']
    },
    description: {
        type: String,
        trim: true,
        maxlength: [1000, 'Description cannot exceed 1000 characters']
    },
    status: {
        type: String,
        enum: ['pending', 'approved', 'rejected', 'suspended'],
        default: 'pending'
    },
    isActive: {
        type: Boolean,
        default: true
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
    // Statistics
    stats: {
        totalDoctors: {
            type: Number,
            default: 0
        },
        totalPatients: {
            type: Number,
            default: 0
        },
        totalReferrals: {
            type: Number,
            default: 0
        }
    }
}, {
    timestamps: true
});

// Indexes for better query performance
hospitalSchema.index({ name: 1 });
hospitalSchema.index({ email: 1 });
hospitalSchema.index({ status: 1 });
hospitalSchema.index({ 'address.city': 1 });
hospitalSchema.index({ 'address.state': 1 });
hospitalSchema.index({ specialties: 1 });

// Virtual for full address
hospitalSchema.virtual('fullAddress').get(function () {
    const addr = this.address;
    return `${addr.street}, ${addr.city}, ${addr.state} ${addr.zipCode}, ${addr.country}`;
});

// Virtual for approval status
hospitalSchema.virtual('isApproved').get(function () {
    return this.status === 'approved';
});

// Virtual for pending status
hospitalSchema.virtual('isPending').get(function () {
    return this.status === 'pending';
});

// Method to approve hospital
hospitalSchema.methods.approve = function (approvedBy) {
    this.status = 'approved';
    this.approvedBy = approvedBy;
    this.approvedAt = new Date();
    return this.save();
};

// Method to reject hospital
hospitalSchema.methods.reject = function (rejectionReason, rejectedBy) {
    this.status = 'rejected';
    this.rejectionReason = rejectionReason;
    this.approvedBy = rejectedBy;
    this.approvedAt = new Date();
    return this.save();
};

// Static method to get hospitals by status
hospitalSchema.statics.getByStatus = function (status) {
    return this.find({ status });
};

// Static method to get approved hospitals
hospitalSchema.statics.getApproved = function () {
    return this.find({ status: 'approved', isActive: true }).select('name address specialties capacity');
};

module.exports = mongoose.model('Hospital', hospitalSchema);