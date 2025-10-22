const Hospital = require('../models/Hospital');
const User = require('../models/User');
const { sendEmail, emailTemplates } = require('../config/email');

// Create hospital (public registration)
const createHospital = async (req, res) => {
    try {
        const hospitalData = req.body;

        // Check if hospital with same email already exists
        const existingHospital = await Hospital.findOne({ email: hospitalData.email });
        if (existingHospital) {
            return res.status(400).json({
                success: false,
                message: 'Hospital with this email already exists'
            });
        }

        // Create hospital
        const hospital = new Hospital({
            ...hospitalData,
            status: 'pending'
        });

        await hospital.save();

        // Create hospital user
        const hospitalUser = new User({
            firstName: hospitalData.firstName || 'Hospital',
            lastName: hospitalData.lastName || 'Manager',
            email: hospitalData.email,
            password: hospitalData.password || 'TempPassword123',
            phone: hospitalData.phone,
            role: 'hospital',
            hospitalId: hospital._id,
            approvalStatus: 'pending'
        });

        await hospitalUser.save();

        res.status(201).json({
            success: true,
            message: 'Hospital registered successfully. Awaiting approval.',
            data: {
                hospital: hospital,
                userId: hospitalUser._id
            }
        });
    } catch (error) {
        console.error('Create hospital error:', error);
        res.status(500).json({
            success: false,
            message: 'Error creating hospital',
            error: error.message
        });
    }
};

// Get all hospitals (super admin)
const getHospitals = async (req, res) => {
    try {
        const { status, page = 1, limit = 10 } = req.query;

        const filter = {};
        if (status) {
            filter.status = status;
        }

        const hospitals = await Hospital.find(filter)
            .populate('adminId', 'firstName lastName email')
            .populate('approvedBy', 'firstName lastName')
            .sort({ createdAt: -1 })
            .limit(limit * 1)
            .skip((page - 1) * limit);

        const total = await Hospital.countDocuments(filter);

        res.json({
            success: true,
            data: {
                hospitals,
                pagination: {
                    current: parseInt(page),
                    pages: Math.ceil(total / limit),
                    total
                }
            }
        });
    } catch (error) {
        console.error('Get hospitals error:', error);
        res.status(500).json({
            success: false,
            message: 'Error fetching hospitals',
            error: error.message
        });
    }
};

// Get hospital by ID
const getHospitalById = async (req, res) => {
    try {
        const { id } = req.params;

        const hospital = await Hospital.findById(id)
            .populate('adminId', 'firstName lastName email')
            .populate('approvedBy', 'firstName lastName');

        if (!hospital) {
            return res.status(404).json({
                success: false,
                message: 'Hospital not found'
            });
        }

        res.json({
            success: true,
            data: hospital
        });
    } catch (error) {
        console.error('Get hospital by ID error:', error);
        res.status(500).json({
            success: false,
            message: 'Error fetching hospital',
            error: error.message
        });
    }
};

// Update hospital
const updateHospital = async (req, res) => {
    try {
        const { id } = req.params;
        const updateData = req.body;

        const hospital = await Hospital.findById(id);
        if (!hospital) {
            return res.status(404).json({
                success: false,
                message: 'Hospital not found'
            });
        }

        // Check if user has permission to update this hospital
        if (req.user.role === 'hospital_admin' && hospital._id.toString() !== req.user.hospitalId.toString()) {
            return res.status(403).json({
                success: false,
                message: 'Not authorized to update this hospital'
            });
        }

        const updatedHospital = await Hospital.findByIdAndUpdate(
            id,
            updateData,
            { new: true, runValidators: true }
        ).populate('adminId', 'firstName lastName email');

        res.json({
            success: true,
            message: 'Hospital updated successfully',
            data: updatedHospital
        });
    } catch (error) {
        console.error('Update hospital error:', error);
        res.status(500).json({
            success: false,
            message: 'Error updating hospital',
            error: error.message
        });
    }
};

// Delete hospital
const deleteHospital = async (req, res) => {
    try {
        const { id } = req.params;

        const hospital = await Hospital.findById(id);
        if (!hospital) {
            return res.status(404).json({
                success: false,
                message: 'Hospital not found'
            });
        }

        // Check if hospital has any users
        const userCount = await User.countDocuments({ hospitalId: id });
        if (userCount > 0) {
            return res.status(400).json({
                success: false,
                message: 'Cannot delete hospital with associated users'
            });
        }

        await Hospital.findByIdAndDelete(id);

        res.json({
            success: true,
            message: 'Hospital deleted successfully'
        });
    } catch (error) {
        console.error('Delete hospital error:', error);
        res.status(500).json({
            success: false,
            message: 'Error deleting hospital',
            error: error.message
        });
    }
};

// Get approved hospitals (public)
const getApprovedHospitals = async (req, res) => {
    try {
        const hospitals = await Hospital.find({
            status: 'approved',
            isActive: true
        }).select('name address specialties capacity services website description');

        res.json({
            success: true,
            data: hospitals
        });
    } catch (error) {
        console.error('Get approved hospitals error:', error);
        res.status(500).json({
            success: false,
            message: 'Error fetching approved hospitals',
            error: error.message
        });
    }
};

module.exports = {
    createHospital,
    getHospitals,
    getHospitalById,
    updateHospital,
    deleteHospital,
    getApprovedHospitals
};
