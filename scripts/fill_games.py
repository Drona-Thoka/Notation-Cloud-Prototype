from cs50 import SQL
from random import choice, randint
from datetime import datetime, timedelta
import os

# Resolve cloud.db relative to this script so it works from any cwd
DB_PATH = os.path.join(os.path.dirname(os.path.abspath(__file__)), "..", "cloud.db")
db = SQL("sqlite:///" + os.path.normpath(DB_PATH))

players = ["Aryan", "Arnav", "Ria", "Christian", "Soham", "Ben", "Akshath", "Boris"]
events = ["DVC", "USCF", "State", "Friendly"]
results = ["1-0", "0-1", "0.5-0.5"]
wv_win = ["Yes"]

start_date = datetime.today()
NUM_ENTRIES = 100

for i in range(NUM_ENTRIES):
    white = choice(players)
    black = choice(players)
    
    #aviod duplicates
    while black == white:
        black = choice(players)

    game = {
        "white" : white,
        "black" : black,
        "board": randint(1,9),
        "result": choice(results),
        "wv_win": choice(wv_win),
        "date": start_date,
        "png_file_name": "a.png",
        "pgn_file_name": "a.pgn",
        "event": choice(events),
    }

    db.execute("""
            INSERT INTO games (
            white_player, black_player, board_number, result, wv_win, date,
            png_file_name, 
            pgn_file_name, 
            event
        )
        VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
        """, game["white"], game["black"], game["board"], game["result"], game["wv_win"],
         game["date"], game["png_file_name"], game["pgn_file_name"], game["event"])

print("Inserted 100 dummy games.")