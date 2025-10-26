# Facebook Customer Name Feature

## Overview

This feature automatically captures the real name of Facebook users when they send messages to your Facebook page, instead of just showing the last 4 digits of their Facebook ID.

## How It Works

1. When a Facebook user sends a message to your page, the system automatically fetches their profile information from Facebook's Graph API
2. The user's real first and last name are extracted from the profile
3. A new customer record is created with their real name instead of generic placeholders
4. Existing customers with generic names are updated with their real names when they send new messages

## Implementation Details

### Profile Fetching

The system uses Facebook's Graph API to fetch user profile information:

```
GET https://graph.facebook.com/{userId}?fields=first_name,last_name,profile_pic,name&access_token={pageAccessToken}
```

### Name Handling Logic

1. **First Priority**: Uses `first_name` and `last_name` fields from the profile
2. **Fallback**: If those fields aren't available, parses the `name` field to extract first and last names
3. **Default**: If no name information is available, falls back to "مستخدم" + last 4 digits of Facebook ID

### Customer Creation

When creating a new customer:
- `firstName`: Real first name from Facebook or fallback
- `lastName`: Real last name from Facebook or fallback
- `facebookId`: User's Facebook ID
- `email`: Generated as `facebook_{userId}@example.com`
- `metadata`: Stores additional Facebook profile information and error details

### Customer Updates

For existing customers with generic names:
- Checks if `firstName` is "Facebook", "عميل فيسبوك", or similar generic values
- If so, fetches real name from Facebook and updates the record
- Preserves existing customer data and conversation history

## Error Handling

### Common Facebook API Errors

1. **Error 100 with subcode 33**: User profile not accessible due to privacy restrictions or user blocking the page
2. **Error 190**: Access token issues (invalid or expired)
3. **Network errors**: Connection issues with Facebook's servers
4. **Timeout errors**: Request taking too long to complete

### Fallback Strategies

When profile fetching fails:
1. Uses "مستخدم" + last 4 digits as the name instead of "عميل فيسبوك"
2. Stores error information in customer metadata for debugging
3. Continues processing the message without interrupting the flow
4. Allows for future retries when the user sends another message

## Token Management

### Important Note About Access Tokens

The system requires valid Facebook Page Access Tokens to fetch user profiles. These are different from the webhook verification token:

- **Webhook Verification Token**: Used only for webhook verification (`simple_chat_verify_token_2025`)
- **Page Access Token**: Used for API calls to fetch user profiles and send messages

### Checking Token Validity

Use the provided scripts to check token validity:

```bash
# Check all Facebook page tokens
node fix_facebook_page_tokens.js

# Update a specific page token
node update_facebook_page_token.js <pageId> <newAccessToken>
```

### Common Token Issues

1. **Using webhook verification token instead of page access token**: This causes Error 190
2. **Expired tokens**: Facebook tokens can expire and need to be refreshed
3. **Insufficient permissions**: Tokens must have the right permissions to access user profiles
4. **Revoked tokens**: Users or admins may revoke page access

## API Endpoints

### Update Existing Customers

```
POST /api/v1/customers/update-facebook-names
```

Manually triggers an update process for existing customers with generic names.

### Enhanced Update Process

```
POST /api/v1/customers/update-facebook-names-enhanced
```

Triggers an enhanced background process to update customer names with better error handling and logging.

## Testing

You can test the Facebook profile fetching with the provided test scripts:

```bash
# Test error handling
node test_facebook_profile_error_handling.js

# Test profile fetching with proper token (requires valid token)
node test_facebook_profile_with_token.js

# Check token validity
node fix_facebook_page_tokens.js
```

## Troubleshooting

### Common Issues

1. **Profile fetching fails**: 
   - Check that the page access token is valid
   - Verify that the app has the necessary permissions
   - Ensure the user hasn't blocked the page
   - Facebook privacy settings may prevent profile access

2. **Names not updating**:
   - Check that the customer's current name is considered "generic"
   - Verify that the Facebook profile contains name information
   - Some users have privacy settings that prevent profile access

3. **Rate limiting**:
   - The system includes delays between profile requests
   - Large batches of updates are processed in smaller chunks

### Logs

Check the backend logs for detailed information:
- `[PROFILE]` tags indicate profile fetching activities and errors
- `[CUSTOMER-UPDATE]` tags show customer update operations
- `[WEBHOOK]` tags show incoming message processing
- `[PAGE-CACHE]` tags show page token management

## Benefits

1. **Better Customer Experience**: Agents can see real customer names
2. **Improved Organization**: Easier to identify and track customers
3. **Professional Appearance**: More polished interface for customer service
4. **Historical Accuracy**: Maintains conversation history with proper names
5. **Robust Error Handling**: Gracefully handles Facebook API errors without interrupting service

## Privacy Considerations

- Only fetches publicly available profile information
- Stores only necessary information in the database
- Follows Facebook's data usage policies
- Names are only fetched when customers initiate contact
- Respects user privacy settings that prevent profile access