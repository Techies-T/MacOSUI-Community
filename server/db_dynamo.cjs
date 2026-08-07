const {
    PutCommand,
    GetCommand,
    QueryCommand,
    ScanCommand,
    DeleteCommand,
    UpdateCommand
} = require('@aws-sdk/lib-dynamodb');
const { docClient, TABLE_PREFIX } = require('./dynamo.cjs');
const { encrypt, decrypt } = require('./crypto.cjs');
const crypto = require('crypto');

// Helper to check if a setting key is sensitive
const isSensitiveKey = (key) => {
    return key.includes('SECRET') || key.includes('KEY') || key.includes('TOKEN');
};

const db = {};

// --- Settings ---
db.getSetting = async (key) => {
    const params = {
        TableName: `${TABLE_PREFIX}settings`,
        Key: { key }
    };
    try {
        const result = await docClient.send(new GetCommand(params));
        const row = result.Item;
        if (!row) return null;

        if (isSensitiveKey(key) && row.value) {
            try {
                return decrypt(row.value);
            } catch (e) {
                console.error(`Failed to decrypt ${key}, returning raw value`);
                return row.value;
            }
        }
        return row.value;
    } catch (err) {
        console.error("DynamoDB getSetting error:", err);
        throw err;
    }
};

db.setSetting = async (key, value) => {
    let finalValue = value;
    if (value && isSensitiveKey(key)) {
        finalValue = encrypt(value);
    }

    const params = {
        TableName: `${TABLE_PREFIX}settings`,
        Item: {
            key,
            value: finalValue
        }
    };
    try {
        await docClient.send(new PutCommand(params));
    } catch (err) {
        console.error("DynamoDB setSetting error:", err);
        throw err;
    }
};

// --- Users ---
db.getUser = async (id) => {
    const params = {
        TableName: `${TABLE_PREFIX}users`,
        Key: { id }
    };
    const result = await docClient.send(new GetCommand(params));
    return result.Item;
};

db.getUserByGoogleId = async (google_id) => {
    const params = {
        TableName: `${TABLE_PREFIX}users`,
        FilterExpression: 'google_id = :google_id',
        ExpressionAttributeValues: {
            ':google_id': google_id
        }
    };
    const result = await docClient.send(new ScanCommand(params));
    return result.Items && result.Items.length > 0 ? result.Items[0] : null;
};

db.getUserByEmail = async (email) => {
    const params = {
        TableName: `${TABLE_PREFIX}users`,
        FilterExpression: 'email = :email',
        ExpressionAttributeValues: {
            ':email': email
        }
    };
    const result = await docClient.send(new ScanCommand(params));
    return result.Items && result.Items.length > 0 ? result.Items[0] : null;
};

db.createUser = async (user) => {
    const params = {
        TableName: `${TABLE_PREFIX}users`,
        Item: user
    };
    await docClient.send(new PutCommand(params));
    return user;
};

db.updateUser = async (id, updateFields) => {
    if (!updateFields || Object.keys(updateFields).length === 0) return;
    
    let updateExpression = 'SET';
    const expressionAttributeNames = {};
    const expressionAttributeValues = {};
    
    let prefix = ' ';
    for (const [key, value] of Object.entries(updateFields)) {
        updateExpression += `${prefix}#${key} = :${key}`;
        expressionAttributeNames[`#${key}`] = key;
        expressionAttributeValues[`:${key}`] = value;
        prefix = ', ';
    }
    
    const params = {
        TableName: `${TABLE_PREFIX}users`,
        Key: { id },
        UpdateExpression: updateExpression,
        ExpressionAttributeNames: expressionAttributeNames,
        ExpressionAttributeValues: expressionAttributeValues,
        ReturnValues: 'ALL_NEW'
    };
    const result = await docClient.send(new UpdateCommand(params));
    return result.Attributes;
};

db.deleteUser = async (id) => {
    const params = {
        TableName: `${TABLE_PREFIX}users`,
        Key: { id }
    };
    await docClient.send(new DeleteCommand(params));
};

db.getAllUsers = async () => {
    const params = {
        TableName: `${TABLE_PREFIX}users`
    };
    const result = await docClient.send(new ScanCommand(params));
    return result.Items || [];
};

// --- Invitations ---
db.getInvitation = async (email) => {
    const params = {
        TableName: `${TABLE_PREFIX}invitations`,
        Key: { email }
    };
    const result = await docClient.send(new GetCommand(params));
    return result.Item;
};

db.createInvitation = async (invitation) => {
    const params = {
        TableName: `${TABLE_PREFIX}invitations`,
        Item: invitation
    };
    await docClient.send(new PutCommand(params));
    return invitation;
};

db.deleteInvitation = async (email) => {
    const params = {
        TableName: `${TABLE_PREFIX}invitations`,
        Key: { email }
    };
    await docClient.send(new DeleteCommand(params));
};

// --- Generic CRUD generator for other tables with 'id' as Primary Key ---
const createCrudForTable = (tableName) => {
    const capitalizedName = tableName.split('_').map(part => part.charAt(0).toUpperCase() + part.slice(1)).join('');
    
    db[`get${capitalizedName}`] = async (id) => {
        const params = {
            TableName: `${TABLE_PREFIX}${tableName}`,
            Key: { id }
        };
        const result = await docClient.send(new GetCommand(params));
        return result.Item;
    };
    
    db[`create${capitalizedName}`] = async (item) => {
        const params = {
            TableName: `${TABLE_PREFIX}${tableName}`,
            Item: item
        };
        await docClient.send(new PutCommand(params));
        return item;
    };
    
    db[`update${capitalizedName}`] = async (id, updateFields) => {
        if (!updateFields || Object.keys(updateFields).length === 0) return;
        let updateExpression = 'SET';
        const expressionAttributeNames = {};
        const expressionAttributeValues = {};
        let prefix = ' ';
        for (const [key, value] of Object.entries(updateFields)) {
            updateExpression += `${prefix}#${key} = :${key}`;
            expressionAttributeNames[`#${key}`] = key;
            expressionAttributeValues[`:${key}`] = value;
            prefix = ', ';
        }
        const params = {
            TableName: `${TABLE_PREFIX}${tableName}`,
            Key: { id },
            UpdateExpression: updateExpression,
            ExpressionAttributeNames: expressionAttributeNames,
            ExpressionAttributeValues: expressionAttributeValues,
            ReturnValues: 'ALL_NEW'
        };
        const result = await docClient.send(new UpdateCommand(params));
        return result.Attributes;
    };
    
    db[`delete${capitalizedName}`] = async (id) => {
        const params = {
            TableName: `${TABLE_PREFIX}${tableName}`,
            Key: { id }
        };
        await docClient.send(new DeleteCommand(params));
    };

    db[`getAll${capitalizedName}`] = async () => {
        const params = {
            TableName: `${TABLE_PREFIX}${tableName}`
        };
        const result = await docClient.send(new ScanCommand(params));
        return result.Items || [];
    };
};

const tablesWithIdPK = [
    'deep_research_history',
    'deep_research_workflows',
    'deep_research_workflow_definitions',
    'published_reports',
    'rag_queries',
    'memos',
    'knowledge_articles',
    'skills',
    'mcp_servers',
    'pods',
    'dm_messages'
];

tablesWithIdPK.forEach(createCrudForTable);

// --- RAG Files (Primary Key is drive_file_id) ---
db.getRagFile = async (drive_file_id) => {
    const params = {
        TableName: `${TABLE_PREFIX}rag_files`,
        Key: { drive_file_id }
    };
    const result = await docClient.send(new GetCommand(params));
    return result.Item;
};
db.createRagFile = async (item) => {
    const params = {
        TableName: `${TABLE_PREFIX}rag_files`,
        Item: item
    };
    await docClient.send(new PutCommand(params));
    return item;
};
db.updateRagFile = async (drive_file_id, updateFields) => {
    if (!updateFields || Object.keys(updateFields).length === 0) return;
    let updateExpression = 'SET';
    const expressionAttributeNames = {};
    const expressionAttributeValues = {};
    let prefix = ' ';
    for (const [key, value] of Object.entries(updateFields)) {
        updateExpression += `${prefix}#${key} = :${key}`;
        expressionAttributeNames[`#${key}`] = key;
        expressionAttributeValues[`:${key}`] = value;
        prefix = ', ';
    }
    const params = {
        TableName: `${TABLE_PREFIX}rag_files`,
        Key: { drive_file_id },
        UpdateExpression: updateExpression,
        ExpressionAttributeNames: expressionAttributeNames,
        ExpressionAttributeValues: expressionAttributeValues,
        ReturnValues: 'ALL_NEW'
    };
    const result = await docClient.send(new UpdateCommand(params));
    return result.Attributes;
};
db.deleteRagFile = async (drive_file_id) => {
    const params = {
        TableName: `${TABLE_PREFIX}rag_files`,
        Key: { drive_file_id }
    };
    await docClient.send(new DeleteCommand(params));
};
db.getAllRagFiles = async () => {
    const params = {
        TableName: `${TABLE_PREFIX}rag_files`
    };
    const result = await docClient.send(new ScanCommand(params));
    return result.Items || [];
};

// --- User Preferences (Primary Key is user_id) ---
db.getUserPreference = async (user_id) => {
    const params = {
        TableName: `${TABLE_PREFIX}user_preferences`,
        Key: { user_id }
    };
    const result = await docClient.send(new GetCommand(params));
    return result.Item;
};
db.createUserPreference = async (item) => {
    const params = {
        TableName: `${TABLE_PREFIX}user_preferences`,
        Item: item
    };
    await docClient.send(new PutCommand(params));
    return item;
};
db.updateUserPreference = async (user_id, updateFields) => {
    if (!updateFields || Object.keys(updateFields).length === 0) return;
    let updateExpression = 'SET';
    const expressionAttributeNames = {};
    const expressionAttributeValues = {};
    let prefix = ' ';
    for (const [key, value] of Object.entries(updateFields)) {
        updateExpression += `${prefix}#${key} = :${key}`;
        expressionAttributeNames[`#${key}`] = key;
        expressionAttributeValues[`:${key}`] = value;
        prefix = ', ';
    }
    const params = {
        TableName: `${TABLE_PREFIX}user_preferences`,
        Key: { user_id },
        UpdateExpression: updateExpression,
        ExpressionAttributeNames: expressionAttributeNames,
        ExpressionAttributeValues: expressionAttributeValues,
        ReturnValues: 'ALL_NEW'
    };
    const result = await docClient.send(new UpdateCommand(params));
    return result.Attributes;
};
db.deleteUserPreference = async (user_id) => {
    const params = {
        TableName: `${TABLE_PREFIX}user_preferences`,
        Key: { user_id }
    };
    await docClient.send(new DeleteCommand(params));
};

// Auto-Activation Logic
async function autoActivate() {
    try {
        console.log("DEBUG: autoActivate started!");
        const existingPolicies = await db.getSetting('RBAC_POLICIES');
        if (!existingPolicies) {
            console.log('DEBUG: Initializing default RBAC policies...');
            const defaultPolicies = JSON.stringify({
                "admin": {
                    "name": "Admin",
                    "allowed_widgets": ["*"],
                    "allowed_models": ["*"],
                    "allowed_actions": ["*"]
                },
                "researcher": {
                    "name": "Researcher",
                    "allowed_widgets": ["app:deep-research", "app:knowledge-base", "app:gemini", "app:browser", "app:finder", "app:stickies", "app:notes", "app:calendar", "app:calculator", "app:html-editor", "app:virtual-office", "app:dm-chat"],
                    "allowed_models": ["*"],
                    "allowed_actions": ["action:generate_infographic", "action:use_mcp_tools"]
                },
                "manager": {
                    "name": "Manager",
                    "allowed_widgets": ["app:knowledge-base", "app:finder", "app:stickies", "app:notes", "app:calendar", "app:calculator", "app:html-editor", "app:browser", "app:virtual-office", "app:dm-chat"],
                    "allowed_models": ["*"],
                    "allowed_actions": ["action:manage_assistant_rules"]
                },
                "hr": {
                    "name": "HR (Human Resources)",
                    "allowed_widgets": ["app:knowledge-base", "app:finder", "app:stickies", "app:notes", "app:calendar", "app:calculator", "app:html-editor", "app:browser", "app:virtual-office", "app:dm-chat"],
                    "allowed_models": ["*"],
                    "allowed_actions": ["action:manage_work_policy"]
                },
                "user": {
                    "name": "General User",
                    "allowed_widgets": ["app:knowledge-base", "app:finder", "app:stickies", "app:notes", "app:calendar", "app:calculator", "app:html-editor", "app:browser", "app:virtual-office", "app:dm-chat"],
                    "allowed_models": ["model:gemini-flash"],
                    "allowed_actions": []
                },
                "guest": {
                    "name": "External Guest",
                    "allowed_widgets": ["app:finder", "app:stickies", "app:notes", "app:calendar", "app:calculator", "app:browser", "app:virtual-office", "app:dm-chat"],
                    "allowed_models": [],
                    "allowed_actions": []
                }
            });
            await db.setSetting('RBAC_POLICIES', defaultPolicies);
        } else {
            try {
                const policies = JSON.parse(existingPolicies);
                let updated = false;

                if (!policies.manager) {
                    policies.manager = {
                        "name": "Manager",
                        "allowed_widgets": ["app:knowledge-base", "app:finder", "app:stickies", "app:notes", "app:calendar", "app:calculator", "app:html-editor", "app:browser", "app:virtual-office", "app:dm-chat"],
                        "allowed_models": ["*"],
                        "allowed_actions": ["action:manage_assistant_rules"]
                    };
                    updated = true;
                }

                if (!policies.hr) {
                    policies.hr = {
                        "name": "HR (Human Resources)",
                        "allowed_widgets": ["app:knowledge-base", "app:finder", "app:stickies", "app:notes", "app:calendar", "app:calculator", "app:html-editor", "app:browser", "app:virtual-office", "app:dm-chat"],
                        "allowed_models": ["*"],
                        "allowed_actions": ["action:manage_work_policy"]
                    };
                    updated = true;
                }

                if (!policies.guest) {
                    policies.guest = {
                        "name": "External Guest",
                        "allowed_widgets": ["app:finder", "app:stickies", "app:notes", "app:calendar", "app:calculator", "app:browser", "app:virtual-office", "app:dm-chat"],
                        "allowed_models": [],
                        "allowed_actions": []
                    };
                    updated = true;
                }
                
                ['researcher', 'user', 'manager', 'hr', 'guest'].forEach(roleKey => {
                    if (policies[roleKey] && policies[roleKey].allowed_widgets) {
                        const widgets = policies[roleKey].allowed_widgets;
                        if (!widgets.includes('app:virtual-office')) {
                            widgets.push('app:virtual-office');
                            updated = true;
                        }
                        if (!widgets.includes('app:dm-chat')) {
                            widgets.push('app:dm-chat');
                            updated = true;
                        }
                    }
                });

                if (policies.researcher && policies.researcher.allowed_widgets) {
                    const researcherWidgets = policies.researcher.allowed_widgets;
                    if (!researcherWidgets.includes('*') && !researcherWidgets.includes('app:deep-research')) {
                        researcherWidgets.unshift('app:deep-research');
                        updated = true;
                        console.log('DEBUG: Migrated researcher role - added app:deep-research to allowed_widgets');
                    }
                }

                if (updated) {
                    console.log('DEBUG: Updating existing RBAC policies with manager and hr roles...');
                    await db.setSetting('RBAC_POLICIES', JSON.stringify(policies));
                }
            } catch (err) {
                console.error("Failed to migrate RBAC policies:", err);
            }
        }

        console.log("DEBUG: Checking environment variables for auto-configuration...");
        const existingClientId = await db.getSetting('GOOGLE_CLIENT_ID');
        const envClientId = process.env.VITE_GOOGLE_CLIENT_ID || process.env.GOOGLE_CLIENT_ID;
        const envClientSecret = process.env.GOOGLE_CLIENT_SECRET;

        if ((!existingClientId || existingClientId === '') && envClientId && envClientSecret) {
            console.log('DEBUG: Auto-activating system based on Environment Variables...');
            await db.setSetting('GOOGLE_CLIENT_ID', envClientId);
            await db.setSetting('GOOGLE_CLIENT_SECRET', envClientSecret);
            console.log('DEBUG: Auto-activation of Google OAuth complete.');
        }

        if (process.env.GEMINI_API_KEY) {
            const existingGemini = await db.getSetting('GEMINI_API_KEY');
            if (!existingGemini) {
                await db.setSetting('GEMINI_API_KEY', process.env.GEMINI_API_KEY);
                console.log('DEBUG: Auto-configured GEMINI_API_KEY from environment.');
            }
        }
        
        if (process.env.MCP_CLIENT_ID && process.env.MCP_CLIENT_SECRET) {
            const existingMcpId = await db.getSetting('MCP_CLIENT_ID');
            if (!existingMcpId) {
                await db.setSetting('MCP_CLIENT_ID', process.env.MCP_CLIENT_ID);
                await db.setSetting('MCP_CLIENT_SECRET', process.env.MCP_CLIENT_SECRET);
                if (process.env.MCP_SERVER_ENDPOINT) {
                    await db.setSetting('MCP_SERVER_ENDPOINT', process.env.MCP_SERVER_ENDPOINT);
                }
                console.log('DEBUG: Auto-configured MCP Credentials from environment.');
            }
        }

        console.log("DEBUG: Checking mcpCount...");
        const mcpServers = await db.getAllMcpServers();
        const mcpCount = mcpServers.length;
        console.log("DEBUG: mcpCount fetched:", mcpCount);

        if (mcpCount === 0) {
            const endpointUrl = await db.getSetting('MCP_SERVER_ENDPOINT');
            if (endpointUrl) {
                console.log('DEBUG: Migrating existing MCP settings to mcp_servers table...');
                const tokenUrl = await db.getSetting('MCP_TOKEN_URL');
                const clientId = await db.getSetting('MCP_CLIENT_ID');
                const clientSecret = await db.getSetting('MCP_CLIENT_SECRET');
                
                let encryptedSecret = null;
                if (clientSecret) {
                    encryptedSecret = encrypt(clientSecret);
                }

                await db.createMcpServer({
                    id: Date.now(), // or random ID
                    name: 'AppRunner MCP (Migrated)',
                    endpoint_url: endpointUrl,
                    token_url: tokenUrl,
                    client_id: clientId,
                    client_secret: encryptedSecret,
                    created_at: new Date().toISOString(),
                    updated_at: new Date().toISOString()
                });
                console.log('DEBUG: MCP settings migrated successfully.');
            }
        }

        console.log("DEBUG: Checking kbMcpCount...");
        const kbMcpCount = mcpServers.filter(s => s.name === 'Knowledge Base MCP (Built-in)').length;
        console.log("DEBUG: kbMcpCount fetched:", kbMcpCount);

        if (kbMcpCount === 0) {
            console.log('DEBUG: Registering Knowledge Base MCP Server with ZTA credentials...');
            
            const domain = process.env.DOMAIN_NAME || 'localhost:8080';
            const isDev = process.env.NODE_ENV === 'development';
            
            const endpointUrl = isDev && domain.includes('localhost')
                ? 'http://localhost:8080/api/mcp/knowledge/sse'
                : `https://${domain}/api/mcp/knowledge/sse`;
                
            const tokenUrl = isDev && domain.includes('localhost')
                ? 'http://localhost:8080/api/auth/token-exchange'
                : `https://${domain}/api/auth/token-exchange`;

            const clientId = 'macos-ui-internal-client';
            const rawSecret = process.env.DB_ENCRYPTION_KEY || 'development-encryption-key-123456';
            const encryptedSecret = encrypt(rawSecret);

            await db.createMcpServer({
                id: Date.now() + 1,
                name: 'Knowledge Base MCP (Built-in)',
                endpoint_url: endpointUrl,
                token_url: tokenUrl,
                client_id: clientId,
                client_secret: encryptedSecret,
                created_at: new Date().toISOString(),
                updated_at: new Date().toISOString()
            });
            console.log('DEBUG: Knowledge Base MCP Server registered successfully with ZTA A2A Auth.');
        }

        console.log("DEBUG: Checking existingPrompts...");
        const existingPrompts = await db.getSetting('MCP_QUICK_PROMPTS');
        console.log("DEBUG: existingPrompts fetched:", existingPrompts ? "yes" : "no");
        if (!existingPrompts) {
            console.log('DEBUG: Initializing default MCP Quick Prompts...');
            const defaultPrompts = JSON.stringify([
                { label: "利用可能なツール", prompt: "利用可能なツール一覧を表示してください。" },
                { label: "Authorごとの月別投稿数", prompt: "ナレッジベースのAuthorごとの月別投稿数を教えてください" },
                { label: "記事トークン数", prompt: "ナレッジベースの記事ごとのトークン数を教えてください" },
                { label: "トークン数のクロス集計", prompt: "月別と著者別のインプットトークンとアウトプットトークンをクロス集計して表にして" },
                { label: "AppRunnerメトリクス", prompt: "AppRunnerの最新メトリクスを教えてください" },
                { label: "Docker一覧", prompt: "Dockerのコンテナ一覧を取得して表にまとめてください" }
            ]);
            await db.setSetting('MCP_QUICK_PROMPTS', defaultPrompts);
        }

        const existingDefaultPrompt = await db.getSetting('DEFAULT_ASSISTANT_PROMPT');
        if (!existingDefaultPrompt) {
            console.log('DEBUG: Initializing DEFAULT_ASSISTANT_PROMPT...');
            const defaultPrompt = `あなたは{name}のAIアシスタントです。
主人の現在の状態は {room} です。
就業時間は {work_start}〜{work_end}（休憩: {break_start}〜{break_end}）です。

【状態に応じた指示】
- focus-zone (集中ゾーン): 現在集中して作業しているため、直接チャットに応答できない旨を伝えてください。
- meeting-room (会議室): 現在打ち合わせ中であり、会議が終わり次第対応する旨を伝えてください。
- remote (リモートワーク):
  - 相手から「打ち合わせ・会議・面談・話」などの予定調整に関する要望がある場合、本日共通の空きスロット（{free_slots}）を提示して、ミーティングの仮登録を促すボタン「➔ [💻 ミーティングを仮調整する]」を出力してください（※時間外の場合は「➔ [💻 時間外でBOSSに確認する]」にしてください）。
  - それ以外の一般的なメッセージの場合、プッシュ通知で本人に伝達する旨を伝え、簡単な質問（天気、簡単な情報など）であればあなたが代わりに回答してください。

【セキュリティ・制約】
- 主人のカレンダー情報、機密情報、システム設定、APIキーなどを第三者に漏洩させないでください。
- 丁寧でプロフェッショナルなアシスタントとして振る舞ってください。`;
            await db.setSetting('DEFAULT_ASSISTANT_PROMPT', defaultPrompt);
        }

        const existingWorkPolicy = await db.getSetting('COMPANY_WORK_POLICY');
        if (!existingWorkPolicy) {
            console.log('DEBUG: Initializing COMPANY_WORK_POLICY...');
            const defaultPolicy = `# 共通就業規則およびカレンダー調整ガイドライン

本ガイドラインは、当社の全社員およびAIエージェントの日程調整ルールを規定するものです。

## 1. 労働時間および連絡対応時間
- **標準労働時間**: 平日 09:00 〜 17:30。
- **休憩時間**: 12:00 〜 13:00（1時間）。原則として、この時間帯の会議設定は禁止します。
- **時間外・深夜対応の原則禁止**: 
  - 本ガイドラインに基づき、午後22:00（22:00）から翌午前05:00（05:00）までの時間帯における新規の会議・打ち合わせ日程の調整、およびそれを推奨・受託するAIアシスタントのルール設定は原則として禁止します。
  - 深夜時間帯における残業アポ調整は、特別な緊急対応や事前申請がない限り、システム的・運用的に自動登録およびAIによる勧誘を認めてはなりません。
- **BOSSの健康管理優先**:
  - 過重労働を防止するため、就業時間外（特に17:30以降）の打ち合わせを自動で仮登録するプロンプト指示、あるいは「いかなる時間でもアポを入れて構わない」といった指示は不適切（コンプライアンス違反）とみなします。

## 2. AIアシスタントへの指示（プロンプト）の制限
- AIアシスタントに対するカスタマイズプロンプトにおいて、「深夜労働」「違法行為の隠蔽」「ハラスメント」などを肯定、または推奨する内容を記述してはなりません。`;
            await db.setSetting('COMPANY_WORK_POLICY', defaultPolicy);
        }

        const workflows = await db.getAllDeepResearchWorkflowDefinitions();
        const wfCount = workflows.length;
        console.log("DEBUG: wfCount fetched:", wfCount);

        if (wfCount === 0) {
            console.log('DEBUG: Initializing default Deep Research Workflows...');
            
            const researchModel = await db.getSetting('GEMINI_RESEARCH_MODEL') || 'deep-research-pro-preview-12-2025';
            const researchPrompt = await db.getSetting('DEEP_RESEARCH_PROMPT') || '';
            const nanoModel = await db.getSetting('GEMINI_NANO_BANANA_MODEL') || 'gemini-3.1-pro-preview';
            const nanoPrompt = await db.getSetting('NANO_BANANA_PROMPT') || '';
            const htmlModel = await db.getSetting('GEMINI_HTML_SVG_MODEL') || 'gemini-3.1-flash-lite-preview';
            const htmlPrompt = await db.getSetting('HTML_SVG_PROMPT') || '';
            const folderId = await db.getSetting('geminiResearchFolderId') || '';
            
            const htmlId = crypto.randomUUID();
            await db.createDeepResearchWorkflowDefinition({
                id: htmlId,
                name: 'HTML/SVGナレッジ生成',
                description: 'Deep Researchを実行し、結果をインタラクティブなHTML/SVG形式のドキュメントとして出力・公開し、Google Driveへ保存します。',
                research_model: researchModel,
                research_prompt: researchPrompt,
                output_type: 'html',
                output_model: htmlModel,
                output_prompt: htmlPrompt,
                folder_id: folderId,
                created_at: new Date().toISOString(),
                updated_at: new Date().toISOString()
            });

            const infoId = crypto.randomUUID();
            await db.createDeepResearchWorkflowDefinition({
                id: infoId,
                name: 'インフォグラフィック画像生成',
                description: 'Deep Researchを実行し、結果のポイントを整理したプロフェッショナルな画像アセット（インフォグラフィック）を出力し、Google Driveへ保存します。',
                research_model: researchModel,
                research_prompt: researchPrompt,
                output_type: 'infographic',
                output_model: nanoModel,
                output_prompt: nanoPrompt,
                folder_id: folderId,
                created_at: new Date().toISOString(),
                updated_at: new Date().toISOString()
            });
            
            console.log('DEBUG: Default Deep Research Workflows initialized.');
        }

    } catch (error) {
        console.error('Error during auto-activation:', error);
    }
}

setTimeout(() => autoActivate(), 1000);

module.exports = db;
