var redirect_uri = "";
var client_id = "";
var client_secret = "";
var access_token = null;
var refresh_token = null;
const AUTHORIZE = "https://accounts.spotify.com/authorize";
const TOKEN = "https://accounts.spotify.com/api/token";
let currentArtist = "";
let currentSong = "";
let count = 0;

/**
 * Description: When page loads, checks if there are query parameters in the url.
 * Post-Condition: If there are query parameters in the url, a redirect is handled.
 */
function onPageLoad(){
    redirect_uri = localStorage.getItem("redirect_uri");
    client_id = localStorage.getItem("client_id");
    client_secret = localStorage.getItem("client_secret");

    // calls a redirect if there are query parameters in the url
    if(window.location.search.length > 0){
        handleRedirect();
    }
}

/**
 * Description: Requests authorization from the user's Spotify account.
 * Post-Condition: Opens a window asking the user to authorize access to their Spotify account.
 */
function requestAuthorization(){
    localStorage.setItem("redirect_uri", redirect_uri)
    localStorage.setItem("client_id", client_id);
    localStorage.setItem("client_secret", client_secret);
    let url = AUTHORIZE;
    url += "?client_id=" + client_id;
    url += "&response_type=code";
    url += "&redirect_uri=" + encodeURI(redirect_uri);
    url += "&show_dialog=true";
    window.location.href = url;
}

/**
 * Description: Handles a redirect.
 * Post-Condition: A code is obtained and an access token is fetched.
 */
function handleRedirect(){
    let code = getCode();
    fetchAccessToken(code);
    window.history.pushState("", "", redirect_uri);
}

/**
 * Description: Gets code.
 * Post-Condition: Code is returned.
 */
function getCode(){
    let code = null;
    const queryString = window.location.search;
    if(queryString.length > 0){
        const urlParams = new URLSearchParams(queryString);
        code = urlParams.get('code');
    }
    return code;
}

/**
 * Description: Fetches access token.
 * Post-Condition: Calls API authorization.
 */
function fetchAccessToken(code){
    let body = "grant_type=authorization_code";
    body += "&code=" + code;
    body += "&redirect_uri=" + encodeURI(redirect_uri);
    body += "&client_id=" + client_id;
    body += "&client_secret=" + client_secret;
    callAuthorizationApi(body);
}

/**
 * Description: Authorizes Spotify API.
 */
function callAuthorizationApi(body){
    let xhr = new XMLHttpRequest();
    xhr.open("POST", TOKEN, true);
    xhr.setRequestHeader('Content-Type', 'application/x-www-form-urlencoded');
    xhr.setRequestHeader('Authorization', 'Basic ' + btoa(client_id + ":" + client_secret));
    xhr.send(body);
    xhr.onload = handleAuthorizationResponse;
}

/**
 * Description: Handles the authorization response for the Spotify API.
 * Post-Condition: The API will either be authorized or an alert will be displayed explaining the error.
 */
function handleAuthorizationResponse(){
    // authorization is successful
    if(this.status == 200){
        document.getElementById("submitButton").disabled = false;
        var data = JSON.parse(this.responseText);
        var data = JSON.parse(this.responseText);
        if(data.access_token != undefined){
            access_token = data.access_token;
            localStorage.setItem("access_token", access_token);
        }
        if(data.refresh_token != undefined){
            refresh_token = data.refresh_token;
            localStorage.setItem("refresh_token", refresh_token);
        }
        onPageLoad();
    }
    // authorization is unsuccessful
    else{
        document.getElementById("submitButton").disabled = true;
        alert("Failed to sign in. You must click AGREE for the sign in to work.");
    }
}

/**
 * Description: Access token is refreshed.
 * Post-Condition: Calls API authorization.
 */
function refreshAccessToken(){
    refresh_token = localStorage.getItem("refresh_token");
    let body = "grant_type=refresh_token";
    body += "&refresh_token=" + refresh_token;
    body += "&client_id=" + client_id;
    callAuthorizationApi(body);
}

/**
 * Description: Gets a song based on the values in the text boxes.
 * Pre-Condition: Song must exist in Spotify's database.
 */
function getTrack(){
    let song = document.getElementById("enterSong").value;
    let artist = document.getElementById("enterArtist").value;
    song = song.replace(" ", "%20");
    artist = artist.replace(" ", "%20");
    let value = "https://api.spotify.com/v1/search?q=track:" + song + "+artist:" + artist + "&type=track&limit=1";
    callApi("GET", value, getTrackResponse);
}

/**
 * Description: Obtains the Spotify ID's for the requested song and artist.
 * Pre-Condition: The getTrack() request must be successful.
 */
function getTrackResponse(){
    // track request is successful
    if(this.status == 200){
        var data = JSON.parse(this.responseText);
        currentArtist = data.tracks.items[0].artists[0].id;
        currentSong = data.tracks.items[0].id;
    }
    // access token needs to be refreshed
    else if(this.status == 401){
        refreshAccessToken();
        getTrack();
    }
    // unexpected error. searches for track again
    else{
        getTrack();
    }
}

/**
 * Description: Gets song recommendations based on the entered song.
 * Pre-Condition: The entered song must be valid.
 */
function getRecommendations(){
    let value = "https://api.spotify.com/v1/recommendations?limit=30&seed_artists=" + currentArtist + "&seed_tracks=" + currentSong;
    callApi("GET", value, getRecommendationsResponse);
}

/**
 * Description: Gets the entered track and finds recommendations when the button is pressed.
 */
function buttonPressed(){
    count = 0;
    currentArtist = "";
    currentSong = "";
    getTrack();
    getRecommendations();
}

/**
 * Description: Sets the client id and client secret.
 * Pre-Condition: The client id and client secret that are entered must be valid.
 * Post-Condition: If the entered credentials are valid, the website will be usable.
 *                 If the entered credentials are invalid, an alert will appear.
 */
function login(){
    redirect_uri = "https://matthewperrywa.github.io/similar-song-finder/";
    client_id = "07a9400ad65da20926243d20d5e757b1";
    client_secret = "932cbe54cde8d10bbca4a3263598a3c2";
    client_id = client_id.split("").reverse().join("");
    client_secret = client_secret.split("").reverse().join("");
    requestAuthorization();
}

/**
 * Description: Adds the song recommendations to a list.
 * Pre-Condition: The getRecommendations() request must be successful.
 * Post-Condition: The song recommendations are displayed on the webpage.
 */
function getRecommendationsResponse(){
    // recommendation is successful
    if(this.status == 200){
        var data = JSON.parse(this.responseText);
        let songList = document.getElementById("songList");
        let songs = document.querySelectorAll("#songList li");
        for(let i = 0; i < songs.length; i+=1){
            songList.removeChild(songs[i]);
        }
        for(let i = 0; i < 30; i+=1){
            let li = document.createElement("li");
            li.innerText = data.tracks[i].artists[0].name + " - " + data.tracks[i].name;
            document.getElementById("songList").appendChild(li);
        }
    }
    // access token needs to be refreshed
    else if(this.status == 401){
        refreshAccessToken();
        getRecommendations();
    }
    // error. either track has not been found yet or it does not exist
    else{
        // the getRecommendations() method is called several more times in case the getTrack() method hasn't completed yet
        if(count < 10){
            getRecommendations();
            count = count + 1;
        }
        // if a track is not found, an alert is displayed
        else{
            alert("Song not found in Spotify's database. Check artist and song spelling or try a different song.");
        }
    }
}

/**
 * Description: Makes API method calls.
 */
function callApi(method, url, callback){
    let xhr = new XMLHttpRequest();
    xhr.open(method, url, true);
    xhr.setRequestHeader("Accept", "application/json");
    xhr.setRequestHeader("Content-Type", "application/json");
    xhr.setRequestHeader("Authorization", "Bearer " + access_token);
    xhr.send();
    xhr.onload = callback;
}