# ZTA & A2A Auth Scenario Test Logs

## Target Account: minoru.inui@gmail.com (Role: ITS)

### 1. PDP (Policy Decision Point) Validation
*PDP successfully embedded role and permissions into the JWT.* 
```json
{
  "id": 24,
  "googleId": "111763876850047778195",
  "email": "minoru.inui@gmail.com",
  "name": "Minoru Inui",
  "avatarUrl": "https://lh3.googleusercontent.com/a/ACg8ocI7KrjgQW0NP3L_ZSoCb4f4YBQmXDLstn8FJsoASFtMnPZwJ16b=s96-c",
  "role": "its",
  "allowed_widgets": [
    "app:app-monitor",
    "app:gemini"
  ],
  "allowed_actions": [
    "action:use_mcp_tools"
  ],
  "allowed_models": [
    "*"
  ],
  "iat": 1778315620,
  "exp": 1778920420
}
```

### 2. PEP (Policy Enforcement Point) Validation

#### Test A: Accessing AppRunner MCP (`/api/mcp/tool`)
- **Requirement**: `app:gemini` widget access AND `action:use_mcp_tools` action permission.
- **Result**: ✅ SUCCESS. HTTP 200. The PEP verified the JWT and granted access to the MCP tools because the user has `app:gemini` and `action:use_mcp_tools`.

#### Test B: Accessing Deep Research (`/api/research/workflow/incomplete`)
- **Requirement**: `app:deep-research` widget access.
- **Result**: ✅ SUCCESS (Properly Blocked). HTTP 403. The PEP correctly denied access because `app:deep-research` is not in the user's `allowed_widgets`.
- **Response**: `{"error":"Access denied. Requires widget access: app:deep-research"}`

### 3. A2A Authentication (OAuth Token Exchange)

#### Test C: Requesting Agent Token for External Skill
- **Result**: ✅ SUCCESS. HTTP 200. Token Exchange issued a downscoped Agent Token.
```json
{
  "sub": "111763876850047778195",
  "email": "minoru.inui@gmail.com",
  "name": "Minoru Inui",
  "aud": "app:app-monitor",
  "role": "its",
  "type": "agent_token",
  "iat": 1778315620,
  "exp": 1778319220
}
```
