import { createClientFromRequest } from 'npm:@base44/sdk@0.8.6';

Deno.serve(async (req) => {
    try {
        const base44 = createClientFromRequest(req);
        const user = await base44.auth.me();

        if (!user) {
            return Response.json({ error: 'Unauthorized' }, { status: 401 });
        }

        const { amount, metadata, callback_url } = await req.json();

        if (!Number.isFinite(amount) || amount <= 0) {
            return Response.json({ error: 'A valid amount is required' }, { status: 400 });
        }

        const PAYSTACK_SECRET_KEY = Deno.env.get('PAYSTACK_SECRET_KEY');

        if (!PAYSTACK_SECRET_KEY) {
            return Response.json({ error: 'Paystack not configured' }, { status: 500 });
        }

        // Initialize Paystack payment
        const response = await fetch('https://api.paystack.co/transaction/initialize', {
            method: 'POST',
            headers: {
                'Authorization': `Bearer ${PAYSTACK_SECRET_KEY}`,
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({
                email: user.email,
                amount: Math.round(amount * 100), // Convert to integer kobo
                metadata: {
                    ...(metadata || {}),
                    user_id: user.id,
                    custom_fields: [
                        {
                            display_name: "Source",
                            variable_name: "source",
                            value: "Base44_mvp"
                        }
                    ]
                },
                callback_url: callback_url || undefined
            })
        });

        if (!response.ok) {
            const errorData = await response.json();
            throw new Error(errorData.message || 'Payment initialization failed');
        }

        const data = await response.json();

        return Response.json({
            success: true,
            authorization_url: data.data.authorization_url,
            access_code: data.data.access_code,
            reference: data.data.reference
        });

    } catch (error) {
        console.error('Payment initialization error:', error);
        return Response.json({ 
            success: false,
            error: error.message 
        }, { status: 500 });
    }
});
