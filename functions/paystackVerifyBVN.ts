import { createClientFromRequest } from 'npm:@base44/sdk@0.8.6';

Deno.serve(async (req) => {
    try {
        const base44 = createClientFromRequest(req);
        const user = await base44.auth.me();

        if (!user) {
            return Response.json({ error: 'Unauthorized' }, { status: 401 });
        }

        const body = await req.json();
        const { bvn } = body;

        if (!bvn || bvn.length !== 11) {
            return Response.json({ 
                success: false, 
                error: 'BVN must be 11 digits' 
            }, { status: 400 });
        }

        const paystackKey = Deno.env.get('PAYSTACK_SECRET_KEY');
        if (!paystackKey) {
            return Response.json({ 
                success: false, 
                error: 'Payment service not configured' 
            }, { status: 500 });
        }

        // Call Paystack BVN verification API
        const response = await fetch(`https://api.paystack.co/bvn/resolve/${bvn}`, {
            method: 'GET',
            headers: {
                'Authorization': `Bearer ${paystackKey}`,
                'Content-Type': 'application/json'
            }
        });

        const data = await response.json();

        if (!response.ok || !data.status) {
            return Response.json({ 
                success: false, 
                error: data.message || 'BVN verification failed' 
            }, { status: 400 });
        }

        // Extract BVN data
        const bvnData = data.data;
        
        // Handle different BVN data formats
        let fullName = bvnData.full_name || 
                       `${bvnData.first_name || ''} ${bvnData.middle_name || ''} ${bvnData.last_name || ''}`.trim();
        
        // If still no full name, try combining available names
        if (!fullName) {
            fullName = [bvnData.first_name, bvnData.middle_name, bvnData.last_name]
                .filter(Boolean)
                .join(' ');
        }
        
        return Response.json({ 
            success: true,
            data: {
                first_name: bvnData.first_name || '',
                last_name: bvnData.last_name || '',
                middle_name: bvnData.middle_name || '',
                full_name: fullName,
                phone_number: bvnData.phone_number || bvnData.mobile || '',
                date_of_birth: bvnData.date_of_birth || bvnData.dob || '',
                gender: bvnData.gender?.toLowerCase() || ''
            }
        });

    } catch (error) {
        console.error('BVN verification error:', error);
        return Response.json({ 
            success: false, 
            error: error.message 
        }, { status: 500 });
    }
});