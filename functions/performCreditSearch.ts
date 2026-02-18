import { createClientFromRequest } from 'npm:@base44/sdk@0.8.6';

Deno.serve(async (req) => {
    try {
        const base44 = createClientFromRequest(req);
        const user = await base44.auth.me();

        if (!user) {
            return Response.json({ error: 'Unauthorized' }, { status: 401 });
        }

        const { bvn, searchId } = await req.json();

        if (!bvn || !searchId) {
            return Response.json({ error: 'BVN and searchId are required' }, { status: 400 });
        }

        // Verify searchId exists
        const existingSearch = await base44.asServiceRole.entities.CreditSearch.filter({ id: searchId });
        if (!existingSearch || existingSearch.length === 0) {
            return Response.json({ error: 'Search record not found' }, { status: 404 });
        }

        const CRC_USERNAME = Deno.env.get('CRC_USERNAME');
        const CRC_PASSWORD = Deno.env.get('CRC_PASSWORD');

        if (!CRC_USERNAME || !CRC_PASSWORD) {
            return Response.json({ error: 'CRC credentials not configured' }, { status: 500 });
        }

        // Prepare CRC request
        const requestPayload = {
            Request: JSON.stringify({
                '@REQUEST_ID': '1',
                'REQUEST_PARAMETERS': {
                    'REPORT_PARAMETERS': {
                        '@REPORT_ID': '101',
                        '@SUBJECT_TYPE': '1',
                        '@RESPONSE_TYPE': '5'
                    },
                    'INQUIRY_REASON': {
                        '@CODE': '1'
                    },
                    'APPLICATION': {
                        '@PRODUCT': '017',
                        '@NUMBER': searchId.toString(),
                        '@AMOUNT': '15000',
                        '@CURRENCY': 'NGN'
                    }
                },
                'SEARCH_PARAMETERS': {
                    '@SEARCH-TYPE': '4',
                    'BVN_NO': bvn
                }
            }).replace(/"/g, "'"),
            UserName: CRC_USERNAME,
            Password: CRC_PASSWORD
        };

        // Call CRC API
        const crcResponse = await fetch(
            'https://webserver.creditreferencenigeria.net/JsonLiveRequest/JsonService.svc/CIRRequest/ProcessRequestJson',
            {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify(requestPayload)
            }
        );

        if (!crcResponse.ok) {
            throw new Error(`CRC API error: ${crcResponse.status}`);
        }

        const crcData = await crcResponse.json();
        
        // Log the full response for debugging
        console.log('CRC API Response:', JSON.stringify(crcData, null, 2));

        // Check for error response
        if (crcData.ErrorResponse) {
            const errorCode = crcData.ErrorResponse.BODY?.ERRORLIST?.[0];
            const errorDesc = crcData.ErrorResponse.HEADER?.RESPONSETYPE?.DESCRIPTION || 'Unknown error';
            
            await base44.asServiceRole.entities.CreditSearch.update(searchId, {
                search_date: new Date().toISOString(),
                search_status: 'unsuccessful',
                failure_reason: `CRC Error Code ${errorCode}: ${errorDesc}. This may be a test environment issue.`
            });
            
            return Response.json({
                success: false,
                error: `CRC API Error: ${errorDesc} (Code: ${errorCode})`,
                message: 'The credit bureau is currently in test environment. This may affect search results. If you are testing, this is expected. For production use, please ensure CRC credentials are configured for production.',
                errorCode: errorCode,
                isTestEnvironmentIssue: true
            });
        }

        // Check response type
        const responseCode = crcData.ConsumerSearchResultResponse?.HEADER?.RESPONSETYPE?.CODE;
        console.log('Response Code:', responseCode);

        // SCENARIO 1: Single Hit (CODE=1) - Direct credit report
        if (responseCode === '1') {
            const score = extractCreditScore(crcData);
            
            // Update database record
            const expiryDate = new Date();
            expiryDate.setDate(expiryDate.getDate() + 90);
            
            await base44.asServiceRole.entities.CreditSearch.update(searchId, {
                search_date: new Date().toISOString(),
                expiry_date: expiryDate.toISOString(),
                search_status: 'successful',
                bureau_score: score || 0,
                crc_reference: 'single_hit',
                bureau_response: crcData
            });
            
            return Response.json({
                success: true,
                responseType: 'single_hit',
                score: score,
                fullReport: crcData
            });
        }

        // SCENARIO 2: No Hit (CODE=2) - No data found
        if (responseCode === '2') {
            // Update database record
            await base44.asServiceRole.entities.CreditSearch.update(searchId, {
                search_date: new Date().toISOString(),
                search_status: 'unsuccessful',
                failure_reason: 'No credit history found for this BVN'
            });
            
            return Response.json({
                success: false,
                responseType: 'no_hit',
                message: 'No credit history found for this BVN'
            });
        }

        // SCENARIO 3: Multi Hit (CODE=3) - Need to merge
        if (responseCode === '3') {
            const referenceNo = crcData.ConsumerSearchResultResponse?.REFERENCENO;
            const searchResults = crcData.ConsumerSearchResultResponse?.BODY?.SEARCHRESULTLIST || [];

            if (!referenceNo || searchResults.length === 0) {
                throw new Error('Invalid multi-hit response');
            }

            // Select primary bureau ID (highest confidence score)
            const sortedResults = searchResults.sort((a, b) => 
                parseInt(b.CONFIDENCESCORE || '0') - parseInt(a.CONFIDENCESCORE || '0')
            );
            const primaryBureauId = sortedResults[0].BUREAUID;
            const bureauIds = searchResults.map(r => r.BUREAUID);

            // Perform merge request
            const mergePayload = {
                Request: JSON.stringify({
                    '@REQUEST_ID': '1',
                    'REQUEST_PARAMETERS': {
                        'APPLICATION': {
                            '@AMOUNT': '15000',
                            '@CURRENCY': 'NGN',
                            '@NUMBER': searchId.toString(),
                            '@PRODUCT': '017'
                        },
                        'INQUIRY_REASON': {
                            '@CODE': '1'
                        },
                        'REPORT_PARAMETERS': {
                            '@REPORT_ID': '101',
                            '@RESPONSE_TYPE': '5',
                            '@SUBJECT_TYPE': '1'
                        },
                        'REQUEST_REFERENCE': {
                            '@REFERENCE-NO': referenceNo,
                            'MERGE_REPORT': {
                                '@PRIMARY-BUREAU-ID': primaryBureauId,
                                'BUREAU_ID': bureauIds
                            }
                        }
                    }
                }).replace(/"/g, "'"),
                UserName: CRC_USERNAME,
                Password: CRC_PASSWORD
            };

            const mergeResponse = await fetch(
                'https://webserver.creditreferencenigeria.net/JsonLiveRequest/JsonService.svc/CIRRequest/ProcessRequestJson',
                {
                    method: 'POST',
                    headers: {
                        'Content-Type': 'application/json'
                    },
                    body: JSON.stringify(mergePayload)
                }
            );

            if (!mergeResponse.ok) {
                throw new Error(`CRC merge API error: ${mergeResponse.status}`);
            }

            const mergeData = await mergeResponse.json();
            const score = extractCreditScore(mergeData);

            // Update database record
            const expiryDate = new Date();
            expiryDate.setDate(expiryDate.getDate() + 90);
            
            await base44.asServiceRole.entities.CreditSearch.update(searchId, {
                search_date: new Date().toISOString(),
                expiry_date: expiryDate.toISOString(),
                search_status: 'successful',
                bureau_score: score || 0,
                crc_reference: 'multi_hit_merged',
                bureau_response: mergeData
            });

            return Response.json({
                success: true,
                responseType: 'multi_hit_merged',
                score: score,
                fullReport: mergeData,
                matchedRecords: searchResults.length
            });
        }

        // Unknown response type or error in response
        const errorMessage = crcData.ConsumerSearchResultResponse?.HEADER?.ERROR?.MESSAGE || 
                           crcData.ERROR?.MESSAGE || 
                           crcData.error || 
                           'Unknown error';
        
        await base44.asServiceRole.entities.CreditSearch.update(searchId, {
            search_date: new Date().toISOString(),
            search_status: 'unsuccessful',
            failure_reason: `CRC API Error: ${errorMessage} (Response Type: ${responseCode})`
        });
        
        return Response.json({
            success: false,
            error: `CRC API returned unexpected response: ${errorMessage}`,
            responseCode: responseCode,
            fullResponse: crcData
        });

    } catch (error) {
        console.error('Credit search error:', error);
        return Response.json({ 
            success: false,
            error: error.message 
        }, { status: 500 });
    }
});

// Helper function to extract credit score from CRC response
function extractCreditScore(crcData) {
    try {
        // Try multiple possible paths for the credit score
        let creditScore = null;
        
        // Path 1: ConsumerSearchResultResponse (single hit)
        creditScore = crcData.ConsumerSearchResultResponse?.BODY?.SCORE?.['@SCORE'];
        
        // Path 2: ConsumerHitResponse (merged)
        if (!creditScore) {
            creditScore = crcData.ConsumerHitResponse?.BODY?.CREDIT_SCORE_DETAILS?.CREDIT_SCORE_SUMMARY?.CREDIT_SCORE;
        }
        
        // Path 3: Direct CREDIT_SCORE
        if (!creditScore) {
            creditScore = crcData.CREDIT_SCORE_DETAILS?.CREDIT_SCORE_SUMMARY?.CREDIT_SCORE;
        }
        
        return creditScore ? parseInt(creditScore) : null;
    } catch (e) {
        console.error('Error extracting credit score:', e);
        return null;
    }
}