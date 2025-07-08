//Display the upload panel
function uploadGamePanel(){
    var panel = document.getElementById("uploadPanel");
    var button = document.getElementById("uploadGameButton");
    if(panel.style.display != "none") {
        panel.style.display = "none";
        button.textContent = ">";
    } else {
        panel.style.display = "block";
        button.textContent = "∨";
    }

}

//Check submit fields for game upload
function checkSubmit(){
    var white = document.getElementById("whitePlayerUpload").value;
    var black = document.getElementById("blackPlayerUpload").value;
    var event = document.getElementById("eventUpload").value;
    var result = document.getElementById("resultUpload").value;
    var wvWin = document.getElementById("wvWinUpload").value;
    var boardNum = document.getElementById("boardUpload").value;

    if (((white === "") || (white === "undefined")) && ((black === "") || (black === "undefined")))
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

    var form = document.getElementById("gameUploadForm");
    form.submit();
}

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
                fullTable.style.display = "block";
                searchedTable.style.display = "none";
                searchedTable.innerHTML = ""; 
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
        fullTable.style.display = "block";
        searchedTable.style.display = "none";
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

document.addEventListener("DOMContentLoaded", () => {
  const searchInputs = document.querySelectorAll("table.search-bar input");
  const tableRows = document.querySelectorAll("#full-table tbody tr");
  const loadMoreBtn = document.getElementById("load-more-btn");
  const loadMoreWrapper = document.getElementById("load-more-wrapper");
  const rowsPerClick = 50;

  function isSearchActive() {
    return Array.from(searchInputs).some(input => input.value.trim() !== "");
  }

  function filterRows() {
    const filters = {};
    searchInputs.forEach(input => {
      filters[input.name] = input.value.trim().toLowerCase();
    });

    if (isSearchActive()) {
      // Show all rows for searching
      tableRows.forEach(row => {
        row.classList.remove("hidden-row");
        const cells = row.querySelectorAll("td");

        const match = (!filters.date || cells[0].textContent.toLowerCase().includes(filters.date)) &&
                      (!filters.event || cells[1].textContent.toLowerCase().includes(filters.event)) &&
                      (!filters.board || cells[2].textContent.toLowerCase().includes(filters.board)) &&
                      (!filters.white || cells[3].textContent.toLowerCase().includes(filters.white)) &&
                      (!filters.black || cells[4].textContent.toLowerCase().includes(filters.black)) &&
                      (!filters.result || cells[5].textContent.toLowerCase().includes(filters.result)) &&
                      (!filters.wv_win || cells[6].textContent.toLowerCase().includes(filters.wv_win));

        row.style.display = match ? "" : "none";
      });

      loadMoreWrapper.style.display = "none";
    } else {
      // Reset view if no search
      tableRows.forEach((row, index) => {
        row.style.display = index < 20 ? "" : "none";
        if (index >= 20) row.classList.add("hidden-row");
      });
      loadMoreWrapper.style.display = "block";
    }
  }

  // Hook up input event to each search box
  searchInputs.forEach(input => {
    input.addEventListener("input", filterRows);
  });

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