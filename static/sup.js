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