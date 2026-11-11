from cs50 import SQL
from flask import Flask, flash, redirect, render_template, request, session, send_file, url_for
from flask_session import Session
from werkzeug.security import check_password_hash, generate_password_hash
import io
import os
import hmac
from helpers import login_required, apology

# Allowed values for the upload form's dropdowns
BOARDS = ["1", "2", "3", "4", "5", "6", "7", "8", "Alt"]
RESULTS = ["1-0", "0.5-0.5", "0-1"]
WV_WIN = ["Yes", "No"]

# Folders: "team" folders are shared with everyone, "personal" ones only with their owner
FOLDER_SCOPES = ["team", "personal"]
FOLDER_NAME_MAX = 60

# Team code that login/register require, so only school members get in.
# Set the TEAM_CODE environment variable, or put the code in team_code.txt (gitignored) next to app.py.
TEAM_CODE_FILE = os.path.join(os.path.dirname(os.path.abspath(__file__)), "team_code.txt")


def get_team_code():
    code = os.environ.get("TEAM_CODE", "").strip()
    if not code and os.path.exists(TEAM_CODE_FILE):
        with open(TEAM_CODE_FILE, encoding="utf-8") as f:
            code = f.read().strip()
    return code


def check_team_code(entered):
    """Return an error message, or None if the team code is right"""
    code = get_team_code()
    if not code:
        return "Team code isn't set up on the server yet. Ask the site admin."
    if not hmac.compare_digest(entered.strip().encode(), code.encode()):
        return "Wrong team code"
    return None


# Coaches can delete any game; everyone else only the games they uploaded.
# Set COACH_USERS to a comma-separated list of usernames to change who counts as a coach.
COACHES = {u.strip().lower() for u in os.environ.get("COACH_USERS", "WV_Coach").split(",") if u.strip()}


def is_coach():
    return session.get("username", "").lower() in COACHES


# Configure application
app = Flask(__name__)


@app.context_processor
def inject_permissions():
    return {"is_coach": is_coach()}

# Configure session to use filesystem (instead of signed cookies)
app.config["SESSION_PERMANENT"] = False
app.config["SESSION_TYPE"] = "filesystem"
Session(app)

db = SQL("sqlite:///cloud.db")

# Add the title column to older databases that don't have it yet
if not db.execute("SELECT name FROM pragma_table_info('games') WHERE name = 'title'"):
    db.execute("ALTER TABLE games ADD COLUMN title TEXT")

# Folders table + folder_id on games (one folder or none per game)
db.execute("""CREATE TABLE IF NOT EXISTS folders (
    id INTEGER PRIMARY KEY AUTOINCREMENT NOT NULL,
    name TEXT NOT NULL COLLATE NOCASE,
    scope TEXT NOT NULL DEFAULT 'team',
    user_id INTEGER NOT NULL REFERENCES users(id),
    created TIMESTAMP DEFAULT CURRENT_TIMESTAMP)""")
if not db.execute("SELECT name FROM pragma_table_info('games') WHERE name = 'folder_id'"):
    db.execute("ALTER TABLE games ADD COLUMN folder_id INTEGER DEFAULT NULL REFERENCES folders(id)")
db.execute("CREATE INDEX IF NOT EXISTS idx_games_folder ON games(folder_id)")

# Games joined with their folder. A game in someone else's personal folder shows as private.
GAME_SELECT = """SELECT g.*,
    CASE WHEN f.scope = 'team' OR f.user_id = ? THEN f.name END AS folder_name,
    CASE WHEN f.scope = 'personal' AND f.user_id != ? THEN 1 ELSE 0 END AS folder_private
    FROM games g LEFT JOIN folders f ON f.id = g.folder_id"""


def get_games(where="1=1", *args):
    user_id = session["user_id"]
    return db.execute(GAME_SELECT + f" WHERE {where} ORDER BY g.date DESC, g.id DESC", user_id, user_id, *args)


def get_folders():
    """Folders the current user can see (team + their own personal), with game counts"""
    return db.execute("""SELECT f.*, COUNT(g.id) AS game_count FROM folders f
        LEFT JOIN games g ON g.folder_id = f.id
        WHERE f.scope = 'team' OR f.user_id = ?
        GROUP BY f.id ORDER BY f.scope DESC, f.name""", session["user_id"])


def visible_folder(folder_id):
    """Return the folder row if the current user can see it, else None"""
    rows = db.execute("SELECT * FROM folders WHERE id = ? AND (scope = 'team' OR user_id = ?)", folder_id, session["user_id"])
    return rows[0] if rows else None


def can_edit_folder(folder):
    # Any user can manage team folders; personal folders belong to their owner
    return folder["scope"] == "team" or folder["user_id"] == session["user_id"]


def find_or_create_folder(name, scope):
    """Validate a new folder name and return (folder_id, error). Reuses a same-named folder."""
    name = (name or "").strip()
    if not name or len(name) > FOLDER_NAME_MAX:
        return None, f"folder name must be 1-{FOLDER_NAME_MAX} characters"
    if scope not in FOLDER_SCOPES:
        return None, "pick team or personal for the folder"

    existing = db.execute("SELECT id FROM folders WHERE name = ? AND scope = ? AND (scope = 'team' OR user_id = ?)",
                          name, scope, session["user_id"])
    if existing:
        return existing[0]["id"], None
    return db.execute("INSERT INTO folders (name, scope, user_id) VALUES (?, ?, ?)", name, scope, session["user_id"]), None


def resolve_folder(form):
    """Turn the upload form's folder fields into (folder_id or None, error)"""
    choice = form.get("folderUpload", "")
    if choice == "":
        return None, None
    if choice == "new":
        return find_or_create_folder(form.get("newFolderName"), form.get("newFolderScope"))
    if choice.isdigit() and visible_folder(int(choice)):
        return int(choice), None
    return None, "that folder doesn't exist"


@app.after_request
def after_request(response):
    """Ensure responses aren't cached"""
    response.headers["Cache-Control"] = "no-cache, no-store, must-revalidate"
    response.headers["Expires"] = 0
    response.headers["Pragma"] = "no-cache"
    return response

@app.route("/login", methods=["GET", "POST"])
def login():
    session.clear()

    if request.method == "GET":
        return render_template("login.html")
    else:
        username = request.form.get("username", "").strip()
        password = request.form.get("password", "")

        # Ensure username and password were submitted
        if not username or not password:
            return render_template("login.html", error="Enter your username and password", username=username)

        codeError = check_team_code(request.form.get("team_code", ""))
        if codeError:
            return render_template("login.html", error=codeError, username=username)

        # Query database for username
        rows = db.execute("SELECT * FROM users WHERE username = ?", username)

        # Ensure username exists and password is correct
        if len(rows) != 1 or not check_password_hash(rows[0]["hash"], password):
            return render_template("login.html", error="Wrong username or password", username=username)

        # Remember which user has logged in
        session["user_id"] = rows[0]["id"]
        session["username"] = rows[0]["username"]

        # Redirect user to cloud
        return redirect("/notationCloud")


@app.route("/register", methods=["GET", "POST"])
def register():
    session.clear()

    if request.method == "GET":
        return render_template("register.html")

    username = request.form.get("username", "").strip()
    password = request.form.get("password", "")
    confirmation = request.form.get("confirmation", "")

    # Team code first, so outsiders can't probe which usernames exist
    error = check_team_code(request.form.get("team_code", ""))
    if not error:
        if not username or len(username) > 30:
            error = "Username must be 1-30 characters"
        elif len(password) < 6:
            error = "Password must be at least 6 characters"
        elif password != confirmation:
            error = "Passwords don't match"
        elif db.execute("SELECT id FROM users WHERE username = ?", username):
            error = "That username is taken"
    if error:
        return render_template("register.html", error=error, username=username)

    session["user_id"] = db.execute("INSERT INTO users (username, hash) VALUES (?, ?)", username, generate_password_hash(password))
    session["username"] = username
    return redirect("/notationCloud")


@app.route("/logout")
def logout():
    session.clear()
    return redirect("/login")


@app.route("/notationCloud", methods=["GET", "POST"])
@login_required
def notationCloud():
    if request.method == "GET":
        # Newest games first so fresh uploads show up at the top
        return render_template("notationCloud.html", rows=get_games(), folders=get_folders())
    elif request.method == "POST":
        title = request.form.get("titleUpload", "").strip()
        whitePlayer = request.form.get("whitePlayerUpload", "").strip()
        blackPlayer = request.form.get("blackPlayerUpload", "").strip()
        boardNum = request.form.get("boardUpload")
        result = request.form.get("resultUpload")
        wvWin = request.form.get("wvWinUpload")
        date = request.form.get("dateUpload") or None
        event = request.form.get("eventUpload")

        # Server-side checks (the JS in sup.js checks these first)
        if not whitePlayer and not blackPlayer:
            return apology("enter at least one player's name")
        if boardNum not in BOARDS:
            return apology("select the board number")
        if result not in RESULTS:
            return apology("select the result")
        if wvWin not in WV_WIN:
            return apology("select if WVHS won")
        if not event:
            return apology("select the event")

        folderId, folderError = resolve_folder(request.form)
        if folderError:
            return apology(folderError)

        # Files are optional; store NULL when nothing was picked
        png = request.files.get("pngUpload")
        pngName = png.filename if png and png.filename else None
        pngContent = png.read() if pngName else None

        pgn = request.files.get("pgnUpload")
        pgnName = pgn.filename if pgn and pgn.filename else None
        pgnContent = pgn.read() if pgnName else None

        db.execute("INSERT INTO games(user_id, folder_id, title, white_player, black_player, board_number, result, wv_win, date, png_file_name, png_file_data, pgn_file_name, pgn_file_data, event) \
                   VALUES (?, ?, ?, ?, ?, ?, ?, ?, COALESCE(?, CURRENT_DATE), ?, ?, ?, ?, ?)", session["user_id"], folderId, title or None,
                   whitePlayer or "N/A", blackPlayer or "N/A", boardNum, result, wvWin, date, pngName, pngContent, pgnName, pgnContent, event)

        return redirect(url_for("notationCloud"))


@app.route("/")
def index():
    return render_template("index.html")


@app.route("/download/<int:game_id>/<kind>")
@login_required
def download(game_id, kind):
    # kind is "png" or "pgn"
    if kind not in ("png", "pgn"):
        return "File not found", 404

    row = db.execute("SELECT * FROM games WHERE id = ?", game_id)

    # Row or blob can be missing (seed data has no file data)
    if not row or row[0][kind + "_file_data"] is None:
        return "File not found", 404

    filename = row[0][kind + "_file_name"] or f"game_{game_id}.{kind}"
    return send_file(
        io.BytesIO(row[0][kind + "_file_data"]),
        download_name=filename,
        as_attachment=True
    )

@app.route("/search_games", methods=["POST"])
@login_required
def search():
    filters = {
        "g.title": request.form.get("title-query"),
        "g.date": request.form.get("date-query"),
        "g.event": request.form.get("event-query"),
        "g.board_number": request.form.get("board-query"),
        "g.white_player": request.form.get("white-query"),
        "g.black_player": request.form.get("black-query"),
        "g.result": request.form.get("result-query"),
        "g.wv_win": request.form.get("wvwin-query")
    }

    where = "1=1"
    args = []

    for field, value in filters.items():
        if value:
            where += f" AND {field} LIKE ?"
            args.append(f"%{value}%")

    # Folder filter is an exact match: "none" = unfiled, a number = that folder
    folder = request.form.get("folder-query", "")
    if folder == "none":
        where += " AND (g.folder_id IS NULL OR (f.scope = 'personal' AND f.user_id != ?))"
        args.append(session["user_id"])
    elif folder.isdigit():
        where += " AND g.folder_id = ?"
        args.append(int(folder))

    return render_template("games_table.html", rows=get_games(where, *args), folders=get_folders())


#Delete route
@app.route('/delete_game', methods=['POST'])
@login_required
def delete_game():
    game_id = request.form.get("game_id")
    if not game_id:
        return "Missing id", 400

    rows = db.execute("SELECT user_id FROM games WHERE id = ?", game_id)
    if not rows:
        return "Game not found", 404
    if rows[0]["user_id"] != session["user_id"] and not is_coach():
        return "Only the uploader or a coach can delete this game", 403

    try:
        db.execute("DELETE FROM games WHERE id = ?", game_id)
        return "", 204
    except Exception as e:
        print("Deletion error:", e)
        return "Failed to delete game", 500


# == Folders ==

@app.route("/folders/create", methods=["POST"])
@login_required
def create_folder():
    folderId, error = find_or_create_folder(request.form.get("name"), request.form.get("scope"))
    if error:
        return apology(error)
    return redirect(url_for("notationCloud"))


@app.route("/folders/<int:folder_id>/rename", methods=["POST"])
@login_required
def rename_folder(folder_id):
    folder = visible_folder(folder_id)
    if not folder:
        return "Folder not found", 404
    if not can_edit_folder(folder):
        return "Not your folder", 403

    name = request.form.get("name", "").strip()
    if not name or len(name) > FOLDER_NAME_MAX:
        return f"Folder name must be 1-{FOLDER_NAME_MAX} characters", 400
    if db.execute("SELECT id FROM folders WHERE name = ? AND scope = ? AND id != ? AND (scope = 'team' OR user_id = ?)",
                  name, folder["scope"], folder_id, session["user_id"]):
        return "A folder with that name already exists", 409

    db.execute("UPDATE folders SET name = ? WHERE id = ?", name, folder_id)
    return "", 204


@app.route("/folders/<int:folder_id>/delete", methods=["POST"])
@login_required
def delete_folder(folder_id):
    folder = visible_folder(folder_id)
    if not folder:
        return "Folder not found", 404
    if not can_edit_folder(folder):
        return "Not your folder", 403

    # Games are kept, they just become unfiled
    db.execute("UPDATE games SET folder_id = NULL WHERE folder_id = ?", folder_id)
    db.execute("DELETE FROM folders WHERE id = ?", folder_id)
    return "", 204


@app.route("/move_game", methods=["POST"])
@login_required
def move_game():
    game_id = request.form.get("game_id", "")
    folder_id = request.form.get("folder_id", "")

    game = get_games("g.id = ?", game_id) if game_id.isdigit() else []
    if not game:
        return "Game not found", 404
    if game[0]["folder_private"]:
        return "That game is in someone else's personal folder", 403

    if folder_id == "":
        db.execute("UPDATE games SET folder_id = NULL WHERE id = ?", int(game_id))
    elif folder_id.isdigit() and visible_folder(int(folder_id)):
        db.execute("UPDATE games SET folder_id = ? WHERE id = ?", int(folder_id), int(game_id))
    else:
        return "Folder not found", 404
    return "", 204


@app.route("/pgn-maker")
def pgn_maker():
    return render_template("pgn_maker.html")
