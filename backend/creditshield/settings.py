"""
Django settings for the CreditShield AI backend (Dev 1 owned).

SECRET_KEY and DEBUG are read from environment variables so nothing
sensitive is ever committed (see .gitignore / .env.example).
"""
from datetime import timedelta
from pathlib import Path
import os

from decouple import Csv, config

BASE_DIR = Path(__file__).resolve().parent.parent

# SECURITY WARNING: keep the secret key used in production secret!
# Falls back to an insecure dev-only key so `runserver` still works out
# of the box on a fresh clone with no .env file present.
SECRET_KEY = config(
    "DJANGO_SECRET_KEY", default="django-insecure-dev-only-key-do-not-use-in-production"
)

# SECURITY WARNING: don't run with debug turned on in production!
# Defaults to True for local hackathon dev; must be explicitly set to
# False in .env before the demo build is frozen (section 8.3 of the
# task sheet).
DEBUG = config("DJANGO_DEBUG", default=True, cast=bool)

ALLOWED_HOSTS = config("DJANGO_ALLOWED_HOSTS", default="localhost,127.0.0.1", cast=Csv())


INSTALLED_APPS = [
    "django.contrib.admin",
    "django.contrib.auth",
    "django.contrib.contenttypes",
    "django.contrib.sessions",
    "django.contrib.messages",
    "django.contrib.staticfiles",
    "rest_framework",
    "rest_framework_simplejwt",
    "corsheaders",
    "core",
    "advisory",
    "chatbot",
    
]

MIDDLEWARE = [
    "django.middleware.security.SecurityMiddleware",
    "corsheaders.middleware.CorsMiddleware",
    "django.contrib.sessions.middleware.SessionMiddleware",
    "django.middleware.common.CommonMiddleware",
    "django.middleware.csrf.CsrfViewMiddleware",
    "django.contrib.auth.middleware.AuthenticationMiddleware",
    "django.contrib.messages.middleware.MessageMiddleware",
    "django.middleware.clickjacking.XFrameOptionsMiddleware",
]

ROOT_URLCONF = "creditshield.urls"

TEMPLATES = [
    {
        "BACKEND": "django.template.backends.django.DjangoTemplates",
        "DIRS": [],
        "APP_DIRS": True,
        "OPTIONS": {
            "context_processors": [
                "django.template.context_processors.request",
                "django.contrib.auth.context_processors.auth",
                "django.contrib.messages.context_processors.messages",
            ],
        },
    },
]

WSGI_APPLICATION = "creditshield.wsgi.application"


# Database
DATABASES = {
    "default": {
        "ENGINE": "django.db.backends.sqlite3",
        "NAME": BASE_DIR / "db.sqlite3",
    }
}



GROQ_API_KEY = os.environ.get("GROQ_API_KEY")

MEDIA_URL = "/media/"
MEDIA_ROOT = BASE_DIR / "media"


AUTH_PASSWORD_VALIDATORS = [
    {"NAME": "django.contrib.auth.password_validation.UserAttributeSimilarityValidator"},
    {"NAME": "django.contrib.auth.password_validation.MinimumLengthValidator"},
    {"NAME": "django.contrib.auth.password_validation.CommonPasswordValidator"},
    {"NAME": "django.contrib.auth.password_validation.NumericPasswordValidator"},
]


LANGUAGE_CODE = "en-us"
TIME_ZONE = "Africa/Kampala"
USE_I18N = True
USE_TZ = True

STATIC_URL = "static/"

DEFAULT_AUTO_FIELD = "django.db.models.BigAutoField"


# Django REST Framework
# The default exception handler already converts Http404 -> 404 and
# ValidationError -> 400, which combined with explicit validation in
# views.py keeps malformed/missing/invalid-id requests at 4xx rather
# than 500 (section 8.3 of the task sheet).
#
# DEFAULT_PERMISSION_CLASSES stays IsAuthenticated (deny-by-default) here
# because the new `planning` app carries real financial data. The original
# `core` endpoints (parse-sms, dashboards, ...) explicitly override this
# with AllowAny per-view in core/views.py so this change does not lock
# teammates out of the existing hackathon-demo contract.
REST_FRAMEWORK = {
    "DEFAULT_RENDERER_CLASSES": ["rest_framework.renderers.JSONRenderer"],
    "DEFAULT_PARSER_CLASSES": ["rest_framework.parsers.JSONParser"],
    "DEFAULT_AUTHENTICATION_CLASSES": [
        "rest_framework_simplejwt.authentication.JWTAuthentication",
    ],
    "DEFAULT_PERMISSION_CLASSES": [
        "rest_framework.permissions.IsAuthenticated",
    ],
    "DEFAULT_THROTTLE_CLASSES": [
        "rest_framework.throttling.ScopedRateThrottle",
    ],
    "DEFAULT_THROTTLE_RATES": {
        # Consent confirmation guards a real lending decision -- throttled
        # tightly so a leaked/guessed token can't be brute-forced.
        "consent-confirm": "10/min",
        "consent-request": "20/hour",
        # Data-subject requests (access/correction/deletion) are rare,
        # deliberate actions -- a low rate limits automated abuse without
        # affecting a genuine borrower.
        "dsr": "10/hour",
        "planning-write": "60/min",
        "planning-read": "300/min",
    },
}

# djangorestframework-simplejwt. Short-lived access tokens + a rotating
# refresh token so a stolen access token has a small blast-radius window;
# BLACKLIST requires the token_blacklist app, deliberately not added here
# to keep the demo DB lean -- rotation without blacklisting still limits
# reuse of a superseded refresh token client-side.
SIMPLE_JWT = {
    "ACCESS_TOKEN_LIFETIME": timedelta(minutes=15),
    "REFRESH_TOKEN_LIFETIME": timedelta(days=7),
    "ROTATE_REFRESH_TOKENS": True,
    "ALGORITHM": "HS256",
    "SIGNING_KEY": SECRET_KEY,
}

# Field-level encryption key for planning.fields (EncryptedDecimalField /
# EncryptedCharField). MUST be a urlsafe-base64 32-byte key generated with
# `Fernet.generate_key()` and MUST NOT be the same value as SECRET_KEY --
# different threat models (SECRET_KEY signs sessions/tokens and rotating
# it logs everyone out; this key only decrypts stored financial figures).
# No insecure default is provided: an unset key fails loudly via
# planning.fields._get_fernet() rather than silently storing plaintext.
FIELD_ENCRYPTION_KEY = config("DJANGO_FIELD_ENCRYPTION_KEY", default="")

# CORS - scoped strictly to the known local dev origins for the two
# frontends. Never left wide open with '*' (section 8.3 of the task
# sheet). Extend via env var if a teammate runs on a different port.
CORS_ALLOWED_ORIGINS = config(
    "DJANGO_CORS_ALLOWED_ORIGINS",
    default="http://localhost:3000,http://localhost:3001",
    cast=Csv(),
)