import { createClientFromRequest } from 'npm:@base44/sdk@0.8.6';

Deno.serve(async (req) => {
    try {
        const base44 = createClientFromRequest(req);
        const user = await base44.auth.me();

        if (user?.role !== 'admin') {
            return Response.json({ error: 'Forbidden: Admin access required' }, { status: 403 });
        }

        const { loan_id } = await req.json();

        if (!loan_id) {
            return Response.json({ error: 'loan_id is required' }, { status: 400 });
        }

        const PAYSTACK_SECRET_KEY = Deno.env.get('PAYSTACK_SECRET_KEY');

        if (!PAYSTACK_SECRET_KEY) {
            return Response.json({ error: 'Paystack not configured' }, { status: 500 });
        }

        // Get loan details
        const loan = await base44.asServiceRole.entities.LoanApplication.filter({ id: loan_id });
        if (!loan[0]) {
            return Response.json({ error: 'Loan not found' }, { status: 404 });
        }

        const loanData = loan[0];

        // Check if loan is disbursed and due
        if (loanData.status !== 'disbursed' && loanData.status !== 'overdue') {
            return Response.json({ 
                success: false,
                message: 'Loan must be disbursed or overdue to collect' 
            });
        }

        // Get active mandate
        const mandates = await base44.asServiceRole.entities.DirectDebitMandate.filter({
            loan_id: loan_id,
            status: 'active'
        });

        if (!mandates[0]) {
            return Response.json({ error: 'No active mandate found for this loan' }, { status: 404 });
        }

        const mandate = mandates[0];

        // Calculate outstanding amount
        const outstandingAmount = loanData.total_repayment;

        // Create collection transaction record
        const collectionLog = await base44.asServiceRole.entities.CollectionTransaction.create({
            loan_id: loan_id,
            user_id: loanData.user_id,
            mandate_id: mandate.id,
            amount: outstandingAmount,
            collection_type: 'auto_debit',
            status: 'processing',
            authorization_code: mandate.mandate_reference,
            initiated_by: 'system'
        });

        // Get user details
        const userData = await base44.asServiceRole.entities.User.filter({ id: loanData.user_id });
        const userEmail = userData[0]?.email;

        // Charge authorization using Paystack
        const chargeResponse = await fetch('https://api.paystack.co/transaction/charge_authorization', {
            method: 'POST',
            headers: {
                'Authorization': `Bearer ${PAYSTACK_SECRET_KEY}`,
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({
                authorization_code: mandate.mandate_reference,
                email: userEmail,
                amount: Math.round(outstandingAmount * 100), // Convert to kobo
                metadata: {
                    loan_id: loan_id,
                    collection_log_id: collectionLog.id,
                    type: 'loan_repayment'
                }
            })
        });

        const chargeData = await chargeResponse.json();

        if (chargeData.status && chargeData.data.status === 'success') {
            // Update collection log - successful
            await base44.asServiceRole.entities.CollectionTransaction.update(collectionLog.id, {
                status: 'successful',
                paystack_reference: chargeData.data.reference,
                gateway_response: chargeData.data.gateway_response
            });

            // Update loan status
            await base44.asServiceRole.entities.LoanApplication.update(loan_id, {
                status: 'repaid',
                repayment_date: new Date().toISOString()
            });

            // Update credit limit - increase for successful repayment
            const creditLimits = await base44.asServiceRole.entities.UserCreditLimit.filter({
                user_id: loanData.user_id
            });

            if (creditLimits[0]) {
                const creditLimit = creditLimits[0];
                const loanConfig = await base44.asServiceRole.entities.LoanConfig.filter({ config_key: 'default' });
                const incrementPercent = loanConfig[0]?.urgent_10k_increment_percent || 20;
                const newLimit = Math.round(creditLimit.current_limit * (1 + incrementPercent / 100));

                await base44.asServiceRole.entities.UserCreditLimit.update(creditLimit.id, {
                    successful_repayments: (creditLimit.successful_repayments || 0) + 1,
                    current_limit: newLimit
                });
            }

            // Update mandate
            await base44.asServiceRole.entities.DirectDebitMandate.update(mandate.id, {
                last_debit_date: new Date().toISOString(),
                last_debit_amount: outstandingAmount,
                total_debited: (mandate.total_debited || 0) + outstandingAmount
            });

            return Response.json({
                success: true,
                message: 'Collection successful',
                reference: chargeData.data.reference,
                amount: outstandingAmount
            });

        } else {
            // Update collection log - failed
            const failureReason = chargeData.message || chargeData.data?.gateway_response || 'Charge failed';
            
            await base44.asServiceRole.entities.CollectionTransaction.update(collectionLog.id, {
                status: 'failed',
                failure_reason: failureReason,
                gateway_response: chargeData.data?.gateway_response
            });

            // Update mandate failed attempts
            await base44.asServiceRole.entities.DirectDebitMandate.update(mandate.id, {
                failed_attempts: (mandate.failed_attempts || 0) + 1
            });

            // Mark loan as overdue if not already
            if (loanData.status === 'disbursed') {
                await base44.asServiceRole.entities.LoanApplication.update(loan_id, {
                    status: 'overdue'
                });
            }

            // Schedule retry in 3 days
            const retryDate = new Date();
            retryDate.setDate(retryDate.getDate() + 3);

            await base44.asServiceRole.entities.CollectionTransaction.update(collectionLog.id, {
                retry_scheduled_at: retryDate.toISOString()
            });

            return Response.json({
                success: false,
                message: 'Collection failed',
                reason: failureReason,
                retry_scheduled_at: retryDate.toISOString()
            });
        }

    } catch (error) {
        console.error('Auto collect error:', error);
        return Response.json({ 
            success: false,
            error: error.message 
        }, { status: 500 });
    }
});