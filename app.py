import os
import sqlite3
import string
import random
from datetime import datetime
from functools import wraps

from flask import Flask, render_template, request, redirect, url_for, session, flash, abort, g
from werkzeug.security import generate_password_hash, check_password_hash

app = Flask(__name__)
app.config["SECRET_KEY"] = os.environ.get("SECRET_KEY", "change-this-secret-key-in-production")

DB_PATH = os.environ.get("DB_PATH", os.path.join(os.path.dirname(__file__), "shortlink.db"))


# ---------- Database helpers ----------

def get_db():
    if "db" not in g:
        g.db = sqlite3.connect(DB_PATH)
        g.db.row_factory = sqlite3.Row
    return g.db


@app.teardown_appcontext
def close_db(exception=None):
    db = g.pop("db", None)
    if db is not None:
        db.close()


def init_db():
    conn = sqlite3.connect(DB_PATH)
    conn.execute("""
        CREATE TABLE IF NOT EXISTS user (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            username TEXT UNIQUE NOT NULL,
            password_hash TEXT NOT NULL,
            created_at TEXT NOT NULL
        )
    """)
    conn.execute("""
        CREATE TABLE IF NOT EXISTS link (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            user_id INTEGER NOT NULL,
            code TEXT UNIQUE NOT NULL,
            destination TEXT NOT NULL,
            title TEXT,
image_url TEXT,
description TEXT,
            
            clicks INTEGER DEFAULT 0,
            created_at TEXT NOT NULL,
            FOREIGN KEY (user_id) REFERENCES user (id)
        )
    """)
    conn.commit()
    conn.close()


# ---------- Helpers ----------

def generate_code(db, length=6):
    chars = string.ascii_letters + string.digits
    while True:
        code = "".join(random.choice(chars) for _ in range(length))
        existing = db.execute("SELECT id FROM link WHERE code = ?", (code,)).fetchone()
        if not existing:
            return code


def login_required(f):
    @wraps(f)
    def wrapper(*args, **kwargs):
        if "user_id" not in session:
            return redirect(url_for("login"))
        return f(*args, **kwargs)
    return wrapper


def current_user():
    if "user_id" not in session:
        return None
    db = get_db()
    return db.execute("SELECT * FROM user WHERE id = ?", (session["user_id"],)).fetchone()


# ---------- Routes ----------

@app.route("/")
def index():
    if "user_id" in session:
        return redirect(url_for("dashboard"))
    return redirect(url_for("login"))


@app.route("/register", methods=["GET", "POST"])
def register():
    if request.method == "POST":
        username = request.form.get("username", "").strip()
        password = request.form.get("password", "")

        if not username or not password:
            flash("Username and password are required.")
            return redirect(url_for("register"))

        if len(password) < 6:
            flash("Password must be at least 6 characters.")
            return redirect(url_for("register"))

        db = get_db()
        existing = db.execute("SELECT id FROM user WHERE username = ?", (username,)).fetchone()
        if existing:
            flash("That username is already taken.")
            return redirect(url_for("register"))

        password_hash = generate_password_hash(password)
        cur = db.execute(
            "INSERT INTO user (username, password_hash, created_at) VALUES (?, ?, ?)",
            (username, password_hash, datetime.utcnow().isoformat()),
        )
        db.commit()
        session["user_id"] = cur.lastrowid
        return redirect(url_for("dashboard"))

    return render_template("register.html")


@app.route("/login", methods=["GET", "POST"])
def login():
    if request.method == "POST":
        username = request.form.get("username", "").strip()
        password = request.form.get("password", "")

        db = get_db()
        user = db.execute("SELECT * FROM user WHERE username = ?", (username,)).fetchone()

        if not user or not check_password_hash(user["password_hash"], password):
            flash("Invalid username or password.")
            return redirect(url_for("login"))

        session["user_id"] = user["id"]
        return redirect(url_for("dashboard"))

    return render_template("login.html")


@app.route("/logout")
def logout():
    session.clear()
    return redirect(url_for("login"))


@app.route("/dashboard", methods=["GET", "POST"])
@login_required
def dashboard():
    db = get_db()
    user = current_user()

    if request.method == "POST":
        destination = request.form.get("destination", "").strip()
        title = request.form.get("title", "").strip()
        image_url = request.form.get("image_url", "").strip()
        description = request.form.get("description", "").strip()

        if not destination.startswith(("http://", "https://")):
            flash("Please enter a valid URL starting with http:// or https://")
            return redirect(url_for("dashboard"))

        code = generate_code(db)
        db.execute(
            ""INSERT INTO link (user_id, code, destination, title, image_url, description, created_at) VALUES (?, ?, ?, ?, ?, ?, ?)",
        (user["id"], code, destination, title, image_url, description, datetime.utcnow().isoformat())
        db.commit()
        flash(f"Short link created: /{code}")
        return redirect(url_for("dashboard"))

    links = db.execute(
        "SELECT * FROM link WHERE user_id = ? ORDER BY created_at DESC", (user["id"],)
    ).fetchall()
    return render_template("dashboard.html", user=user, links=links)


@app.route("/settings", methods=["GET", "POST"])
@login_required
def settings():
    db = get_db()
    user = current_user()

    if request.method == "POST":
        current_password = request.form.get("current_password", "")
        new_password = request.form.get("new_password", "")
        confirm_password = request.form.get("confirm_password", "")

        if not check_password_hash(user["password_hash"], current_password):
            flash("Current password is incorrect.")
            return redirect(url_for("settings"))

        if len(new_password) < 6:
            flash("New password must be at least 6 characters.")
            return redirect(url_for("settings"))

        if new_password != confirm_password:
            flash("New passwords do not match.")
            return redirect(url_for("settings"))

        new_hash = generate_password_hash(new_password)
        db.execute("UPDATE user SET password_hash = ? WHERE id = ?", (new_hash, user["id"]))
        db.commit()
        flash("Password updated successfully.")
        return redirect(url_for("settings"))

    return render_template("settings.html", user=user)


@app.route("/<code>")
def go(code):
    db = get_db()
    link = db.execute("SELECT * FROM link WHERE code = ?", (code,)).fetchone()
    if not link:
        abort(404)
    db.execute("UPDATE link SET clicks = clicks + 1 WHERE id = ?", (link["id"],))
    db.commit()
    return redirect(link["destination"])


@app.errorhandler(404)
def not_found(e):
    return render_template("404.html"), 404


init_db()


if __name__ == "__main__":
    port = int(os.environ.get("PORT", 5000))
    app.run(host="0.0.0.0", port=port, debug=False)
