//Show/hide a collapsible panel and flip its arrow button
function togglePanel(panelId, buttonId){
    var panel = document.getElementById(panelId);
    var button = document.getElementById(buttonId);
    if(panel.style.display != "none") {
        panel.style.display = "none";
        button.textContent = ">";
    } else {
        panel.style.display = "block";
        button.textContent = "∨";
    }

}

//Display the upload panel
function uploadGamePanel(){
    togglePanel("uploadPanel", "uploadGameButton");
}

//Show the new folder name/type fields when "+ New folder..." is picked
document.addEventListener("DOMContentLoaded", function () {
    var folderSelect = document.getElementById("folderUpload");
    if (!folderSelect) return;

    folderSelect.addEventListener("change", function () {
        var isNew = folderSelect.value === "new";
        document.getElementById("newFolderFields").style.display = isNew ? "" : "none";
        if (isNew) document.getElementById("newFolderName").focus();
    });
});

//Check submit fields for game upload (used as the form's onsubmit, so returning false stops the upload)
function checkSubmit(){
    var white = document.getElementById("whitePlayerUpload").value;
    var black = document.getElementById("blackPlayerUpload").value;
    var event = document.getElementById("eventUpload").value;
    var result = document.getElementById("resultUpload").value;
    var wvWin = document.getElementById("wvWinUpload").value;
    var boardNum = document.getElementById("boardUpload").value;

    if ((white.trim() === "") && (black.trim() === ""))
    {
        alert("Please enter at least one players name");
        return false;
    }

    if((event === "") || (event === "undefined") || (event === "Event"))
    {
        alert("Please select the event");
        return false;
    }

    if((result === "") || (result === "undefined") || (result === "Result"))
    {
        alert("Please select the result");
        return false;
    }

    if((wvWin === "") || (wvWin === "undefined") || (wvWin === "WV Win?"))
    {
        alert("Please select if WVHS won");
        return false;
    }

    if((boardNum === "") || (boardNum === "undefined") || (boardNum === "Board #"))
    {
        alert("Please select the board number or alt");
        return false;
    }

    if (document.getElementById("folderUpload").value === "new" && document.getElementById("newFolderName").value.trim() === "")
    {
        alert("Please name the new folder");
        return false;
    }

    var pgnFile = document.getElementById("pgnUpload").files[0];
    if (pgnFile && !pgnFile.name.toLowerCase().endsWith(".pgn"))
    {
        alert("The PGN upload must be a .pgn file");
        return false;
    }

    return true;
}

//PGN autofill: when a .pgn is picked (or attached by the PGN Maker), copy its tag pairs into empty form fields
//Read the [Tag "value"] lines before the movetext. Returns {lowercased tag: value}, skipping unknown/empty values
function parsePgnHeaders(text) {
    var headers = {};
    var lines = text.replace(/^\uFEFF/, "").replace(/\r\n?/g, "\n").split("\n");
    var tagPattern = /\[\s*([A-Za-z0-9_]+)\s+"((?:[^"\\]|\\.)*)"\s*\]/g;

    for (var i = 0; i < lines.length; i++) {
        var line = lines[i].trim();
        if (line === "" || line.charAt(0) === "%") continue; //blank or escape line
        if (line.charAt(0) !== "[") break;                    //movetext starts, headers are over

        var match;
        tagPattern.lastIndex = 0;
        while ((match = tagPattern.exec(line)) !== null) {
            var tag = match[1].toLowerCase();
            var value = match[2].replace(/\\(["\\])/g, "$1").trim();
            if (/^[?.*\s]*$/.test(value) || tag in headers) continue; //"", "?", "????.??.??", Result "*" are unknown
            headers[tag] = value;
        }
    }
    return headers;
}

//A select still showing its disabled placeholder ("Event", "Result"...) counts as unselected
function isSelectUnset(select) {
    return select.selectedIndex < 0 || select.options[select.selectedIndex].disabled || select.value === "";
}

//Find the option matching a PGN value: exact (case-insensitive) on value or text first,
//then the option's text appearing as a whole word in the PGN value (or the reverse); longest label wins
function findPgnOption(select, wanted) {
    var target = wanted.trim().toLowerCase();
    var escape = function (s) { return s.replace(/[.*+?^${}()|[\]\\]/g, "\\$&"); };
    var options = [];
    for (var i = 0; i < select.options.length; i++) {
        if (!select.options[i].disabled) options.push(select.options[i]);
    }

    for (var j = 0; j < options.length; j++) {
        if (options[j].value.trim().toLowerCase() === target || options[j].text.trim().toLowerCase() === target) return options[j];
    }

    var best = null;
    for (var k = 0; k < options.length; k++) {
        var label = options[k].text.trim().toLowerCase();
        if (label === "") continue;
        var labelInTarget = new RegExp("(^|\\W)" + escape(label) + "($|\\W)").test(target);
        var targetInLabel = new RegExp("(^|\\W)" + escape(target) + "($|\\W)").test(label);
        if ((labelInTarget || targetInLabel) && (!best || label.length > best.text.trim().length)) best = options[k];
    }
    return best;
}

//Fill the upload form from parsed headers. Only touches empty/unselected fields. Returns the filled field names
function fillUploadFormFromPgn(headers) {
    var filled = [];
    var byId = function (id) { return document.getElementById(id); };

    var fillText = function (id, value, label) {
        var input = byId(id);
        if (input && value && input.value.trim() === "") {
            input.value = value;
            if (input.value !== "") filled.push(label);
        }
    };
    var fillSelect = function (id, value, label) {
        var select = byId(id);
        if (!select || !value || !isSelectUnset(select)) return;
        var option = findPgnOption(select, value);
        if (option) {
            select.value = option.value;
            filled.push(label);
        }
    };

    fillText("whitePlayerUpload", headers.white, "White");
    fillText("blackPlayerUpload", headers.black, "Black");

    //PGN dates are YYYY.MM.DD, unknown parts are "??"
    var date = /^(\d{4})[.\-\/](\d{2})[.\-\/](\d{2})$/.exec(headers.date || "");
    if (date) fillText("dateUpload", date[1] + "-" + date[2] + "-" + date[3], "Date");

    var results = { "1-0": "1-0", "0-1": "0-1", "1/2-1/2": "0.5-0.5", "0.5-0.5": "0.5-0.5", "½-½": "0.5-0.5" };
    fillSelect("resultUpload", results[(headers.result || "").replace(/\s+/g, "")], "Result");

    fillSelect("eventUpload", headers.event, "Event");
    fillSelect("boardUpload", headers.board, "Board");
    //wvWinUpload is never filled: the PGN can't know which side is ours

    var white = byId("whitePlayerUpload").value.trim();
    var black = byId("blackPlayerUpload").value.trim();
    if ((headers.white || headers.black) && white && black) {
        fillText("titleUpload", (white + " vs " + black).slice(0, 100), "Title");
    }
    return filled;
}

function showPgnAutofillNote(message, detail) {
    var note = document.getElementById("pgnAutofillNote");
    if (!note) return;
    note.textContent = message;
    note.title = detail || "";
}

var pgnAutofillRun = 0;
function autofillFromPgnInput() {
    var input = document.getElementById("pgnUpload");
    var file = input && input.files[0];
    var run = ++pgnAutofillRun;
    if (!file) {
        showPgnAutofillNote("");
        return;
    }

    var reader = new FileReader();
    reader.onload = function () {
        if (run !== pgnAutofillRun) return; //a newer file was picked meanwhile
        var headers = parsePgnHeaders(String(reader.result));
        if (Object.keys(headers).length === 0) {
            showPgnAutofillNote("No usable headers found");
            return;
        }
        var filled = fillUploadFormFromPgn(headers);
        if (filled.length === 0) {
            showPgnAutofillNote("PGN read, no empty fields to fill");
        } else {
            showPgnAutofillNote("Filled " + filled.length + " field" + (filled.length === 1 ? "" : "s") + " from PGN", filled.join(", "));
        }
    };
    reader.onerror = function () {
        if (run === pgnAutofillRun) showPgnAutofillNote("Couldn't read the PGN file");
    };
    reader.readAsText(file.slice(0, 65536)); //headers are at the top, no need to read a huge file
}

document.addEventListener("DOMContentLoaded", function () {
    var pgnInput = document.getElementById("pgnUpload");
    if (pgnInput) pgnInput.addEventListener("change", autofillFromPgnInput);
});

//Window Opening for analysis
  document.addEventListener('DOMContentLoaded', function() {
    document.getElementById('button-analysis').addEventListener('click', function(e) {
      e.preventDefault();
      window.open(
        'https://lichess.org/analysis/standard#0',
        'LichessAnalysis',
        'width=900,height=700,top=100,left=100,resizable=yes,scrollbars=yes'
      );
    });
  });

//View button: open the game's stored PGN on the Lichess analysis board, moves loaded
function pgnMovetext(pgn) {
    return pgn.replace(/^﻿/, "")
        .split(/\r?\n/)
        .filter(line => !/^\s*(\[|%)/.test(line)) //drop header tags and escape lines
        .join(" ")
        .replace(/\s+(1-0|0-1|1\/2-1\/2|\*)\s*$/, "") //trailing result breaks the URL path
        .replace(/\s+/g, " ")
        .trim();
}

document.addEventListener("click", function (e) {
    const button = e.target.closest(".view-game");
    if (!button) return;

    //open the window now (inside the click) so popup blockers allow it, then point it at the game
    const win = window.open("", "LichessAnalysis", "width=900,height=700,top=100,left=100,resizable=yes,scrollbars=yes");
    fetch(`/download/${button.dataset.id}/pgn`)
    .then(response => {
        if (!response.ok) throw new Error("PGN download failed");
        return response.text();
    })
    .then(pgn => {
        const moves = pgnMovetext(pgn);
        const url = "https://lichess.org/analysis" + (moves ? "/pgn/" + encodeURIComponent(moves) : "");
        if (win) win.location.href = url;
        else window.open(url, "_blank");
    })
    .catch(err => {
        console.error(err);
        if (win) win.close();
        alert("Couldn't load this game's PGN.");
    });
});


//Search query 
document.addEventListener("DOMContentLoaded", function () {
    const form = document.getElementById("search-form");
    const fullTable = document.getElementById("full-table");
    const searchedTable = document.getElementById("searched-table");

    let timeout = null;

    form.addEventListener("input", function () {
        clearTimeout(timeout);  

        timeout = setTimeout(() => {
            const formData = new FormData(form);

            let allEmpty = true;
            for (const value of formData.values()) {
                if (value.trim() !== "") {
                    allEmpty = false;
                    break;
                }
            }

            if (allEmpty) {
                fullTable.style.display = "";
                searchedTable.style.display = "none";
                searchedTable.innerHTML = ""; 
                document.getElementById("load-more-wrapper").style.display = "";
                return; //Exit if null
            }

            fetch("/search_games", {
                method: "POST",
                body: formData
            })
            .then(response => response.text())
            .then(html => {
                searchedTable.innerHTML = html;
                searchedTable.style.display = "block";
                fullTable.style.display = "none";
                document.getElementById("load-more-wrapper").style.display = "none";
            })
            .catch(err => {
                console.error("Search error:", err);
            });
        }, 300); 
    });
});

//Clear Button for search
document.addEventListener("DOMContentLoaded", function () {
    const clearButton = document.getElementById("clear-search-button");
    const searchInputs = document.querySelectorAll('#search-form input[type="text"]');
    const fullTable = document.getElementById("full-table");
    const searchedTable = document.getElementById("searched-table");

    clearButton.addEventListener("click", function () {
        searchInputs.forEach(input => {
                input.value = '';
        });
        document.getElementById("folder-query").value = "";
        fullTable.style.display = "";
        searchedTable.style.display = "none";
        searchedTable.innerHTML = "";
        document.getElementById("load-more-wrapper").style.display = "";
    });


});


//Delete AJAX
document.addEventListener("DOMContentLoaded", function () {
    document.addEventListener("click", function (e) {
        if (!e.target) return;
        const button = e.target.closest(".delete-button");
        if(!button || !document.body.contains(button)) return;

        const gameId = button.dataset.id;
        if(!gameId) return;

        if (!confirm("Are you sure you want to delete this game?")) return;

        fetch("/delete_game", {
        method: "POST",
        headers: {
            "Content-Type": "application/x-www-form-urlencoded"
        },
        body: `game_id=${encodeURIComponent(gameId)}`
        })
        .then(response => {
        if (response.ok) {
            const rows = document.querySelectorAll(`tr[data-game-id="${gameId}"]`);
            rows.forEach(row => row.remove());        
        } else {
            alert("Failed to delete game.");
        }
        })
        .catch(error => {
        console.error("Delete error:", error);
        });
    
    });
});

//Load More button (rows past 20 start with hidden-row from the template)
document.addEventListener("DOMContentLoaded", () => {
  const loadMoreBtn = document.getElementById("load-more-btn");
  const loadMoreWrapper = document.getElementById("load-more-wrapper");
  const rowsPerClick = 50;

  // Load More button logic
  loadMoreBtn.addEventListener("click", () => {
    const hiddenRows = document.querySelectorAll("#full-table .hidden-row");
    let count = 0;
    for (let row of hiddenRows) {
      row.classList.remove("hidden-row");
      row.style.display = "";
      count++;
      if (count >= rowsPerClick) break;
    }

    // If no more hidden rows, hide the button
    if (document.querySelectorAll("#full-table .hidden-row").length === 0) {
      loadMoreWrapper.style.display = "none";
    }
  });
});


//Move a game to another folder from the Folder column
document.addEventListener("DOMContentLoaded", function () {
    document.addEventListener("change", function (e) {
        const select = e.target.closest(".folder-move");
        if (!select) return;

        const gameId = select.dataset.id;
        const previous = select.dataset.previous !== undefined ? select.dataset.previous : select.defaultValue;

        fetch("/move_game", {
            method: "POST",
            headers: { "Content-Type": "application/x-www-form-urlencoded" },
            body: `game_id=${encodeURIComponent(gameId)}&folder_id=${encodeURIComponent(select.value)}`
        })
        .then(response => {
            if (!response.ok) throw new Error("Move failed");
            // The game can be in both tables, keep every copy in sync
            document.querySelectorAll(`select.folder-move[data-id="${gameId}"]`).forEach(other => {
                other.value = select.value;
                other.dataset.previous = select.value;
            });
        })
        .catch(() => {
            alert("Failed to move game.");
            select.value = previous;
        });
    });

    // Remember each dropdown's value so a failed move can be undone
    document.addEventListener("focusin", function (e) {
        const select = e.target.closest(".folder-move");
        if (select) select.dataset.previous = select.value;
    });
});

//Folder panel buttons: open (filter games), rename, delete
document.addEventListener("DOMContentLoaded", function () {
    document.addEventListener("click", function (e) {
        const openBtn = e.target.closest(".folder-open");
        const renameBtn = e.target.closest(".folder-rename");
        const deleteBtn = e.target.closest(".folder-delete");

        if (openBtn) {
            const searchForm = document.getElementById("search-form");
            document.getElementById("folder-query").value = openBtn.dataset.id;
            searchForm.dispatchEvent(new Event("input"));
            searchForm.scrollIntoView({ behavior: "smooth" });
        }

        if (renameBtn) {
            const nameCell = renameBtn.closest("tr").querySelector(".folder-name");
            const name = prompt("Rename folder:", nameCell.textContent);
            if (name === null || name.trim() === "") return;

            fetch(`/folders/${renameBtn.dataset.id}/rename`, {
                method: "POST",
                headers: { "Content-Type": "application/x-www-form-urlencoded" },
                body: `name=${encodeURIComponent(name.trim())}`
            })
            .then(response => {
                if (response.ok) location.reload();
                else response.text().then(msg => alert(msg));
            });
        }

        if (deleteBtn) {
            const count = deleteBtn.dataset.count;
            if (!confirm(`Delete this folder? Its ${count} game(s) will be kept but become unfiled.`)) return;

            fetch(`/folders/${deleteBtn.dataset.id}/delete`, { method: "POST" })
            .then(response => {
                if (response.ok) location.reload();
                else response.text().then(msg => alert(msg));
            });
        }
    });
});


function openPgnMaker()
{
  window.open('/pgn-maker', 'PGNMakerWindow', 'width=800,height=600,resizable=yes')
}

/*
function openPgnMaker()
{
      window.open(
        'https://lichess.org/analysis/standard#0',
        'LichessAnalysis',
        'width=900,height=700,top=100,left=100,resizable=yes,scrollbars=yes'
      );
  
}
*/