from cs50 import SQL
from flask import Flask, flash, redirect, render_template, request, session, send_file, url_for
from flask_session import Session
from werkzeug.security import check_password_hash, generate_password_hash
import io

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


@app.route("/notationCloud", methods=["GET", "POST"])
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

'''
@app.route('/delete_game/<int:game_id>', methods=['POST'])

def delete_game(game_id):
    db.execute("DELETE FROM games WHERE id = ?", game_id)
    return redirect(url_for("notationCloud"))
'''