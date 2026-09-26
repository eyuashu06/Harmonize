# Authentication

HarmonyHub uses **Firebase Authentication** on the client and **Firebase Admin SDK** on the server.

## Providers

* **Email / Password** — Firebase handles hashing, complexity rules, and rate limits.
* **Google** — OAuth via Firebase's pre-built provider.
* **Apple** — OAuth via Firebase's pre-built provider. Requires the Apple developer console setup documented in Firebase.

## The two-token flow

Firebase issues short-lived ID tokens. The backend issues its own long-lived JWTs to the browser. The exchange happens once per session.

```
Browser                                       Backend
───────                                       ───────
1. signInWithEmailAndPassword(...)
   (or signInWithPopup(googleProvider))
   ↓
2. firebaseUser.getIdToken()
   ↓
3. POST /api/v1/auth/session ─────────────▶ verify_firebase_id_token(id_token)
                                            │
                                            ↓
                                            upsert local User
                                            │
                                            ↓
4. ◀── { access_token, user_id, email } ── create_access_token(user.id)
5. Store in localStorage
6. Use Authorization: Bearer <token> for all calls
```

The backend JWT is verified on every request in `app/auth/deps.py::get_current_user`.

## Why two tokens?

* **Firebase ID tokens** are tightly scoped (1 hour), tied to the device, and invalidated on password change.
* **Backend JWTs** can be revoked, audited, and carry our own claims (e.g. role) without round-tripping to Firebase.

## Role-based authorization

The `User.role` column is one of `user`, `artist`, `admin`. Use the `require_role(...)` dependency factory to gate routes:

```python
from app.auth import require_role

@router.delete("/admin/users/{id}", dependencies=[Depends(require_role("admin"))])
def delete_user(id: UUID): ...
```

## Configuring Firebase

1. Create a Firebase project: <https://console.firebase.google.com>
2. Enable **Email/Password**, **Google**, and **Apple** in *Authentication → Sign-in method*.
3. Create a **Web app** and copy the config into `NEXT_PUBLIC_FIREBASE_*` env vars.
4. Create a **service account** key and save the JSON. Mount it into the API container as `/run/secrets/firebase-service-account.json` and set `FIREBASE_CREDENTIALS_PATH` accordingly.
5. Add your domain to *Authentication → Settings → Authorized domains*.

### Apple Sign-In specifics

* Create an **App ID** with Sign In With Apple capability.
* Create a **Service ID** with the return URL set to `https://<your-project>.firebaseapp.com/__/auth/handler`.
* In the Firebase console, paste the Service ID, Apple Team ID, and Key ID.
* The frontend just calls `signInWithPopup(appleProvider)` — Firebase handles the rest.

## Local development without Firebase

If you don't want to set up Firebase for local dev, the backend will fall back to local JWTs. Set `FIREBASE_CREDENTIALS_PATH=""` and any sign-in attempt will be a no-op. You can mint a local JWT for testing with:

```python
from app.core.security import create_access_token
token = create_access_token(subject="<user-uuid>")
```

…and pass it as `Authorization: Bearer <token>` in API calls.
