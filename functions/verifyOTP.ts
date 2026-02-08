import { createClientFromRequest } from 'npm:@base44/sdk@0.8.6';

Deno.serve(async (req) => {
    try {
        const base44 = createClientFromRequest(req);
        const user = await base44.auth.me();

        if (!user) {
            return Response.json({ error: 'Unauthorized' }, { status: 401 });
        }

        const body = await req.json();
        const { otp, type } = body;

        if (!type || !['phone', 'email'].includes(type)) {
            return Response.json({ 
                success: false, 
                error: 'Invalid type. Must be phone or email' 
            }, { status: 400 });
        }

        if (!otp || otp.length !== 6) {
            return Response.json({ 
                success: false, 
                error: 'OTP must be 6 digits' 
            }, { status: 400 });
        }

        // Get stored OTP
        const storedOTP = user[`otp_${type}`];
        const expiresAt = user[`otp_${type}_expires`];

        if (!storedOTP || !expiresAt) {
            return Response.json({ 
                success: false, 
                error: 'No OTP found. Please request a new one.' 
            }, { status: 400 });
        }

        // Check expiry
        if (new Date(expiresAt) < new Date()) {
            return Response.json({ 
                success: false, 
                error: 'OTP has expired. Please request a new one.' 
            }, { status: 400 });
        }

        // Verify OTP
        if (storedOTP !== otp) {
            return Response.json({ 
                success: false, 
                error: 'Invalid OTP. Please try again.' 
            }, { status: 400 });
        }

        // Clear OTP after successful verification
        await base44.auth.updateMe({
            [`otp_${type}`]: null,
            [`otp_${type}_expires`]: null,
            [`otp_${type}_target`]: null
        });

        return Response.json({ 
            success: true, 
            message: 'OTP verified successfully',
            verified_value: user[`otp_${type}_target`]
        });

    } catch (error) {
        console.error('Verify OTP error:', error);
        return Response.json({ 
            success: false, 
            error: error.message 
        }, { status: 500 });
    }
});