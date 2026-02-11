# Kumar Music – Environment Variables Guide (Production)

## Overview

This document explains **every environment variable** used in the Kumar Music backend production setup.

**Audience**
- Client
- DevOps Engineer
- System Administrator
- Backend Developer

**Goal**
- Explain **what each ENV variable does**
- Clearly state **who provides it**
- Show **exact steps to generate or obtain it**
- Prevent misconfiguration and security mistakes

---

## 1. Application Environment Variables

### NODE_ENV

**Purpose**  
Defines the runtime environment for the Node.js application.

**Value**
```env
NODE_ENV=production
````

**Provided by**
Developer / Server Administrator

**How to set**

1. Decide the environment type
2. For live servers, always use `production`
3. Manually add this value to the `.env` file

No external service required.

---

### PORT

**Purpose**
Specifies the port on which the backend server listens.

**Example**

```env
PORT=4000
```

**Provided by**
Developer / Server Administrator

**How to decide**

1. If using Nginx as a reverse proxy, any unused internal port is acceptable
2. Recommended default: `4000`
3. Ensure firewall rules allow internal access

---

## 2. MongoDB Database Configuration

### MONGO_URI

**Purpose**
Connects the backend application to the MongoDB database.

**Provided by**
MongoDB Atlas

---

### How to Generate MongoDB URI (Step-by-Step)

#### Step 1: Login

* Visit [https://cloud.mongodb.com](https://cloud.mongodb.com)
* Login using your MongoDB account

#### Step 2: Create or Select a Cluster

1. Go to **Database**
2. If no cluster exists:

   * Click **Build a Database**
   * Choose **Shared (Free Tier)** or **Paid**
   * Select a region
3. Wait for cluster creation to complete

#### Step 3: Create Database User

1. Navigate to **Database Access**
2. Click **Add New Database User**
3. Set:

   * Username
   * Password
4. Role: **Read and write to any database**
5. Save credentials

**Important:** Store credentials securely.

#### Step 4: Whitelist Server IP

1. Go to **Network Access**
2. Click **Add IP Address**
3. Select **Allow access from anywhere (0.0.0.0/0)**
4. Confirm

#### Step 5: Get Connection String

1. Return to **Database**
2. Click **Connect**
3. Select **Connect your application**
4. Choose:

   * Driver: Node.js
   * Version: Latest
5. Copy the connection string

Example:

```text
mongodb+srv://<username>:<password>@cluster0.xxxxx.mongodb.net/?retryWrites=true&w=majority
```

#### Step 6: Finalize URI

* Replace placeholders with actual credentials
* Append database name

```env
MONGO_URI=mongodb+srv://user:pass@cluster0.xxxxx.mongodb.net/kumar_music
```

---

## 3. JWT Authentication Configuration

### JWT_ACCESS_SECRET

### JWT_REFRESH_SECRET

**Purpose**
Used to cryptographically sign and verify authentication tokens.

**Provided by**
Developer (must be randomly generated)

---

### How to Generate Secure JWT Secrets

#### Recommended Method: Node.js Crypto

1. Open terminal
2. Run:

```bash
node -e "console.log(require('crypto').randomBytes(64).toString('hex'))"
```

3. Copy the output
4. Use it as a secret

Repeat once for the refresh token.

**Example**

```env
JWT_ACCESS_SECRET=9f1c7e4f3c9b...
JWT_REFRESH_SECRET=a8c19d7b1aa...
```

**Security Rules**

* Never reuse secrets
* Never commit secrets to Git
* Never share secrets publicly

---

### Token Expiry Configuration

```env
JWT_ACCESS_EXPIRES=15m
JWT_REFRESH_EXPIRES=30d
```

**Provided by**
Developer (security policy decision)

---

## 4. Google OAuth Configuration (Optional)

### GOOGLE_CLIENT_ID

### API_CLIENT_SECRET

**Purpose**
Enable Google-based authentication.

**Provided by**
Google Cloud Console

---

### Google OAuth Setup

#### Step 1: Login

* Visit [https://console.cloud.google.com](https://console.cloud.google.com)
* Login with Google account

#### Step 2: Create Project

1. Click **Select Project**
2. Click **New Project**
3. Enter project name
4. Create project

#### Step 3: Configure OAuth Consent Screen

1. Go to **APIs & Services → OAuth Consent Screen**
2. Select **External**
3. Fill required fields:

   * App name
   * Support email
4. Save

#### Step 4: Create OAuth Credentials

1. Go to **Credentials**
2. Click **Create Credentials → OAuth Client ID**
3. Application type: **Web**
4. Add authorized redirect URI
5. Create credentials

#### Step 5: Copy Credentials

* Client ID
* Client Secret

Add them to `.env`.

---

## 5. Razorpay Payment Configuration

### RAZORPAY_KEY_ID

### RAZORPAY_KEY_SECRET

**Provided by**
Razorpay Dashboard

---

### How to Generate Razorpay API Keys

1. Visit [https://dashboard.razorpay.com](https://dashboard.razorpay.com)
2. Login
3. Go to **Settings → API Keys**
4. Click **Generate Key**
5. Copy:

   * Key ID
   * Key Secret

---

### RAZORPAY_WEBHOOK_SECRET

**Purpose**
Verifies payment authenticity from Razorpay webhooks.

#### Webhook Setup

1. Go to **Webhooks**
2. Click **Add Webhook**
3. Backend URL:

```
https://api.yourdomain.com/api/webhooks/razorpay
```

4. Select event:

   * `payment.captured`
5. Set secret
6. Save and copy secret to `.env`

---

## 6. Email Configuration

### EMAIL_USER

### EMAIL_PASS

**Purpose**
Send transactional emails.

**Provided by**
Email Provider (Gmail / Zoho / SMTP)

---

### Gmail App Password Setup

1. Login to Gmail
2. Open **Google Account → Security**
3. Enable **2-Step Verification**
4. Go to **App Passwords**
5. Create password:

   * App: Mail
   * Device: Server
6. Copy generated password

---

### Email Metadata

```env
EMAIL_FROM="Kumar Music <email@domain.com>"
SUPPORT_EMAIL=support@domain.com
```

---

## 7. Frontend & CORS Configuration

### CLIENT_URL

**Provided by**
Frontend deployment (Vercel / Netlify)

Example:

```env
CLIENT_URL=https://kumarvisuals.com
```

---

### CORS_ORIGIN

**Purpose**
Restricts API access to trusted frontends.

**How to configure**

1. List allowed frontend URLs
2. Separate them using commas

---

## 8. AWS S3 Configuration

### AWS_ACCESS_KEY_ID

### AWS_SECRET_ACCESS_KEY

**Provided by**
AWS IAM

---

### AWS IAM Setup

1. Visit [https://aws.amazon.com](https://aws.amazon.com)
2. Login
3. Open **IAM**
4. Go to **Users → Create User**
5. Enable **Programmatic Access**
6. Attach policy:

   * `AmazonS3FullAccess` (or custom)
7. Generate keys
8. Copy Access Key and Secret Key

---

### Bucket Configuration

```env
S3_REGION=ap-south-1
S3_BUCKET_NAME=your-bucket
S3_ACL=private
```

---

## 9. Signed URL Expiry Configuration

### UPLOAD_URL_EXPIRATION

### S3_URL_EXPIRATION

**Purpose**
Controls how long upload and download URLs remain valid.

**Provided by**
Developer

**Example**

```env
UPLOAD_URL_EXPIRATION=900
S3_URL_EXPIRATION=3600
```

---

## Sample `.env` File (Production)

```env
NODE_ENV=production
PORT=4000

MONGO_URI=mongodb+srv://demo_user:demo_password@cluster0.example.mongodb.net/kumar_music

JWT_ACCESS_SECRET=demo_access_secret_64_char_random_string
JWT_REFRESH_SECRET=demo_refresh_secret_64_char_random_string
JWT_ACCESS_EXPIRES=15m
JWT_REFRESH_EXPIRES=30d

GOOGLE_CLIENT_ID=1234567890-demo.apps.googleusercontent.com
API_CLIENT_SECRET=demo_google_client_secret

RAZORPAY_KEY_ID=rzp_test_ABCDEF123456
RAZORPAY_KEY_SECRET=demo_razorpay_secret
RAZORPAY_WEBHOOK_SECRET=demo_webhook_secret

EMAIL_USER=demo.sender@gmail.com
EMAIL_PASS=demo_email_app_password
EMAIL_FROM="Kumar Music <demo.sender@gmail.com>"
SUPPORT_EMAIL=support@kumarmusic.com

CLIENT_URL=https://frontend.example.com
CORS_ORIGIN=https://frontend.example.com,http://localhost:8080

AWS_ACCESS_KEY_ID=AKIADEMOACCESSKEY
AWS_SECRET_ACCESS_KEY=demo_aws_secret_key
S3_REGION=ap-south-1
S3_BUCKET_NAME=kumar-music-assets
S3_ACL=private

UPLOAD_URL_EXPIRATION=900
S3_URL_EXPIRATION=3600
```

---
