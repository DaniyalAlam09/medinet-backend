const User = require('../models/User');
const Hospital = require('../models/Hospital');
const Referral = require('../models/Referral');
const Patient = require('../models/Patient');

// @desc    Get super admin dashboard data
// @route   GET /api/analytics/super-admin-dashboard
// @access  Private (Super Admin only)
const getSuperAdminDashboard = async (req, res) => {
    try {
        const [
            totalHospitals,
            totalUsers,
            totalReferrals,
            activeReferrals,
            recentHospitals,
            recentActivities,
            systemHealth
        ] = await Promise.all([
            Hospital.countDocuments({ status: 'approved' }),
            User.countDocuments(),
            Referral.countDocuments(),
            Referral.countDocuments({ status: { $in: ['pending', 'in_progress'] } }),
            Hospital.find({ status: 'approved' })
                .sort({ createdAt: -1 })
                .limit(5),
            getRecentActivities('super_admin'),
            getSystemHealth()
        ]);

        const stats = {
            totalHospitals,
            totalUsers,
            totalReferrals,
            activeReferrals,
            systemHealth,
            lastBackup: new Date().toISOString(),
            monthlyGrowth: {
                hospitals: await getMonthlyGrowth(Hospital),
                users: await getMonthlyGrowth(User),
                referrals: await getMonthlyGrowth(Referral)
            }
        };

        res.status(200).json({
            success: true,
            data: {
                stats,
                hospitals: recentHospitals,
                activities: recentActivities
            }
        });
    } catch (error) {
        console.error('Super admin dashboard error:', error);
        res.status(500).json({
            success: false,
            message: 'Server error',
            error: process.env.NODE_ENV === 'development' ? error.message : undefined
        });
    }
};

// @desc    Get hospital admin dashboard data
// @route   GET /api/analytics/hospital-admin-dashboard
// @access  Private (Hospital Admin only)
const getHospitalDashboard = async (req, res) => {
    try {
        // For hospitals, we need to find their hospital by email match
        const hospital = await Hospital.findOne({ email: req.user.email });

        if (!hospital) {
            return res.status(400).json({
                success: false,
                message: 'Hospital not found for this user. Please contact support.'
            });
        }

        const hospitalId = hospital._id;

        const [
            totalDoctors,
            totalPatients,
            totalReferrals,
            pendingReferrals,
            completedReferrals,
            todayAppointments,
            recentDoctors,
            recentReferrals,
            recentActivities
        ] = await Promise.all([
            User.countDocuments({ role: 'doctor', hospitalId }),
            Patient.countDocuments({ hospitalId }),
            Referral.countDocuments({
                $or: [{ fromHospital: hospitalId }, { toHospital: hospitalId }]
            }),
            Referral.countDocuments({
                $or: [{ fromHospital: hospitalId }, { toHospital: hospitalId }],
                status: 'pending'
            }),
            Referral.countDocuments({
                $or: [{ fromHospital: hospitalId }, { toHospital: hospitalId }],
                status: 'completed'
            }),
            getTodayAppointments(hospitalId),
            User.find({ role: 'doctor', hospitalId })
                .select('firstName lastName specialization email phone status yearsOfExperience')
                .sort({ createdAt: -1 })
                .limit(5),
            Referral.find({
                $or: [{ fromHospital: hospitalId }, { toHospital: hospitalId }]
            })
                .populate('patientId', 'firstName lastName')
                .populate('fromDoctor', 'firstName lastName specialization')
                .populate('toHospital', 'name')
                .sort({ createdAt: -1 })
                .limit(5),
            getRecentActivities('hospital', hospitalId)
        ]);

        const stats = {
            hospitalName: hospital?.name || 'Unknown Hospital',
            totalDoctors,
            totalPatients,
            totalReferrals,
            pendingReferrals,
            completedReferrals,
            todayAppointments,
            systemStatus: 'Operational',
            monthlyGrowth: {
                doctors: await getMonthlyGrowth(User, { role: 'doctor', hospitalId }),
                patients: await getMonthlyGrowth(Patient, { hospitalId }),
                referrals: await getMonthlyGrowth(Referral, {
                    $or: [{ fromHospital: hospitalId }, { toHospital: hospitalId }]
                })
            }
        };

        res.status(200).json({
            success: true,
            data: {
                stats,
                doctors: recentDoctors,
                referrals: recentReferrals,
                activities: recentActivities
            }
        });
    } catch (error) {
        console.error('Hospital admin dashboard error:', error);
        res.status(500).json({
            success: false,
            message: 'Server error',
            error: process.env.NODE_ENV === 'development' ? error.message : undefined
        });
    }
};

// @desc    Get doctor dashboard data
// @route   GET /api/analytics/doctor-dashboard
// @access  Private (Doctor only)
const getDoctorDashboard = async (req, res) => {
    try {
        const doctorId = req.user.id;
        const hospitalId = req.user.hospitalId;

        const [
            totalPatients,
            todayAppointments,
            pendingReferrals,
            completedReferrals,
            thisMonthReferrals,
            recentPatients,
            recentAppointments,
            recentReferrals,
            recentActivities
        ] = await Promise.all([
            Patient.countDocuments({ doctorId }),
            getTodayAppointments(hospitalId, doctorId),
            Referral.countDocuments({ fromDoctor: doctorId, status: 'pending' }),
            Referral.countDocuments({ fromDoctor: doctorId, status: 'completed' }),
            Referral.countDocuments({
                fromDoctor: doctorId,
                createdAt: { $gte: new Date(new Date().getFullYear(), new Date().getMonth(), 1) }
            }),
            Patient.find({ doctorId })
                .select('firstName lastName age gender lastVisit nextAppointment status condition priority')
                .sort({ lastVisit: -1 })
                .limit(5),
            getDoctorAppointments(doctorId),
            Referral.find({ fromDoctor: doctorId })
                .populate('patientId', 'firstName lastName')
                .populate('toHospital', 'name')
                .sort({ createdAt: -1 })
                .limit(5),
            getRecentActivities('doctor', null, doctorId)
        ]);

        const stats = {
            doctorName: `${req.user.firstName} ${req.user.lastName}`,
            specialization: req.user.specialization,
            totalPatients,
            todayAppointments,
            pendingReferrals,
            completedReferrals,
            thisMonthReferrals,
            averageRating: 4.8, // This would come from a ratings system
            monthlyGrowth: {
                patients: await getMonthlyGrowth(Patient, { doctorId }),
                referrals: await getMonthlyGrowth(Referral, { fromDoctor: doctorId })
            }
        };

        res.status(200).json({
            success: true,
            data: {
                stats,
                patients: recentPatients,
                appointments: recentAppointments,
                referrals: recentReferrals,
                activities: recentActivities
            }
        });
    } catch (error) {
        console.error('Doctor dashboard error:', error);
        res.status(500).json({
            success: false,
            message: 'Server error',
            error: process.env.NODE_ENV === 'development' ? error.message : undefined
        });
    }
};

// @desc    Get patient dashboard data
// @route   GET /api/analytics/patient-dashboard
// @access  Private (Patient only)
const getPatientDashboard = async (req, res) => {
    try {
        const patientId = req.user.id;

        const [
            totalAppointments,
            upcomingAppointments,
            completedReferrals,
            pendingReferrals,
            medicalRecords,
            recentAppointments,
            recentReferrals,
            recentRecords,
            recentActivities
        ] = await Promise.all([
            getPatientAppointmentsCount(patientId),
            getUpcomingAppointments(patientId),
            Referral.countDocuments({ patientId, status: 'completed' }),
            Referral.countDocuments({ patientId, status: 'pending' }),
            getMedicalRecordsCount(patientId),
            getPatientAppointments(patientId),
            Referral.find({ patientId })
                .populate('fromDoctor', 'firstName lastName specialization')
                .populate('toHospital', 'name')
                .sort({ createdAt: -1 })
                .limit(5),
            getMedicalRecords(patientId),
            getRecentActivities('patient', null, null, patientId)
        ]);

        const stats = {
            patientName: `${req.user.firstName} ${req.user.lastName}`,
            age: calculateAge(req.user.dateOfBirth),
            gender: req.user.gender,
            primaryDoctor: 'Dr. Sarah Johnson', // This would come from a relationship
            nextAppointment: upcomingAppointments[0]?.dateTime || null,
            totalAppointments,
            upcomingAppointments: upcomingAppointments.length,
            completedReferrals,
            pendingReferrals,
            medicalRecords
        };

        res.status(200).json({
            success: true,
            data: {
                stats,
                appointments: recentAppointments,
                referrals: recentReferrals,
                records: recentRecords,
                activities: recentActivities
            }
        });
    } catch (error) {
        console.error('Patient dashboard error:', error);
        res.status(500).json({
            success: false,
            message: 'Server error',
            error: process.env.NODE_ENV === 'development' ? error.message : undefined
        });
    }
};

// Helper functions
const getRecentActivities = async (role, hospitalId = null, doctorId = null, patientId = null) => {
    const activities = [];
    const now = new Date();
    const oneWeekAgo = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);

    try {
        if (role === 'super_admin') {
            // Get recent hospital registrations
            const recentHospitals = await Hospital.find({ createdAt: { $gte: oneWeekAgo } })
                .sort({ createdAt: -1 })
                .limit(5);

            recentHospitals.forEach(hospital => {
                activities.push({
                    id: hospital._id.toString(),
                    type: 'hospital_registered',
                    message: `New hospital "${hospital.name}" registered - Status: ${hospital.status}`,
                    timestamp: hospital.createdAt.toISOString(),
                    severity: hospital.status === 'pending' ? 'warning' : 'info'
                });
            });

            // Get recent user registrations
            const recentUsers = await User.find({
                createdAt: { $gte: oneWeekAgo },
                role: { $ne: 'super_admin' }
            })
                .sort({ createdAt: -1 })
                .limit(5);

            recentUsers.forEach(user => {
                activities.push({
                    id: user._id.toString(),
                    type: 'user_created',
                    message: `${user.role} ${user.firstName} ${user.lastName} registered`,
                    timestamp: user.createdAt.toISOString(),
                    severity: 'success'
                });
            });
        }

        if (role === 'hospital_admin' && hospitalId) {
            // Get recent doctor additions
            const recentDoctors = await User.find({
                role: 'doctor',
                hospitalId,
                createdAt: { $gte: oneWeekAgo }
            })
                .sort({ createdAt: -1 })
                .limit(5);

            recentDoctors.forEach(doctor => {
                activities.push({
                    id: doctor._id.toString(),
                    type: 'doctor_added',
                    message: `Dr. ${doctor.firstName} ${doctor.lastName} added to ${doctor.specialization} department`,
                    timestamp: doctor.createdAt.toISOString(),
                    severity: 'success'
                });
            });

            // Get recent referrals
            const recentReferrals = await Referral.find({
                $or: [{ fromHospital: hospitalId }, { toHospital: hospitalId }],
                createdAt: { $gte: oneWeekAgo }
            })
                .populate('patientId', 'firstName lastName')
                .sort({ createdAt: -1 })
                .limit(5);

            recentReferrals.forEach(referral => {
                activities.push({
                    id: referral._id.toString(),
                    type: 'referral_received',
                    message: `New referral for ${referral.patientId?.firstName} ${referral.patientId?.lastName}`,
                    timestamp: referral.createdAt.toISOString(),
                    severity: 'info'
                });
            });
        }

        if (role === 'doctor' && doctorId) {
            // Get recent patient additions
            const recentPatients = await Patient.find({
                doctorId,
                createdAt: { $gte: oneWeekAgo }
            })
                .sort({ createdAt: -1 })
                .limit(5);

            recentPatients.forEach(patient => {
                activities.push({
                    id: patient._id.toString(),
                    type: 'patient_added',
                    message: `New patient ${patient.firstName} ${patient.lastName} registered`,
                    timestamp: patient.createdAt.toISOString(),
                    severity: 'info'
                });
            });

            // Get recent referrals created
            const recentReferrals = await Referral.find({
                fromDoctor: doctorId,
                createdAt: { $gte: oneWeekAgo }
            })
                .populate('patientId', 'firstName lastName')
                .sort({ createdAt: -1 })
                .limit(5);

            recentReferrals.forEach(referral => {
                activities.push({
                    id: referral._id.toString(),
                    type: 'referral_created',
                    message: `Referral created for ${referral.patientId?.firstName} ${referral.patientId?.lastName}`,
                    timestamp: referral.createdAt.toISOString(),
                    severity: 'info'
                });
            });
        }

        if (role === 'patient' && patientId) {
            // Get recent appointments
            const recentAppointments = await getPatientAppointments(patientId, 5);

            recentAppointments.forEach(appointment => {
                activities.push({
                    id: appointment._id.toString(),
                    type: 'appointment_scheduled',
                    message: `Appointment scheduled with ${appointment.doctor}`,
                    timestamp: appointment.createdAt.toISOString(),
                    severity: 'info'
                });
            });

            // Get recent referrals
            const recentReferrals = await Referral.find({
                patientId,
                createdAt: { $gte: oneWeekAgo }
            })
                .populate('fromDoctor', 'firstName lastName')
                .sort({ createdAt: -1 })
                .limit(5);

            recentReferrals.forEach(referral => {
                activities.push({
                    id: referral._id.toString(),
                    type: 'referral_created',
                    message: `Referral created by Dr. ${referral.fromDoctor?.firstName} ${referral.fromDoctor?.lastName}`,
                    timestamp: referral.createdAt.toISOString(),
                    severity: 'info'
                });
            });
        }

        return activities.sort((a, b) => new Date(b.timestamp) - new Date(a.timestamp)).slice(0, 10);
    } catch (error) {
        console.error('Error getting recent activities:', error);
        return [];
    }
};

const getSystemHealth = async () => {
    try {
        // Check database connection
        const dbStatus = await User.findOne().then(() => 'Connected').catch(() => 'Disconnected');

        // Check recent error rates (simplified)
        const recentErrors = 0; // This would be tracked in a real system

        return {
            status: dbStatus === 'Connected' ? 'Healthy' : 'Unhealthy',
            database: dbStatus,
            api: 'Operational',
            storage: 'Normal',
            lastCheck: new Date().toISOString()
        };
    } catch (error) {
        return {
            status: 'Unhealthy',
            database: 'Error',
            api: 'Error',
            storage: 'Error',
            lastCheck: new Date().toISOString()
        };
    }
};

const getMonthlyGrowth = async (Model, filter = {}) => {
    try {
        const now = new Date();
        const thisMonth = new Date(now.getFullYear(), now.getMonth(), 1);
        const lastMonth = new Date(now.getFullYear(), now.getMonth() - 1, 1);
        const lastMonthEnd = new Date(now.getFullYear(), now.getMonth(), 0);

        const [thisMonthCount, lastMonthCount] = await Promise.all([
            Model.countDocuments({ ...filter, createdAt: { $gte: thisMonth } }),
            Model.countDocuments({ ...filter, createdAt: { $gte: lastMonth, $lte: lastMonthEnd } })
        ]);

        if (lastMonthCount === 0) return thisMonthCount > 0 ? 100 : 0;

        return Math.round(((thisMonthCount - lastMonthCount) / lastMonthCount) * 100);
    } catch (error) {
        console.error('Error calculating monthly growth:', error);
        return 0;
    }
};

const getTodayAppointments = async (hospitalId, doctorId = null) => {
    try {
        const today = new Date();
        today.setHours(0, 0, 0, 0);
        const tomorrow = new Date(today);
        tomorrow.setDate(tomorrow.getDate() + 1);

        const filter = {
            hospitalId,
            dateTime: { $gte: today, $lt: tomorrow }
        };

        if (doctorId) {
            filter.doctorId = doctorId;
        }

        // This would be from an Appointment model
        // For now, return a mock count
        return doctorId ? 8 : 45;
    } catch (error) {
        console.error('Error getting today appointments:', error);
        return 0;
    }
};

const getDoctorAppointments = async (doctorId) => {
    try {
        // This would be from an Appointment model
        // For now, return mock data
        return [
            {
                _id: '1',
                patientName: 'John Smith',
                time: '09:00 AM',
                date: '2024-01-16',
                type: 'Follow-up',
                status: 'Scheduled',
                notes: 'Blood pressure check',
                createdAt: new Date()
            },
            {
                _id: '2',
                patientName: 'Jane Doe',
                time: '10:30 AM',
                date: '2024-01-16',
                type: 'Consultation',
                status: 'Scheduled',
                notes: 'ECG review',
                createdAt: new Date()
            }
        ];
    } catch (error) {
        console.error('Error getting doctor appointments:', error);
        return [];
    }
};

const getPatientAppointmentsCount = async (patientId) => {
    try {
        // This would be from an Appointment model
        return 12;
    } catch (error) {
        console.error('Error getting patient appointments count:', error);
        return 0;
    }
};

const getUpcomingAppointments = async (patientId) => {
    try {
        // This would be from an Appointment model
        return [
            {
                _id: '1',
                dateTime: '2024-01-20T10:00:00Z',
                doctor: 'Dr. Sarah Johnson',
                specialty: 'Cardiology',
                type: 'Follow-up',
                status: 'Scheduled',
                location: 'City General Hospital',
                notes: 'Blood pressure check and medication review'
            }
        ];
    } catch (error) {
        console.error('Error getting upcoming appointments:', error);
        return [];
    }
};

const getPatientAppointments = async (patientId, limit = 5) => {
    try {
        // This would be from an Appointment model
        return [
            {
                _id: '1',
                doctor: 'Dr. Sarah Johnson',
                specialty: 'Cardiology',
                date: '2024-01-20',
                time: '10:00 AM',
                type: 'Follow-up',
                status: 'Scheduled',
                location: 'City General Hospital',
                notes: 'Blood pressure check and medication review',
                createdAt: new Date()
            },
            {
                _id: '2',
                doctor: 'Dr. Michael Chen',
                specialty: 'Neurology',
                date: '2024-01-25',
                time: '02:30 PM',
                type: 'Consultation',
                status: 'Scheduled',
                location: 'City General Hospital',
                notes: 'Neurological assessment',
                createdAt: new Date()
            }
        ];
    } catch (error) {
        console.error('Error getting patient appointments:', error);
        return [];
    }
};

const getMedicalRecordsCount = async (patientId) => {
    try {
        // This would be from a MedicalRecord model
        return 8;
    } catch (error) {
        console.error('Error getting medical records count:', error);
        return 0;
    }
};

const getMedicalRecords = async (patientId) => {
    try {
        // This would be from a MedicalRecord model
        return [
            {
                _id: '1',
                date: '2024-01-10',
                doctor: 'Dr. Sarah Johnson',
                specialty: 'Cardiology',
                diagnosis: 'Hypertension',
                treatment: 'Lisinopril 10mg daily',
                notes: 'Blood pressure well controlled',
                attachments: ['Lab Results', 'ECG Report'],
                createdAt: new Date()
            },
            {
                _id: '2',
                date: '2024-01-05',
                doctor: 'Dr. Michael Chen',
                specialty: 'Neurology',
                diagnosis: 'Migraine',
                treatment: 'Sumatriptan as needed',
                notes: 'Headaches reduced significantly',
                attachments: ['MRI Report'],
                createdAt: new Date()
            }
        ];
    } catch (error) {
        console.error('Error getting medical records:', error);
        return [];
    }
};

const calculateAge = (dateOfBirth) => {
    if (!dateOfBirth) return null;
    const today = new Date();
    const birthDate = new Date(dateOfBirth);
    let age = today.getFullYear() - birthDate.getFullYear();
    const monthDiff = today.getMonth() - birthDate.getMonth();

    if (monthDiff < 0 || (monthDiff === 0 && today.getDate() < birthDate.getDate())) {
        age--;
    }

    return age;
};

module.exports = {
    getSuperAdminDashboard,
    getHospitalDashboard,
    getDoctorDashboard,
    getPatientDashboard
};
