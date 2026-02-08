import { createClientFromRequest } from 'npm:@base44/sdk@0.8.6';

Deno.serve(async (req) => {
    try {
        const base44 = createClientFromRequest(req);
        const user = await base44.auth.me();

        if (!user) {
            return Response.json({ error: 'Unauthorized' }, { status: 401 });
        }

        const { authorization_code, email, amount, metadata } = await req.json();

        if (!authorization_code || !email || !amount) {
            return Response.json({ error: 'Authorization code, email and amount are required' }, { status: 400 });
        }

        const PAYSTACK_SECRET_KEY = Deno.env.get('PAYSTACK_SECRET_KEY');

        if (!PAYSTACK_SECRET_KEY) {
            return Response.json({ error: 'Paystack not configured' }, { status: 500 });
        }

        // Charge authorization
        const response = await fetch('https://api.paystack.co/transaction/charge_authorization', {
            method: 'POST',
            headers: {
                'Authorization': `Bearer ${PAYSTACK_SECRET_KEY}`,
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({
                authorization_code: authorization_code,
                email: email,
                amount: amount * 100, // Convert to kobo
                metadata: metadata || {}
            })
        });

        if (!response.ok) {
            const errorData = await response.json();
            throw new Error(errorData.message || 'Charge failed');
        }

        const data = await response.json();

        return Response.json({
            success: data.data.status === 'success',
            status: data.data.status,
            reference: data.data.reference,
            amount: data.data.amount / 100,
            message: data.message
        });

    } catch (error) {
        console.error('Charge authorization error:', error);
        return Response.json({ 
            success: false,
            error: error.message 
        }, { status: 500 });
    }
});