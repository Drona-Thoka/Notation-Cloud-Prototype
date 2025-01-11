# Notation-Cloud-Prototype

<hr>

### Description: A majority of chess events require one to take notation of their moves. Analysising a game is key to improving your skills, with enough games notated you'll start to lose track and not realize the common patterns where you win/lose. This web application keeps a clean record of all your games by providing a form for submission and a section for storage, containing fields that allow you to use a chess engine like stockfish to anyalze your game. This site was tailored to be a prototype for WVHS chess, supporting feilds that often don't get written down.

<hr>

## The Future:

### Future Work: Its important to note the sections that follow reference a polished complete version of the application which would contain many more features. For now I created a simpler prototype which aims to model how the site would operate and provide something which is functional in practice. Many features are left to be added and suggestions for implementation will be provided:

### 1. Dependancies
```python
@app.route("/notationCloud", methods=["GET", "POST"])
def notationCloud():
    print("ROUTE ENTERED")
    if request.method == "GET":
        #LOOK HERE
        rows = db.execute("SELECT * FROM games")
        return render_template("notationCloud.html", rows=rows)
    elif request.method == "POST":
        #...
```
#### Currently the site operates on hard coded SQLite3 queries that function off of CS50X's SQL library, a depdancy that must be changed in a final deployable version. I suspect a similar but more complex library exsists which will be needed to reimplement these queries (which can remian the same).

### 2. Login
```python
@app.route("/notationCloud", methods=["GET", "POST"])
```
#### There is currently no login system in place, a space in the currently implemented SQLite3 table provides compatability to allow for logins, to implement simply create a new table with encrypted user data and use "id" as a **primary key** to "user_id" (in games table) as a **foreign key**

### 3. Delete
```python
        db.execute("INSERT INTO games(white_player, black_player, board_number, result, wv_win, date, png_file_name, png_file_data, pgn_file_name, pgn_file_data, event) \
                   VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)", whitePlayer, blackPlayer, boardNum, result, wvWin, date, pngName, pngContent, pgnName, pgnContent, event);
```
#### There is no functionality to delete items from the site, the only mechanism is to contact the current admin and use (likely phpLiteAdmin) to drop a row as requested. This would require another display fields and a linked querey to implement

### Future Projects: With this site WVHS Chess is given a superior data collection tool than likely any other school in the IHSA. The Coach is significantly less burdened with the propect of maintaining ever growing paper recorded. With is data anyalisis of members or team combinations are made easy, a future anyalasis project is likely to be made to use in tandemn with the site for even stronger improvement to the school.

### Future Upkeep: The site if deployed after some edits would require inconsistent maintainace, for many years to come. I assume a pair of people who could be fairly easyily taught if he/she has even a little programming background by the former student maintainer, who then can upkeep this project for the school. A deployment would cost a small amount of money per year to maintain, however at the cost save of eleminating paper records could offset this. **Overall making the site low maintanance.**

<hr>

### Utilization: I worked to keep the website relativly simple and user freindly for the generations to come. With obvious help from the template, the site reads fairly well.

```
    Once on the landing page scroll down to upload image
```
```
    Then navigate to the upload tab, click the arrow to open a game submission form
```
```
    A game submisssion form represents the key elements of a game, pgn / pgn and date are optional, at least one name must be provided, and all other fields are required, then click submit.
    +-----------------+ +-----------------+
    |White Player Name| |Black Player Name|
    +-----------------+ +-----------------+
```
```
    Once submitted scroll down and your game will be there with its information avalible to download
```
```
    With your pgn simply use chess.com or lichess to view the game and get anyalizing!
```

### Techinal Features
```python
@app.route("/")
def index():
    return render_template("index.html")

```
#### The site operates on 3 http routes, an SQLite3 database, and a little javascript, one route deals with processing the users form and inserting it into an SQLite3 database, another naviagates the user from index.html to the site (pictured), and another handles image / pgn downloading.

### Inspiration: This was inspired by a similar project I contributed to on github, utilizing the same free template.

### Credits:
#### HTML 5 UP! for the html / css template that was modifed.
#### CS50 for its SQL library
#### Created by Drona Thoka from Naperville, Illinois in the United States of America
#### GitHub: CyberFlare7408
#### Dated: January 5 2025
