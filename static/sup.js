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