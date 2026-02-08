import { createClientFromRequest } from 'npm:@base44/sdk@0.8.6';

Deno.serve(async (req) => {
    try {
        const base44 = createClientFromRequest(req);
        const user = await base44.auth.me();

        if (user?.role !== 'admin') {
            return Response.json({ error: 'Forbidden: Admin access required' }, { status: 403 });
        }

        // Get all disbursed loans
        const disbursedLoans = await base44.asServiceRole.entities.LoanApplication.filter({
            status: 'disbursed'
        });

        const today = new Date();
        const results = {
            total_checked: disbursedLoans.length,
            due_today: 0,
            collections_attempted: 0,
            collections_successful: 0,
            collections_failed: 0,
            loans_processed: []
        };

        for (const loan of disbursedLoans) {
            if (!loan.due_date) continue;

            const dueDate = new Date(loan.due_date);
            
            // Check if loan is due today or overdue
            if (dueDate <= today) {
                results.due_today++;
                
                try {
                    // Attempt collection
                    const collectionResponse = await base44.asServiceRole.functions.invoke('autoCollectLoan', {
                        loan_id: loan.id
                    });

                    results.collections_attempted++;

                    if (collectionResponse.data.success) {
                        results.collections_successful++;
                        results.loans_processed.push({
                            loan_id: loan.id,
                            user_id: loan.user_id,
                            amount: loan.total_repayment,
                            status: 'success'
                        });
                    } else {
                        results.collections_failed++;
                        results.loans_processed.push({
                            loan_id: loan.id,
                            user_id: loan.user_id,
                            amount: loan.total_repayment,
                            status: 'failed',
                            reason: collectionResponse.data.reason
                        });
                    }
                } catch (error) {
                    results.collections_failed++;
                    results.loans_processed.push({
                        loan_id: loan.id,
                        user_id: loan.user_id,
                        status: 'error',
                        error: error.message
                    });
                }
            }
        }

        // Also process scheduled retries
        const failedCollections = await base44.asServiceRole.entities.CollectionTransaction.filter({
            status: 'failed'
        });

        const retryResults = {
            retries_attempted: 0,
            retries_successful: 0,
            retries_failed: 0
        };

        for (const collection of failedCollections) {
            if (!collection.retry_scheduled_at) continue;
            
            const retryDate = new Date(collection.retry_scheduled_at);
            
            if (retryDate <= today && collection.attempt_number < 3) {
                retryResults.retries_attempted++;
                
                try {
                    const retryResponse = await base44.asServiceRole.functions.invoke('autoCollectLoan', {
                        loan_id: collection.loan_id
                    });

                    if (retryResponse.data.success) {
                        retryResults.retries_successful++;
                    } else {
                        retryResults.retries_failed++;
                    }
                } catch (error) {
                    retryResults.retries_failed++;
                }
            }
        }

        return Response.json({
            success: true,
            message: 'Due loans processed',
            results: {
                ...results,
                ...retryResults
            },
            processed_at: new Date().toISOString()
        });

    } catch (error) {
        console.error('Process due loans error:', error);
        return Response.json({ 
            success: false,
            error: error.message 
        }, { status: 500 });
    }
});