const express = require('express');
const { Server } = require('@modelcontextprotocol/sdk/server/index.js');
const { SSEServerTransport } = require('@modelcontextprotocol/sdk/server/sse.js');
const { CallToolRequestSchema, ListToolsRequestSchema } = require('@modelcontextprotocol/sdk/types.js');
const db = require('../db.cjs');

const router = express.Router();

function createMcpServer() {
    const server = new Server({
        name: 'knowledge-base-mcp',
        version: '1.0.0'
    }, {
        capabilities: {
            tools: {}
        }
    });

    server.setRequestHandler(ListToolsRequestSchema, async () => {
        return {
            tools: [
                {
                    name: 'get_author_post_counts',
                    description: 'Get the number of knowledge base posts grouped by author and time period (monthly, quarterly, half-yearly, yearly)',
                    inputSchema: {
                        type: 'object',
                        properties: {
                            period: {
                                type: 'string',
                                enum: ['monthly', 'quarterly', 'half-yearly', 'yearly'],
                                description: 'The time period to group by'
                            }
                        },
                        required: ['period']
                    }
                },
                {
                    name: 'get_knowledge_token_counts',
                    description: 'Get the token counts for knowledge base articles. Can be grouped by article, author, or time period.',
                    inputSchema: {
                        type: 'object',
                        properties: {
                            groupBy: {
                                type: 'string',
                                enum: ['article', 'author', 'monthly', 'quarterly', 'half-yearly', 'yearly'],
                                description: 'How to group the token counts'
                            }
                        },
                        required: ['groupBy']
                    }
                },
                {
                    name: 'get_knowledge_token_crosstab',
                    description: 'Get a cross-tabulation (pivot table) of input and output tokens for knowledge base articles, grouped by both time period (rows) and author (columns). Use this when the user asks for a cross-tabulated table.',
                    inputSchema: {
                        type: 'object',
                        properties: {
                            period: {
                                type: 'string',
                                enum: ['monthly', 'quarterly', 'half-yearly', 'yearly'],
                                description: 'The time period for rows'
                            }
                        },
                        required: ['period']
                    }
                }
            ]
        };
    });

    server.setRequestHandler(CallToolRequestSchema, async (request) => {
        const { name, arguments: args } = request.params;

        if (name === 'get_author_post_counts') {
            const period = args.period || 'monthly';
            let dateModifier = "strftime('%Y-%m', k.created_at)";
            if (period === 'yearly') dateModifier = "strftime('%Y', k.created_at)";
            else if (period === 'quarterly') dateModifier = "strftime('%Y-Q', k.created_at) || ((cast(strftime('%m', k.created_at) as integer) + 2) / 3)";
            else if (period === 'half-yearly') dateModifier = "strftime('%Y-H', k.created_at) || ((cast(strftime('%m', k.created_at) as integer) + 5) / 6)";

            return new Promise((resolve, reject) => {
                db.all(`
                    SELECT u.name as author, ${dateModifier} as period, COUNT(k.id) as post_count
                    FROM knowledge_articles k
                    LEFT JOIN users u ON k.author_id = u.id
                    GROUP BY u.name, period
                    ORDER BY period DESC, post_count DESC
                `, [], (err, rows) => {
                    if (err) resolve({ content: [{ type: 'text', text: `Error: ${err.message}` }] });
                    else resolve({ content: [{ type: 'text', text: JSON.stringify(rows, null, 2) }] });
                });
            });
        }

        if (name === 'get_knowledge_token_counts') {
            const groupBy = args.groupBy || 'article';
            
            let query = '';
            if (groupBy === 'article') {
                query = `SELECT k.id, k.title, u.name as author, k.token_count, k.input_tokens, k.output_tokens FROM knowledge_articles k LEFT JOIN users u ON k.author_id = u.id ORDER BY k.token_count DESC`;
            } else if (groupBy === 'author') {
                query = `SELECT u.name as author, SUM(k.token_count) as total_tokens, SUM(k.input_tokens) as total_input_tokens, SUM(k.output_tokens) as total_output_tokens FROM knowledge_articles k LEFT JOIN users u ON k.author_id = u.id GROUP BY u.name ORDER BY total_tokens DESC`;
            } else {
                let dateModifier = "strftime('%Y-%m', k.created_at)";
                if (groupBy === 'yearly') dateModifier = "strftime('%Y', k.created_at)";
                else if (groupBy === 'quarterly') dateModifier = "strftime('%Y-Q', k.created_at) || ((cast(strftime('%m', k.created_at) as integer) + 2) / 3)";
                else if (groupBy === 'half-yearly') dateModifier = "strftime('%Y-H', k.created_at) || ((cast(strftime('%m', k.created_at) as integer) + 5) / 6)";
                
                query = `SELECT ${dateModifier} as period, u.name as author, SUM(k.token_count) as total_tokens, SUM(k.input_tokens) as total_input_tokens, SUM(k.output_tokens) as total_output_tokens FROM knowledge_articles k LEFT JOIN users u ON k.author_id = u.id GROUP BY period, u.name ORDER BY period DESC, total_tokens DESC`;
            }

            return new Promise((resolve, reject) => {
                db.all(query, [], (err, rows) => {
                    if (err) resolve({ content: [{ type: 'text', text: `Error: ${err.message}` }] });
                    else resolve({ content: [{ type: 'text', text: JSON.stringify(rows, null, 2) }] });
                });
            });
        }

        if (name === 'get_knowledge_token_crosstab') {
            const period = args.period || 'monthly';
            
            let dateModifier = "strftime('%Y-%m', k.created_at)";
            if (period === 'yearly') dateModifier = "strftime('%Y', k.created_at)";
            else if (period === 'quarterly') dateModifier = "strftime('%Y-Q', k.created_at) || ((cast(strftime('%m', k.created_at) as integer) + 2) / 3)";
            else if (period === 'half-yearly') dateModifier = "strftime('%Y-H', k.created_at) || ((cast(strftime('%m', k.created_at) as integer) + 5) / 6)";

            const query = `
                SELECT 
                    ${dateModifier} as period, 
                    u.name as author, 
                    SUM(k.input_tokens) as input_tokens,
                    SUM(k.output_tokens) as output_tokens
                FROM knowledge_articles k 
                LEFT JOIN users u ON k.author_id = u.id 
                GROUP BY period, u.name 
                ORDER BY period ASC
            `;

            return new Promise((resolve, reject) => {
                db.all(query, [], (err, rows) => {
                    if (err) {
                        resolve({ content: [{ type: 'text', text: `Error: ${err.message}` }] });
                        return;
                    }
                    
                    const authorsSet = new Set();
                    const periodsMap = new Map();

                    rows.forEach(row => {
                        const author = row.author || 'Unknown';
                        authorsSet.add(author);
                        if (!periodsMap.has(row.period)) {
                            periodsMap.set(row.period, {});
                        }
                        periodsMap.get(row.period)[author] = {
                            input: row.input_tokens || 0,
                            output: row.output_tokens || 0
                        };
                    });

                    const authors = Array.from(authorsSet).sort();
                    
                    const columns = ['Period'];
                    authors.forEach(author => {
                        columns.push(`${author} (Input)`);
                        columns.push(`${author} (Output)`);
                    });
                    
                    const structuredData = {
                        instruction: "You MUST output exactly ONE markdown table. The table should represent a cross-tabulation where the rows are periods and the columns are the Input and Output tokens for each author. Use the exact columns provided. Show zeros for missing data.",
                        columns: columns,
                        table_data: []
                    };

                    const sortedPeriods = Array.from(periodsMap.keys()).sort();
                    sortedPeriods.forEach(period => {
                        const row = { Period: period };
                        
                        authors.forEach(author => {
                            const data = periodsMap.get(period)[author] || { input: 0, output: 0 };
                            row[`${author} (Input)`] = data.input;
                            row[`${author} (Output)`] = data.output;
                        });
                        
                        structuredData.table_data.push(row);
                    });

                    resolve({ content: [{ type: 'text', text: JSON.stringify(structuredData, null, 2) }] });
                });
            });
        }

        throw new Error(`Unknown tool: ${name}`);
    });

    return server;
}

let transports = new Map();

router.get('/sse', async (req, res) => {
    try {
        const server = createMcpServer();
        const transport = new SSEServerTransport('/api/mcp/knowledge/message', res);
        const sessionId = transport.sessionId;
        
        transports.set(sessionId, transport);
        
        // Connect transport to server
        await server.connect(transport);

        req.on('close', () => {
            transports.delete(sessionId);
            console.log(`SSE connection closed for session: ${sessionId}`);
        });
    } catch (e) {
        console.error("Failed to connect MCP server:", e);
        res.status(500).send("Failed to start SSE");
    }
});

router.post('/message', async (req, res) => {
    const sessionId = req.query.sessionId;
    const transport = transports.get(sessionId);
    if (!transport) {
        return res.status(400).send('SSE session not found');
    }
    await transport.handlePostMessage(req, res, req.body);
});

module.exports = { router };
