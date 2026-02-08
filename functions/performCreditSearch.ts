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

        // Check response type
        const responseCode = crcData.ConsumerSearchResultResponse?.HEADER?.RESPONSETYPE?.CODE;

        // SCENARIO 1: Single Hit (CODE=1) - Direct credit report
        if (responseCode === '1') {
            const score = extractCreditScore(crcData);
            return Response.json({
                success: true,
                responseType: 'single_hit',
                score: score,
                fullReport: crcData
            });
        }

        // SCENARIO 2: No Hit (CODE=2) - No data found
        if (responseCode === '2') {
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

            return Response.json({
                success: true,
                responseType: 'multi_hit_merged',
                score: score,
                fullReport: mergeData,
                matchedRecords: searchResults.length
            });
        }

        // Unknown response type
        throw new Error(`Unknown CRC response type: ${responseCode}`);

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
        // CRC Basic Premium Report contains the score
        const creditScore = crcData.ConsumerSearchResultResponse?.BODY?.SCORE?.['@SCORE'];
        return creditScore ? parseInt(creditScore) : null;
    } catch (e) {
        return null;
    }
}