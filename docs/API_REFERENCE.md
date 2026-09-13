# Vaultline REST API Reference

```text
  ██╗   ██╗ █████╗ ██╗   ██╗██╗  ████████╗██╗     ██╗███╗   ██╗███████╗
  ██║   ██║██╔══██╗██║   ██║██║  ╚══██╔══╝██║     ██║████╗  ██║██╔════╝
  ██║   ██║███████║██║   ██║██║     ██║   ██║     ██║██╔██╗ ██║█████╗  
  ╚██╗ ██╔╝██╔══██║██║   ██║██║     ██║   ██║     ██║██║╚██╗██║██╔══╝  
   ╚████╔╝ ██║  ██║╚██████╔╝███████╗██║   ███████╗██║██║ ╚████║███████╗
    ╚═══╝  ╚═╝  ╚═╝ ╚═════╝ ╚══════╝╚═╝   ╚══════╝╚═╝╚═╝  ╚═══╝╚══════╝
                     REST API SPECIFICATION & SCHEMAS
```

Base Path: `/api`  
Interactive Swagger UI: `http://localhost:8000/docs`  
Interactive ReDoc: `http://localhost:8000/redoc`

All authenticated endpoints require the standard Bearer header:
```http
Authorization: Bearer <access_token>
```

---

## 1. Authentication Endpoints

### 1.1 Register User Account
Creates a new account record, stores cryptographic public/wrapped key material, and returns an initial JWT session.

- **Method:** `POST`
- **Path:** `/api/auth/register`
- **Authentication:** None
- **Request Body (`application/json`):**
  ```json
  {
    "email": "alice@example.com",
    "authProofB64": "vB8kLm9Q...==",
    "publicKeyB64": "MIIBIjANBgkqhkiG9w0BAQEFAAOCAQ8A...==",
    "wrappedPrivateKeyB64": "d982ab76c...==",
    "saltB64": "7Z1X...=="
  }
  ```
- **Response (`201 Created`):**
  ```json
  {
    "access_token": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...",
    "token_type": "bearer",
    "user_id": "3fa85f64-5717-4562-b3fc-2c963f66afa6",
    "email": "alice@example.com",
    "wrappedPrivateKeyB64": "d982ab76c...=="
  }
  ```

---

### 1.2 Fetch Client Salt
Retrieves the user's exact persisted salt to enable deterministic client-side derivation of `authProof` and `wrapKey`.

- **Method:** `POST`
- **Path:** `/api/auth/fetch-salt`
- **Authentication:** None
- **Request Body (`application/json`):**
  ```json
  {
    "email": "alice@example.com"
  }
  ```
- **Response (`200 OK`):**
  ```json
  {
    "saltB64": "7Z1X...=="
  }
  ```
- **Error (`404 Not Found`):**
  ```json
  {
    "detail": "No account found for this email"
  }
  ```

---

### 1.3 User Login
Verifies the client-derived `authProof` against the database's Argon2id hash and issues a signed JWT.

- **Method:** `POST`
- **Path:** `/api/auth/login`
- **Authentication:** None
- **Request Body (`application/json`):**
  ```json
  {
    "email": "alice@example.com",
    "authProofB64": "vB8kLm9Q...=="
  }
  ```
- **Response (`200 OK`):**
  ```json
  {
    "access_token": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...",
    "token_type": "bearer",
    "user_id": "3fa85f64-5717-4562-b3fc-2c963f66afa6",
    "email": "alice@example.com",
    "wrappedPrivateKeyB64": "d982ab76c...=="
  }
  ```
- **Error (`401 Unauthorized`):**
  ```json
  {
    "detail": "Invalid authentication proof"
  }
  ```

---

### 1.4 Get Current User Profile
Returns the public profile and ID of the currently authenticated session.

- **Method:** `GET`
- **Path:** `/api/auth/me`
- **Authentication:** Bearer JWT
- **Response (`200 OK`):**
  ```json
  {
    "userId": "3fa85f64-5717-4562-b3fc-2c963f66afa6",
    "email": "alice@example.com",
    "publicKeyB64": "MIIBIjANBgkqhkiG9w0BAQEFAAOCAQ8A...=="
  }
  ```

---

### 1.5 Lookup Recipient Public Key
Retrieves a target recipient's public RSA key to enable client-side DEK wrapping during file sharing.

- **Method:** `POST`
- **Path:** `/api/auth/lookup-public-key`
- **Authentication:** Bearer JWT
- **Request Body (`application/json`):**
  ```json
  {
    "email": "bob@example.com"
  }
  ```
- **Response (`200 OK`):**
  ```json
  {
    "userId": "9b1deb4d-3b7d-4bad-9bdd-2b0d7b3dcb6d",
    "email": "bob@example.com",
    "publicKeyB64": "MIIBIjANBgkqhkiG9w0BAQEFAAOCAQ8A...=="
  }
  ```

---

## 2. File Management Endpoints

### 2.1 Upload Encrypted File
Stores ciphertext bytes on disk and persists encrypted metadata and owner-wrapped DEK in the database.

- **Method:** `POST`
- **Path:** `/api/files/upload`
- **Authentication:** Bearer JWT
- **Content-Type:** `multipart/form-data`
- **Form Fields:**
  | Field Name | Type | Description |
  |---|---|---|
  | `ciphertext` | Binary Blob / File | Raw AES-256-GCM encrypted file bytes (prefixed with 96-bit IV) |
  | `encryptedMetadata` | String (Base64) | AES-256-GCM encrypted metadata JSON |
  | `wrappedKey` | String (Base64) | RSA-OAEP wrapped file DEK for the uploading owner |
  | `sizeBytes` | Integer | Original unencrypted file size in bytes (for UI display) |
- **Response (`201 Created`):**
  ```json
  {
    "id": "e4d9c026-6218-47bc-8fa2-68ec3540a977",
    "owner_id": "3fa85f64-5717-4562-b3fc-2c963f66afa6",
    "encrypted_metadata": "eyJpdiI6...",
    "wrapped_key": "vB8kLm...",
    "size_bytes": 1048576,
    "created_at": "2026-09-14T01:00:00Z"
  }
  ```

---

### 2.2 List User Files
Returns all files owned by or actively shared with the authenticated user.

- **Method:** `GET`
- **Path:** `/api/files`
- **Authentication:** Bearer JWT
- **Response (`200 OK`):**
  ```json
  {
    "files": [
      {
        "id": "e4d9c026-6218-47bc-8fa2-68ec3540a977",
        "owner_id": "3fa85f64-5717-4562-b3fc-2c963f66afa6",
        "encrypted_metadata": "eyJpdiI6...",
        "wrapped_key": "vB8kLm...",
        "size_bytes": 1048576,
        "created_at": "2026-09-14T01:00:00Z"
      }
    ]
  }
  ```

---

### 2.3 Download Encrypted File
Streams the raw ciphertext file and injects custom cryptographic headers containing the user's specific wrapped key and encrypted metadata.

- **Method:** `GET`
- **Path:** `/api/files/{file_id}/download`
- **Authentication:** Bearer JWT
- **Authorization:** Must be Owner OR have an active Share grant for `file_id`.
- **Response Headers:**
  - `Content-Type: application/octet-stream`
  - `X-Encrypted-Metadata: <base64-encrypted-metadata>`
  - `X-Wrapped-Key: <base64-wrapped-dek>` *(owner wrap or recipient wrap)*
  - `X-File-Id: <uuid>`
- **Response Body:** Raw binary stream of encrypted bytes.

---

### 2.4 Delete File
Permanently removes the file ciphertext from storage, deletes the database record, and cascades deletion to all active share grants.

- **Method:** `DELETE`
- **Path:** `/api/files/{file_id}`
- **Authentication:** Bearer JWT
- **Authorization:** Owner only (`403 Forbidden` for non-owners).
- **Response (`200 OK`):**
  ```json
  {
    "message": "File deleted successfully"
  }
  ```

---

## 3. Cryptographic Sharing Endpoints

### 3.1 Grant Access to Recipient
Stores a recipient-specific wrapped DEK, granting access to download and decrypt the file.

- **Method:** `POST`
- **Path:** `/api/sharing/share`
- **Authentication:** Bearer JWT
- **Authorization:** File owner only.
- **Request Body (`application/json`):**
  ```json
  {
    "fileId": "e4d9c026-6218-47bc-8fa2-68ec3540a977",
    "recipientEmail": "bob@example.com",
    "wrappedKeyForRecipient": "kL90Qx...=="
  }
  ```
- **Response (`201 Created`):**
  ```json
  {
    "message": "File shared successfully",
    "fileId": "e4d9c026-6218-47bc-8fa2-68ec3540a977",
    "recipientEmail": "bob@example.com"
  }
  ```

---

### 3.2 List File Share Grants
Returns all active sharing recipients for a specific file.

- **Method:** `GET`
- **Path:** `/api/sharing/file/{file_id}`
- **Authentication:** Bearer JWT
- **Authorization:** File owner only.
- **Response (`200 OK`):**
  ```json
  {
    "shares": [
      {
        "recipientEmail": "bob@example.com",
        "sharedAt": "2026-09-14T01:05:00Z"
      }
    ]
  }
  ```

---

### 3.3 Revoke Recipient Access
Permanently deletes the recipient's share record, preventing future downloads.

- **Method:** `DELETE`
- **Path:** `/api/sharing/revoke`
- **Authentication:** Bearer JWT
- **Authorization:** File owner only.
- **Request Body (`application/json`):**
  ```json
  {
    "fileId": "e4d9c026-6218-47bc-8fa2-68ec3540a977",
    "recipientEmail": "bob@example.com"
  }
  ```
- **Response (`200 OK`):**
  ```json
  {
    "message": "Access revoked successfully"
  }
  ```

---

### 3.4 List Files Shared With Me
Retrieves all encrypted files where the current user is an authorized recipient.

- **Method:** `GET`
- **Path:** `/api/sharing/shared-with-me`
- **Authentication:** Bearer JWT
- **Response (`200 OK`):**
  ```json
  {
    "files": [
      {
        "id": "e4d9c026-6218-47bc-8fa2-68ec3540a977",
        "ownerEmail": "alice@example.com",
        "encryptedMetadata": "eyJpdiI6...",
        "wrappedKeyForRecipient": "kL90Qx...==",
        "sizeBytes": 1048576,
        "sharedAt": "2026-09-14T01:05:00Z"
      }
    ]
  }
  ```
