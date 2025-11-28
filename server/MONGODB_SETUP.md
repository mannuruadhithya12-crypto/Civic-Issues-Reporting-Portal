# MongoDB Atlas Connection Troubleshooting

## Current Status
The server is attempting to connect to your MongoDB Atlas cluster but encountering errors. This is typically due to network access restrictions.

## Steps to Fix

### 1. Whitelist Your IP Address in MongoDB Atlas

1. Go to [MongoDB Atlas](https://cloud.mongodb.com/)
2. Log in to your account
3. Select your project (the one containing `cluster0`)
4. Click on **Network Access** in the left sidebar
5. Click **Add IP Address**
6. Choose one of these options:
   - **Add Current IP Address** (recommended for testing)
   - **Allow Access from Anywhere** (0.0.0.0/0) - use only for development
7. Click **Confirm**
8. Wait 1-2 minutes for the changes to propagate

### 2. Verify Database User Credentials

1. In MongoDB Atlas, click **Database Access** in the left sidebar
2. Verify that user `mannuruadhithya12_db_user` exists
3. If needed, reset the password to `admin123`
4. Ensure the user has **Read and Write** permissions for the database

### 3. Check Connection String

Your current connection string in `.env`:
```
MONGO_URI=mongodb+srv://mannuruadhithya12_db_user:admin123@cluster0.atgvyw6.mongodb.net/mernDB?retryWrites=true&w=majority
```

Make sure:
- Username: `mannuruadhithya12_db_user`
- Password: `admin123` (no special characters that need encoding)
- Cluster: `cluster0.atgvyw6.mongodb.net`
- Database: `mernDB`

### 4. Restart the Server

After making changes in MongoDB Atlas, the server will automatically reconnect (it retries every 5 seconds).

## Common Issues

- **IP Not Whitelisted**: Add your IP in Network Access
- **Wrong Password**: Verify in Database Access
- **Cluster Paused**: Check if your cluster is active in the Atlas dashboard
- **Special Characters in Password**: If your password has special characters, they need to be URL-encoded

## Testing the Connection

Once connected, you should see:
```
MongoDB connected
Server running on port 5000
```

If you continue to see errors, please share the exact error message.
