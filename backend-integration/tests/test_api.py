import os
from pathlib import Path
import shutil
import pytest

TEST_DB = Path(__file__).resolve().parent / "vaultline-test.db"
TEST_UPLOADS = Path(__file__).resolve().parent / "uploads"
os.environ["DATABASE_URL"] = f"sqlite:///{TEST_DB.as_posix()}"
os.environ["SECRET_KEY"] = "test-only-secret"
os.environ["UPLOAD_DIR"] = str(TEST_UPLOADS)

from fastapi.testclient import TestClient
from app.database import engine
from app.config import Settings
from app.main import app
from app.models import Base


def register_payload(email="owner@example.com"):
    return {
        "email": email,
        "authProofB64": "cHJvb2Yt" * 8,
        "publicKeyB64": "cHVibGljLWtleQ==" * 10,
        "wrappedPrivateKeyB64": "d3JhcHBlZC1wcml2YXRlLWtleQ==" * 8,
        "saltB64": "c2FsdC1mb3ItdGVzdA==",
    }


def setup_function():
    Base.metadata.drop_all(bind=engine)
    Base.metadata.create_all(bind=engine)


def teardown_module():
    engine.dispose()
    TEST_DB.unlink(missing_ok=True)
    shutil.rmtree(TEST_UPLOADS, ignore_errors=True)


def test_registration_salt_survives_and_login_returns_real_jwt():
    with TestClient(app) as client:
        payload = register_payload()
        registered = client.post("/api/auth/register", json=payload)
        assert registered.status_code == 201
        assert registered.json()["salt"] == payload["saltB64"]

        salt = client.post("/api/auth/fetch-salt", json={"email": payload["email"]})
        assert salt.json() == {"salt": payload["saltB64"]}

        login = client.post("/api/auth/login", json={"email": payload["email"], "authProofB64": payload["authProofB64"]})
        assert login.status_code == 200
        token = login.json()["token"]
        assert token.count(".") == 2
        me = client.get("/api/auth/me", headers={"Authorization": f"Bearer {token}"})
        assert me.status_code == 200

        second_login = client.post(
            "/api/auth/login",
            json={"email": payload["email"].upper(), "authProofB64": payload["authProofB64"]},
        )
        assert second_login.status_code == 200
        assert second_login.json()["wrappedPrivateKeyB64"] == payload["wrappedPrivateKeyB64"]

        wrong_password = client.post(
            "/api/auth/login",
            json={"email": payload["email"], "authProofB64": "d3JvbmctcHJvb2Yt" * 8},
        )
        assert wrong_password.status_code == 401


def test_production_refuses_shared_or_short_jwt_secrets():
    with pytest.raises(ValueError, match="SECRET_KEY"):
        Settings(ENVIRONMENT="production", SECRET_KEY="vaultline-development-key-change-before-production")
    with pytest.raises(ValueError, match="32 characters"):
        Settings(ENVIRONMENT="production", SECRET_KEY="too-short")


def test_authenticated_file_lifecycle():
    with TestClient(app) as client:
        auth = client.post("/api/auth/register", json=register_payload()).json()
        headers = {"Authorization": f"Bearer {auth['token']}"}
        uploaded = client.post(
            "/api/files/upload",
            headers=headers,
            files={"ciphertext": ("vaultline.enc", b"encrypted bytes", "application/octet-stream")},
            data={"encryptedMetadata": "ZW5jcnlwdGVkLW1ldGFkYXRh", "wrappedKey": "d3JhcHBlZC1rZXk=", "sizeBytes": "15"},
        )
        assert uploaded.status_code == 201
        file_id = uploaded.json()["id"]
        listed = client.get("/api/files", headers=headers)
        assert listed.status_code == 200
        assert listed.json()["files"][0]["id"] == file_id
        downloaded = client.get(f"/api/files/{file_id}/download", headers=headers)
        assert downloaded.content == b"encrypted bytes"
        assert downloaded.headers["x-wrapped-key"] == "d3JhcHBlZC1rZXk="
        assert client.delete(f"/api/files/{file_id}", headers=headers).status_code == 200


def test_owner_can_share_and_revoke_recipient_access():
    with TestClient(app) as client:
        owner = client.post("/api/auth/register", json=register_payload()).json()
        recipient_payload = register_payload("recipient@example.com")
        recipient = client.post("/api/auth/register", json=recipient_payload).json()
        owner_headers = {"Authorization": f"Bearer {owner['token']}"}
        recipient_headers = {"Authorization": f"Bearer {recipient['token']}"}
        uploaded = client.post(
            "/api/files/upload",
            headers=owner_headers,
            files={"ciphertext": ("vaultline.enc", b"shared encrypted bytes", "application/octet-stream")},
            data={"encryptedMetadata": "ZW5jcnlwdGVkLW1ldGFkYXRh", "wrappedKey": "b3duZXIta2V5", "sizeBytes": "22"},
        ).json()
        file_id = uploaded["id"]
        assert client.get(f"/api/files/{file_id}/download", headers=recipient_headers).status_code == 404
        share = client.post("/api/sharing/share", headers=owner_headers, json={
            "fileId": file_id,
            "recipientEmail": "RECIPIENT@EXAMPLE.COM",
            "wrappedKeyForRecipient": "cmVjaXBpZW50LXdyYXBwZWQta2V5" * 5,
        })
        assert share.status_code == 201
        assert client.get(f"/api/files/{file_id}/download", headers=recipient_headers).status_code == 200
        shared_with_me = client.get("/api/sharing/shared-with-me", headers=recipient_headers)
        assert shared_with_me.status_code == 200
        assert shared_with_me.json()["files"][0]["fileId"] == file_id
        assert shared_with_me.json()["files"][0]["ownerEmail"] == "owner@example.com"
        assert client.get(f"/api/sharing/file/{file_id}", headers=recipient_headers).status_code == 403
        assert client.delete(f"/api/files/{file_id}", headers=recipient_headers).status_code == 403
        listed = client.get(f"/api/sharing/file/{file_id}", headers=owner_headers).json()
        assert listed["shares"][0]["recipientEmail"] == recipient_payload["email"]
        revoked = client.request("DELETE", "/api/sharing/revoke", headers=owner_headers, json={
            "fileId": file_id, "recipientEmail": "Recipient@Example.com"
        })
        assert revoked.status_code == 200
        assert client.get(f"/api/files/{file_id}/download", headers=recipient_headers).status_code == 404
