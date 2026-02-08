import { createClientFromRequest } from 'npm:@base44/sdk@0.8.6';

Deno.serve(async (req) => {
    try {
        const base44 = createClientFromRequest(req);
        const user = await base44.auth.me();

        if (!user) {
            return Response.json({ error: 'Unauthorized' }, { status: 401 });
        }

        const body = await req.json();
        const { phone_number, email, type } = body;

        // Validate type
        if (!type || !['phone', 'email'].includes(type)) {
            return Response.json({ 
                success: false,
                error: 'Invalid type. Must be phone or email' 
            }, { status: 400 });
        }

        // Validate contact info based on type
        if (type === 'phone' && !phone_number) {
            return Response.json({ 
                success: false,
                error: 'Phone number is required for phone verification' 
            }, { status: 400 });
        }

        if (type === 'email' && !email) {
            return Response.json({ 
                success: false,
                error: 'Email is required for email verification' 
            }, { status: 400 });
        }

        // Generate 6-digit OTP
        const otp = Math.floor(100000 + Math.random() * 900000).toString();
        const expiresAt = new Date(Date.now() + 10 * 60 * 1000); // 10 minutes

        // Store OTP temporarily (using user entity for simplicity)
        const otpData = {
            [`otp_${type}`]: otp,
            [`otp_${type}_expires`]: expiresAt.toISOString(),
            [`otp_${type}_target`]: type === 'phone' ? phone_number : email
        };

        await base44.auth.updateMe(otpData);

        if (type === 'phone') {
            // Send SMS via Termii
            const termiiApiKey = Deno.env.get('TERMII_API_KEY');
            
            if (!termiiApiKey) {
                return Response.json({ 
                    success: false,
                    error: 'SMS service not configured' 
                }, { status: 500 });
            }

            const termiiResponse = await fetch('https://api.ng.termii.com/api/sms/send', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify({
                    to: phone_number.startsWith('234') ? phone_number : `234${phone_number}`,
                    from: 'Creditze',
                    sms: `Your Creditze verification code is: ${otp}. Valid for 10 minutes.`,
                    type: 'plain',
                    channel: 'generic',
                    api_key: termiiApiKey
                })
            });

            const termiiData = await termiiResponse.json();

            if (!termiiResponse.ok) {
                console.error('Termii error:', termiiData);
                return Response.json({ 
                    success: false, 
                    error: 'Failed to send SMS' 
                }, { status: 500 });
            }

            return Response.json({ 
                success: true, 
                message: 'OTP sent to phone',
                message_id: termiiData.message_id
            });

        } else {
            // Send Email OTP
            await base44.integrations.Core.SendEmail({
                to: email,
                subject: 'Your Creditze Verification Code',
                body: `
                    <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
                        <h2 style="color: #059669;">Verification Code</h2>
                        <p>Your Creditze verification code is:</p>
                        <h1 style="font-size: 36px; color: #059669; letter-spacing: 8px; margin: 20px 0;">${otp}</h1>
                        <p>This code will expire in 10 minutes.</p>
                        <p style="color: #666; font-size: 12px;">If you didn't request this code, please ignore this email.</p>
                    </div>
                `
            });

            return Response.json({ 
                success: true, 
                message: 'OTP sent to email'
            });
        }

    } catch (error) {
        console.error('Send OTP error:', error);
        return Response.json({ 
            success: false, 
            error: error.message 
        }, { status: 500 });
    }
});