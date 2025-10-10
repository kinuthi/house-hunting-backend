const axios = require('axios');
const nodemailer = require('nodemailer');

class EmailService {
    constructor() {
        this.BREVO_API_KEY = process.env.BREVO_API_KEY;
        this.BREVO_API_URL = process.env.BREVO_BASE_URL || 'https://api.brevo.com/v3/smtp/email';

        this.transporter = nodemailer.createTransport({
            host: 'smtp-relay.brevo.com',
            port: 587,
            secure: false,
            auth: {
                user: process.env.BREVO_SMTP_USER || process.env.FROM_EMAIL,
                pass: process.env.BREVO_SMTP_PASSWORD || this.BREVO_API_KEY
            },
            tls: {
                ciphers: 'SSLv3'
            }
        });
    }

    async sendEmailAPI(to, subject, htmlContent, fromEmail = null, fromName = null) {
        const emailData = {
            sender: {
                email: fromEmail || process.env.FROM_EMAIL || 'info@househunters.co.ke',
                name: fromName || process.env.FROM_NAME || 'House Hunters'
            },
            to: [{ email: to }],
            subject: subject,
            htmlContent: htmlContent,
        };

        try {
            const response = await axios.post(this.BREVO_API_URL, emailData, {
                headers: {
                    'api-key': this.BREVO_API_KEY,
                    'Content-Type': 'application/json',
                },
            });
            console.log('Email sent successfully via API:', response.data);
            return {
                success: true,
                response: response.data
            };
        } catch (error) {
            console.error('Error sending email via API:', error.response ? error.response.data : error.message);
            throw new Error('Failed to send email via API: ' + (error.response?.data?.message || error.message));
        }
    }

    async sendEmail(optionsOrTo, subject = null, htmlContent = null, fromEmail = null, fromName = null) {
        try {
            if (typeof optionsOrTo === 'object') {
                return await this.sendEmailAPI(
                    optionsOrTo.email,
                    optionsOrTo.subject,
                    optionsOrTo.html || optionsOrTo.message,
                    optionsOrTo.fromEmail,
                    optionsOrTo.fromName
                );
            } else {
                return await this.sendEmailAPI(optionsOrTo, subject, htmlContent, fromEmail, fromName);
            }
        } catch (error) {
            console.error('Email delivery failed:', error.message);
            throw new Error('Email delivery failed. Check your Brevo configuration.');
        }
    }
    // Add these methods to your EmailService class in services/email.js

    // Contact form notification to admin
    async sendContactNotificationToAdmin(contactData) {
        try {
            const { name, email, phone, subject, message, contactId } = contactData;
            const adminEmail = process.env.ADMIN_EMAIL || 'info@househunters.co.ke';

            const content = `
            <p>Hello Admin,</p>
            
            <h2 style="color: #861874;">New Contact Form Submission</h2>
            
            <p>You have received a new message through the contact form:</p>

            <div class="info-box">
                <h3 style="margin-top: 0;">Contact Details</h3>
                <table>
                    <tr>
                        <td>Name:</td>
                        <td><strong>${name}</strong></td>
                    </tr>
                    <tr>
                        <td>Email:</td>
                        <td><strong>${email}</strong></td>
                    </tr>
                    <tr>
                        <td>Phone:</td>
                        <td><strong>${phone}</strong></td>
                    </tr>
                    <tr>
                        <td>Subject:</td>
                        <td><strong>${subject}</strong></td>
                    </tr>
                </table>
            </div>

            <div class="info-box" style="background-color: #f0f9ff; border-left-color: #1890ff;">
                <h3 style="margin-top: 0; color: #1890ff;">Message</h3>
                <p style="white-space: pre-wrap;">${message}</p>
            </div>

            <div class="divider"></div>

            <p>Please respond to this inquiry as soon as possible.</p>

            <a href="${process.env.CLIENT_URL || 'https://househunters.co.ke'}/admin/contacts/${contactId}" class="button">
                View in Dashboard
            </a>

            <div class="divider"></div>

            <p><strong>Quick Reply:</strong></p>
            <p>Reply directly to this email or contact the customer at:</p>
            <p>📧 ${email}<br>
            📞 ${phone}</p>
        `;

            const htmlContent = this.buildEmailTemplate('New Contact Form Submission', content);

            await this.sendEmail({
                email: adminEmail,
                subject: `New Contact: ${subject}`,
                html: htmlContent,
                fromEmail: 'noreply@househunters.co.ke',
                fromName: 'House Hunters Contact Form'
            });

            console.log('Contact notification sent to admin:', adminEmail);
            return { success: true };
        } catch (error) {
            console.error('Error sending contact notification to admin:', error);
            throw error;
        }
    }

    // Contact form confirmation to customer
    async sendContactConfirmationToCustomer(email, contactData) {
        try {
            const { name, subject } = contactData;

            const content = `
            <p>Dear ${name},</p>
            
            <h2 style="color: #861874;">Thank You for Contacting Us! 📧</h2>
            
            <p>We have received your message and one of our team members will get back to you as soon as possible.</p>

            <div class="info-box">
                <h3 style="margin-top: 0;">Your Message Details</h3>
                <table>
                    <tr>
                        <td>Subject:</td>
                        <td><strong>${subject}</strong></td>
                    </tr>
                    <tr>
                        <td>Received:</td>
                        <td>${new Date().toLocaleDateString('en-US', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric', hour: '2-digit', minute: '2-digit' })}</td>
                    </tr>
                </table>
            </div>

            <div class="info-box" style="background-color: #e6f7ff; border-left-color: #1890ff;">
                <h3 style="margin-top: 0; color: #1890ff;">⏰ Response Time</h3>
                <p>Our team typically responds within <strong>24-48 hours</strong> during business hours.</p>
                <p><strong>Business Hours:</strong><br>
                Monday - Friday: 9:00 AM - 6:00 PM<br>
                Saturday: 10:00 AM - 4:00 PM<br>
                Sunday: Closed</p>
            </div>

            <div class="divider"></div>

            <h3>Need Immediate Assistance?</h3>
            <p>If your inquiry is urgent, you can reach us directly at:</p>
            <p>📞 <strong>Phone:</strong> +254 710 199 669<br>
            📧 <strong>Email:</strong> info@househunters.co.ke<br>
            📍 <strong>Location:</strong> Nairobi, Kenya</p>

            <div class="divider"></div>

            <h3>While You Wait...</h3>
            <p>Explore our services and offerings:</p>
            <p>🏠 Browse available properties<br>
            📅 Book property viewings<br>
            ♻️ Connect with garbage collection services</p>

            <a href="${process.env.CLIENT_URL || 'https://househunters.co.ke'}" class="button">
                Visit Our Website
            </a>

            <div class="divider"></div>

            <p>Thank you for choosing House Hunters!</p>
            
            <p>Best regards,<br>
            <strong>The House Hunters Team</strong></p>
        `;

            const htmlContent = this.buildEmailTemplate('We Received Your Message - House Hunters', content);

            await this.sendEmail({
                email: email,
                subject: 'Thank You for Contacting House Hunters',
                html: htmlContent,
                fromEmail: 'info@househunters.co.ke',
                fromName: 'House Hunters Support'
            });

            console.log('Contact confirmation sent to customer:', email);
            return { success: true };
        } catch (error) {
            console.error('Error sending contact confirmation to customer:', error);
            throw error;
        }
    }
    // Simple HTML email template builder
    buildEmailTemplate(title, content, footerText = null) {
        return `
        <!DOCTYPE html>
        <html>
        <head>
            <meta charset="utf-8">
            <meta name="viewport" content="width=device-width, initial-scale=1.0">
            <style>
                body { 
                    font-family: Arial, sans-serif; 
                    margin: 0; 
                    padding: 0; 
                    background-color: #f4f4f4; 
                }
                .container { 
                    max-width: 600px; 
                    margin: 20px auto; 
                    background-color: white; 
                    border-radius: 8px;
                    overflow: hidden;
                    box-shadow: 0 2px 4px rgba(0,0,0,0.1);
                }
                .header { 
                    background: linear-gradient(135deg, #F6BB29 0%, #861874 100%);
                    color: white;
                    padding: 30px 20px;
                    text-align: center;
                }
                .header h1 {
                    margin: 0;
                    font-size: 24px;
                }
                .content { 
                    padding: 30px 20px;
                    color: #333;
                    line-height: 1.6;
                }
                .footer { 
                    background-color: #f9f9f9;
                    padding: 20px;
                    text-align: center;
                    font-size: 12px;
                    color: #666;
                    border-top: 1px solid #eee;
                }
                .button {
                    display: inline-block;
                    padding: 12px 30px;
                    background: linear-gradient(135deg, #F6BB29 0%, #861874 100%);
                    color: white;
                    text-decoration: none;
                    border-radius: 5px;
                    margin: 20px 0;
                    font-weight: bold;
                }
                .info-box {
                    background-color: #f9f9f9;
                    border-left: 4px solid #F6BB29;
                    padding: 15px;
                    margin: 20px 0;
                }
                .divider {
                    height: 1px;
                    background-color: #eee;
                    margin: 20px 0;
                }
                table {
                    width: 100%;
                    border-collapse: collapse;
                }
                table td {
                    padding: 8px;
                    border-bottom: 1px solid #eee;
                }
                table td:first-child {
                    font-weight: bold;
                    color: #666;
                }
            </style>
        </head>
        <body>
            <div class="container">
                <div class="header">
                    <h1>${title}</h1>
                </div>
                <div class="content">
                    ${content}
                </div>
                <div class="footer">
                    <p>${footerText || `&copy; ${new Date().getFullYear()} House Hunters. All rights reserved.`}</p>
                    <p>Contact us: +254 710 199 669 | info@househunters.co.ke</p>
                </div>
            </div>
        </body>
        </html>`;
    }
    // Email verification OTP
    async sendEmailVerificationOTP(email, userData) {
        try {
            const { name, otp } = userData;

            const content = `
            <p>Dear ${name},</p>
            
            <h2 style="color: #861874;">Verify Your Email Address</h2>
            
            <p>Thank you for registering with House Hunters! To complete your registration, please use the following One-Time Password (OTP):</p>

            <div class="info-box" style="text-align: center; background-color: #f0f9ff; border-left-color: #1890ff; padding: 30px;">
                <h1 style="font-size: 48px; margin: 0; color: #861874; letter-spacing: 8px;">${otp}</h1>
                <p style="margin: 10px 0 0 0; color: #666;">This code will expire in 10 minutes</p>
            </div>

            <div class="divider"></div>

            <p><strong>Important:</strong></p>
            <p>• Do not share this OTP with anyone</p>
            <p>• This OTP is valid for 10 minutes only</p>
            <p>• If you didn't request this, please ignore this email</p>

            <div class="divider"></div>

            <p>Need help? Contact us at:</p>
            <p>📞 +254 710 199 669<br>
            📧 info@househunters.co.ke</p>
        `;

            const htmlContent = this.buildEmailTemplate('Verify Your Email - House Hunters', content);

            await this.sendEmail({
                email: email,
                subject: 'Verify Your Email - House Hunters',
                html: htmlContent
            });

            console.log('Email verification OTP sent to:', email);
            return { success: true };
        } catch (error) {
            console.error('Error sending email verification OTP:', error);
            throw error;
        }
    }

    // Admin notification for new user approval
    async sendNewUserApprovalNotificationToAdmin(userData) {
        try {
            const { name, email, role, phone, idDocument } = userData;
            const adminEmail = process.env.ADMIN_EMAIL || 'info@househunters.co.ke';

            const roleLabel = role === 'property_manager' ? 'Property Manager' : 'Garbage Collection Company';

            const content = `
            <p>Hello Admin,</p>
            
            <h2 style="color: #861874;">New ${roleLabel} Registration</h2>
            
            <p>A new user has registered and requires approval:</p>

            <div class="info-box">
                <h3 style="margin-top: 0;">User Details</h3>
                <table>
                    <tr>
                        <td>Name:</td>
                        <td>${name}</td>
                    </tr>
                    <tr>
                        <td>Email:</td>
                        <td>${email}</td>
                    </tr>
                    <tr>
                        <td>Phone:</td>
                        <td>${phone || 'Not provided'}</td>
                    </tr>
                    <tr>
                        <td>Role:</td>
                        <td>${roleLabel}</td>
                    </tr>
                    <tr>
                        <td>ID Type:</td>
                        <td>${idDocument.idType.replace('_', ' ').toUpperCase()}</td>
                    </tr>
                    <tr>
                        <td>ID Number:</td>
                        <td>${idDocument.idNumber}</td>
                    </tr>
                </table>
            </div>

            <div class="info-box" style="background-color: #fff9e6; border-left-color: #F6BB29;">
                <h3 style="margin-top: 0;">ID Documents</h3>
                <p><a href="${idDocument.front}" style="color: #861874;">View ID Front</a></p>
                <p><a href="${idDocument.back}" style="color: #861874;">View ID Back</a></p>
            </div>

            <div class="divider"></div>

            <p>Please review the application and approve or reject:</p>

            <a href="${process.env.CLIENT_URL || 'https://househunters.co.ke'}/admin/users/pending" class="button">
                Review Application
            </a>
        `;

            const htmlContent = this.buildEmailTemplate('New User Registration Pending Approval', content);

            await this.sendEmail({
                email: adminEmail,
                subject: `New ${roleLabel} Registration - Approval Required`,
                html: htmlContent
            });

            console.log('Admin notification sent for new user:', email);
            return { success: true };
        } catch (error) {
            console.error('Error sending admin notification:', error);
            throw error;
        }
    }

    // User approval/rejection notification
    async sendUserApprovalNotification(email, approvalData) {
        try {
            const { name, approvalStatus, approvalNotes, role } = approvalData;
            const roleLabel = role === 'property_manager' ? 'Property Manager' : 'Garbage Collection Company';

            let content = '';

            if (approvalStatus === 'approved') {
                content = `
                <p>Dear ${name},</p>
                
                <div class="info-box" style="background-color: #f6ffed; border-left-color: #52c41a;">
                    <h2 style="margin-top: 0; color: #52c41a;">✅ Account Approved!</h2>
                </div>

                <p>Congratulations! Your ${roleLabel} account has been approved.</p>

                <p>You can now:</p>
                ${role === 'property_manager' ? `
                    <p>✓ List and manage your properties</p>
                    <p>✓ Receive and manage booking requests</p>
                    <p>✓ Track viewings and revenue</p>
                    <p>✓ Communicate with potential tenants</p>
                ` : `
                    <p>✓ Receive booking requests from customers</p>
                    <p>✓ Manage your service schedule</p>
                    <p>✓ Track earnings and commissions</p>
                    <p>✓ Build your business reputation</p>
                `}

                <a href="${process.env.CLIENT_URL || 'https://househunters.co.ke'}/login" class="button">
                    Login to Dashboard
                </a>

                ${approvalNotes ? `
                    <div class="divider"></div>
                    <p><strong>Admin Notes:</strong> ${approvalNotes}</p>
                ` : ''}
            `;
            } else {
                content = `
                <p>Dear ${name},</p>
                
                <div class="info-box" style="background-color: #fff1f0; border-left-color: #ff4d4f;">
                    <h2 style="margin-top: 0; color: #ff4d4f;">❌ Account Registration Declined</h2>
                </div>

                <p>We regret to inform you that your ${roleLabel} account registration has been declined.</p>

                ${approvalNotes ? `
                    <div class="info-box">
                        <h3 style="margin-top: 0;">Reason:</h3>
                        <p>${approvalNotes}</p>
                    </div>
                ` : ''}

                <div class="divider"></div>

                <p>If you believe this is a mistake or would like to discuss this decision, please contact us:</p>
                <p>📞 +254 710 199 669<br>
                📧 info@househunters.co.ke</p>
            `;
            }

            const htmlContent = this.buildEmailTemplate(
                `Account ${approvalStatus === 'approved' ? 'Approved' : 'Registration Declined'}`,
                content
            );

            await this.sendEmail({
                email: email,
                subject: `House Hunters Account ${approvalStatus === 'approved' ? 'Approved' : 'Registration Declined'}`,
                html: htmlContent
            });

            console.log(`Approval notification (${approvalStatus}) sent to:`, email);
            return { success: true };
        } catch (error) {
            console.error('Error sending approval notification:', error);
            throw error;
        }
    }
    // Booking confirmation email to customer
    async sendBookingConfirmationToCustomer(email, bookingData) {
        try {
            const { property, visitDate, visitTime, numberOfProperties, viewingFee, cleaningService, totalFee, customer } = bookingData;

            let cleaningServiceHTML = '';
            if (cleaningService && cleaningService.required) {
                cleaningServiceHTML = `
                    <div class="info-box" style="background-color: #e6f7ff; border-left-color: #52c41a;">
                        <h3 style="margin-top: 0; color: #52c41a;">✓ Cleaning Service Added</h3>
                        <p><strong>Cleaning Fee:</strong> KES ${cleaningService.fee.toLocaleString()}</p>
                        ${cleaningService.notes ? `<p><strong>Notes:</strong> ${cleaningService.notes}</p>` : ''}
                    </div>
                `;
            }

            const content = `
                <p>Dear ${customer.name},</p>
                <p>Thank you for booking a property viewing with House Hunters! Your booking has been received and is pending confirmation.</p>
                
                <div class="info-box">
                    <h3 style="margin-top: 0; color: #861874;">📋 Booking Details</h3>
                    <table>
                        <tr>
                            <td>Property:</td>
                            <td>${property.title}</td>
                        </tr>
                        <tr>
                            <td>Location:</td>
                            <td>${property.address.street}, ${property.address.city}</td>
                        </tr>
                        <tr>
                            <td>Visit Date:</td>
                            <td>${new Date(visitDate).toLocaleDateString('en-US', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' })}</td>
                        </tr>
                        <tr>
                            <td>Visit Time:</td>
                            <td>${visitTime}</td>
                        </tr>
                        <tr>
                            <td>Properties to View:</td>
                            <td>${numberOfProperties}</td>
                        </tr>
                    </table>
                </div>

                <div class="info-box" style="background-color: #fff9e6; border-left-color: #F6BB29;">
                    <h3 style="margin-top: 0; color: #F6BB29;">💰 Payment Summary</h3>
                    <table>
                        <tr>
                            <td>Viewing Fee:</td>
                            <td>KES ${viewingFee.toLocaleString()}</td>
                        </tr>
                        ${cleaningService && cleaningService.required ? `
                        <tr>
                            <td>Cleaning Service:</td>
                            <td>KES ${cleaningService.fee.toLocaleString()}</td>
                        </tr>
                        ` : ''}
                        <tr style="border-top: 2px solid #F6BB29;">
                            <td><strong>Total Amount:</strong></td>
                            <td><strong>KES ${totalFee.toLocaleString()}</strong></td>
                        </tr>
                    </table>
                </div>

                ${cleaningServiceHTML}

                <div class="divider"></div>

                <h3>What's Next?</h3>
                <p>1. Our team will review your booking request</p>
                <p>2. You will receive a confirmation email within 24 hours</p>
                <p>3. Payment instructions will be included in the confirmation</p>
                <p>4. Make sure to arrive 5 minutes before your scheduled time</p>

                <div class="divider"></div>

                <p>If you have any questions or need to make changes to your booking, please contact us:</p>
                <p>📞 Phone: +254 710 199 669<br>
                📧 Email: info@househunters.co.ke</p>

                <p>Thank you for choosing House Hunters!</p>
            `;

            const htmlContent = this.buildEmailTemplate('Booking Confirmation - Property Viewing', content);

            await this.sendEmail({
                email: email,
                subject: `Property Viewing Booking Confirmation - ${property.title}`,
                html: htmlContent
            });

            console.log('Booking confirmation email sent to customer:', email);
            return { success: true };
        } catch (error) {
            console.error('Error sending booking confirmation to customer:', error);
            throw error;
        }
    }

    // Booking notification email to property manager
    async sendBookingNotificationToManager(managerEmail, bookingData) {
        try {
            const { property, visitDate, visitTime, numberOfProperties, viewingFee, cleaningService, totalFee, customer } = bookingData;

            let cleaningServiceHTML = '';
            if (cleaningService && cleaningService.required) {
                cleaningServiceHTML = `
                    <div class="info-box" style="background-color: #e6f7ff; border-left-color: #52c41a;">
                        <h3 style="margin-top: 0; color: #52c41a;">🧹 Cleaning Service Requested</h3>
                        <p><strong>Cleaning Fee:</strong> KES ${cleaningService.fee.toLocaleString()}</p>
                        ${cleaningService.notes ? `<p><strong>Special Requirements:</strong> ${cleaningService.notes}</p>` : ''}
                    </div>
                `;
            }

            const content = `
                <p>Hello,</p>
                <p>You have received a new property viewing booking request for your property.</p>
                
                <div class="info-box">
                    <h3 style="margin-top: 0; color: #861874;">🏠 Property Details</h3>
                    <table>
                        <tr>
                            <td>Property:</td>
                            <td>${property.title}</td>
                        </tr>
                        <tr>
                            <td>Location:</td>
                            <td>${property.address.street}, ${property.address.city}</td>
                        </tr>
                    </table>
                </div>

                <div class="info-box" style="background-color: #f0f9ff; border-left-color: #1890ff;">
                    <h3 style="margin-top: 0; color: #1890ff;">👤 Customer Information</h3>
                    <table>
                        <tr>
                            <td>Name:</td>
                            <td>${customer.name}</td>
                        </tr>
                        <tr>
                            <td>Email:</td>
                            <td>${customer.email}</td>
                        </tr>
                        <tr>
                            <td>Phone:</td>
                            <td>${customer.phone || 'Not provided'}</td>
                        </tr>
                    </table>
                </div>

                <div class="info-box" style="background-color: #fff9e6; border-left-color: #F6BB29;">
                    <h3 style="margin-top: 0; color: #F6BB29;">📅 Visit Schedule</h3>
                    <table>
                        <tr>
                            <td>Date:</td>
                            <td>${new Date(visitDate).toLocaleDateString('en-US', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' })}</td>
                        </tr>
                        <tr>
                            <td>Time:</td>
                            <td>${visitTime}</td>
                        </tr>
                        <tr>
                            <td>Properties to View:</td>
                            <td>${numberOfProperties}</td>
                        </tr>
                        <tr>
                            <td>Total Fee:</td>
                            <td><strong>KES ${totalFee.toLocaleString()}</strong></td>
                        </tr>
                    </table>
                </div>

                ${cleaningServiceHTML}

                <div class="divider"></div>

                <h3>Action Required:</h3>
                <p>Please log in to your dashboard to:</p>
                <p>✓ Confirm or decline the booking request</p>
                <p>✓ View complete booking details</p>
                <p>✓ Communicate with the customer</p>

                <a href="${process.env.CLIENT_URL || 'https://househunters.co.ke'}/dashboard/bookings" class="button">
                    View Booking Details
                </a>

                <div class="divider"></div>

                <p>For assistance, contact support at info@househunters.co.ke or call +254 710 199 669</p>
            `;

            const htmlContent = this.buildEmailTemplate('New Property Viewing Booking', content);

            await this.sendEmail({
                email: managerEmail,
                subject: `New Booking Request - ${property.title}`,
                html: htmlContent
            });

            console.log('Booking notification email sent to manager:', managerEmail);
            return { success: true };
        } catch (error) {
            console.error('Error sending booking notification to manager:', error);
            throw error;
        }
    }

    // Booking status update email
    async sendBookingStatusUpdate(email, bookingData, status) {
        try {
            const { property, visitDate, visitTime, customer } = bookingData;

            let statusMessage = '';
            let statusColor = '';
            let statusIcon = '';

            switch (status) {
                case 'confirmed':
                    statusMessage = 'Your booking has been confirmed!';
                    statusColor = '#52c41a';
                    statusIcon = '✅';
                    break;
                case 'cancelled':
                    statusMessage = 'Your booking has been cancelled.';
                    statusColor = '#ff4d4f';
                    statusIcon = '❌';
                    break;
                case 'completed':
                    statusMessage = 'Your property viewing has been completed.';
                    statusColor = '#1890ff';
                    statusIcon = '✓';
                    break;
                default:
                    statusMessage = `Your booking status has been updated to: ${status}`;
                    statusColor = '#F6BB29';
                    statusIcon = 'ℹ️';
            }

            const content = `
                <p>Dear ${customer.name},</p>
                
                <div class="info-box" style="background-color: ${statusColor}15; border-left-color: ${statusColor};">
                    <h2 style="margin-top: 0; color: ${statusColor};">${statusIcon} ${statusMessage}</h2>
                </div>

                <div class="info-box">
                    <h3 style="margin-top: 0;">Booking Details</h3>
                    <table>
                        <tr>
                            <td>Property:</td>
                            <td>${property.title}</td>
                        </tr>
                        <tr>
                            <td>Location:</td>
                            <td>${property.address.street}, ${property.address.city}</td>
                        </tr>
                        <tr>
                            <td>Date:</td>
                            <td>${new Date(visitDate).toLocaleDateString('en-US', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' })}</td>
                        </tr>
                        <tr>
                            <td>Time:</td>
                            <td>${visitTime}</td>
                        </tr>
                    </table>
                </div>

                ${status === 'confirmed' ? `
                    <div class="divider"></div>
                    <h3>Payment Instructions:</h3>
                    <p>Please complete your payment to secure your booking. Payment details:</p>
                    <p><strong>M-PESA Paybill:</strong> [Your Paybill Number]<br>
                    <strong>Account Number:</strong> [Booking Reference]<br>
                    <strong>Amount:</strong> KES ${bookingData.totalFee.toLocaleString()}</p>
                ` : ''}

                ${status === 'completed' ? `
                    <div class="divider"></div>
                    <p>Thank you for choosing House Hunters! We hope you found your dream property.</p>
                    <p>If you're interested in any of the properties you viewed, please contact us to proceed with the rental or purchase process.</p>
                ` : ''}

                <div class="divider"></div>
                <p>For any questions, contact us at:</p>
                <p>📞 +254 710 199 669<br>
                📧 info@househunters.co.ke</p>
            `;

            const htmlContent = this.buildEmailTemplate(`Booking ${status.charAt(0).toUpperCase() + status.slice(1)}`, content);

            await this.sendEmail({
                email: email,
                subject: `Booking ${status.charAt(0).toUpperCase() + status.slice(1)} - ${property.title}`,
                html: htmlContent
            });

            console.log(`Booking status update email sent to: ${email}`);
            return { success: true };
        } catch (error) {
            console.error('Error sending booking status update:', error);
            throw error;
        }
    }

    // Welcome email for new users
    async sendWelcomeEmail(email, userData) {
        try {
            const { name, role } = userData;

            let roleMessage = '';
            switch (role) {
                case 'customer':
                    roleMessage = 'Start browsing properties and book viewings with ease!';
                    break;
                case 'property_manager':
                    roleMessage = 'Start listing your properties and manage bookings efficiently!';
                    break;
                case 'garbage_collection_company':
                    roleMessage = 'Connect with customers and grow your waste management business!';
                    break;
                default:
                    roleMessage = 'Explore our platform and discover all available services!';
            }

            const content = `
                <p>Dear ${name},</p>
                
                <h2 style="color: #861874;">Welcome to House Hunters! 🎉</h2>
                
                <p>We're excited to have you on board. ${roleMessage}</p>

                <div class="info-box">
                    <h3 style="margin-top: 0;">What You Can Do:</h3>
                    ${role === 'customer' ? `
                        <p>✓ Browse verified property listings</p>
                        <p>✓ Book property viewings with optional cleaning services</p>
                        <p>✓ Connect with garbage collection companies</p>
                        <p>✓ Track your bookings and payments</p>
                    ` : role === 'property_manager' ? `
                        <p>✓ List and manage your properties</p>
                        <p>✓ Receive and manage booking requests</p>
                        <p>✓ Track viewings and revenue</p>
                        <p>✓ Communicate with potential tenants</p>
                    ` : `
                        <p>✓ Create your company profile</p>
                        <p>✓ Receive booking requests from customers</p>
                        <p>✓ Manage your service schedule</p>
                        <p>✓ Track earnings and commissions</p>
                    `}
                </div>

                <a href="${process.env.CLIENT_URL || 'https://househunters.co.ke'}/dashboard" class="button">
                    Go to Dashboard
                </a>

                <div class="divider"></div>

                <p>Need help getting started? Our support team is here to assist you:</p>
                <p>📞 +254 710 199 669<br>
                📧 info@househunters.co.ke</p>

                <p>Best regards,<br>
                The House Hunters Team</p>
            `;

            const htmlContent = this.buildEmailTemplate('Welcome to House Hunters!', content);

            await this.sendEmail({
                email: email,
                subject: 'Welcome to House Hunters - Your Journey Begins! 🏠',
                html: htmlContent
            });

            console.log('Welcome email sent to:', email);
            return { success: true };
        } catch (error) {
            console.error('Error sending welcome email:', error);
            throw error;
        }
    }
}

module.exports = new EmailService();