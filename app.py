from cs50 import SQL
from flask import Flask, flash, redirect, render_template, request, session, send_file, url_for
from flask_session import Session
from werkzeug.security import check_password_hash, generate_password_hash
import io
from helpers import login_required

# Configure application
app = Flask(__name__)

# Configure session to use filesystem (instead of signed cookies)
app.config["SESSION_PERMANENT"] = False
app.config["SESSION_TYPE"] = "filesystem"
Session(app)

# Configure CS50 Library to use SQLite database
db = SQL("sqlite:///cloud.db")

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
        #Ensure username was submitted
        if not request.form.get("username"):
            return redirect("login.html")

        # Ensure password was submitted
        elif not request.form.get("password"):
            return redirect("login.html")

                # Query database for username
        rows = db.execute(
            "SELECT * FROM users WHERE username = ?", request.form.get("username")
        )

        # Ensure username exists and password is correct
        if len(rows) != 1 or not check_password_hash(
            rows[0]["hash"], request.form.get("password")
        ):
            return redirect("login.html")

        # Remember which user has logged in
        session["user_id"] = rows[0]["id"]

        # Redirect user to cloud
        return redirect("/notationCloud")


@app.route("/notationCloud", methods=["GET", "POST"])
#@login_required
def notationCloud():
    print("ROUTE ENTERED")
    if request.method == "GET":
        rows = db.execute("SELECT * FROM games")
        return render_template("notationCloud.html", rows=rows)
    elif request.method == "POST":
        print("POST entered")
        whitePlayer = request.form.get("whitePlayerUpload")
        blackPlayer = request.form.get("blackPlayerUpload")
        boardNum = request.form.get("boardUpload")
        result = request.form.get("resultUpload")
        wvWin = request.form.get("wvWinUpload")
        date = request.form.get("dateUpload")

        png = request.files["pngUpload"]
        print("PNG: ", png)

        pngName = png.filename
        print("PNG NAME: ", pngName)

        pngContent = png.read()
        #print("PNG CONTENT: ", pngContent)

        pgn = request.files["pgnUpload"]
        print("PGN: ", pgn)

        pgnName = pgn.filename
        print("PGN NAME: ", pgnName)

        pgnContent = pgn.read()
        #print("PGN Content: ", pgnContent)

        event = request.form.get("eventUpload")
        print("Post finished")

        db.execute("INSERT INTO games(white_player, black_player, board_number, result, wv_win, date, png_file_name, png_file_data, pgn_file_name, pgn_file_data, event) \
                   VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)", whitePlayer, blackPlayer, boardNum, result, wvWin, date, pngName, pngContent, pgnName, pgnContent, event);

        return redirect(url_for("notationCloud"))


@app.route("/")
def index():
    return render_template("index.html")


@app.route("/download/<filename>")
def download(filename):
    row = ""
    if (filename.casefold().endswith(".png")):
        row = db.execute("SELECT * FROM games WHERE png_file_name = :name", name=filename)
    else:
        row = db.execute("SELECT * FROM games WHERE pgn_file_name = :name", name=filename)

    if row:
        file_data = ""
        if (filename.casefold().endswith(".png")):
            file_data = row[0]['png_file_data']
        else:
            file_data = row[0]['pgn_file_data']

        return send_file(
            io.BytesIO(file_data),
            download_name=filename,
            as_attachment=True
        )
    return "File not found", 404

@app.route("/search_games", methods=["POST"])
def search():
    filters = {
        "date": request.form.get("date-query"),
        "event": request.form.get("event-query"),
        "board_number": request.form.get("board-query"),
        "white_player": request.form.get("white-query"),
        "black_player": request.form.get("black-query"),
        "result": request.form.get("result-query"),
        "wv_win": request.form.get("wvwin-query")
    }

    print("Filters received:", filters)

    query = "SELECT * FROM games WHERE 1=1"
    args = []

    for field, value in filters.items():
        if value:
            query += f" AND {field} LIKE ?"
            args.append(f"%{value}%")  

    rows = db.execute(query, *args)
    print(f"Found {len(rows)} rows")

    return render_template("games_table.html", rows=rows)


#Delete route
@app.route('/delete_game', methods=['POST'])
def delete_game():
    game_id = request.form.get("game_id");
    if not game_id:
        return "Missing id", 400;

    try:
        db.execute("DELETE FROM games WHERE id = ?", game_id)
        return "", 204  
    except Exception as e:
        print("Deletion error:", e)
        return "Failed to delete game", 500
    

@app.route("/pgn-maker")
def pgn_maker():
    return render_template("pgn_maker.html")
