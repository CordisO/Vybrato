/* ------------------------------------------
   SPOTIFY APP – MAIN SCRIPT (PKCE VERSION)
   ------------------------------------------ */

const CLIENT_ID = "2fe7c17371964a1290b5af802b2eaa23"; // 👈 Put your real Client ID here!
const REDIRECT_URI = "https://vybrato.netlify.app/vybrato.html";

// Helper to get 'code' from URL after login redirect
function getAuthCode() {
    return new URLSearchParams(window.location.search).get("code");
}

document.addEventListener("DOMContentLoaded", async () => {
    const storedToken = localStorage.getItem("spotify_token");
    const code = getAuthCode();

    let token = storedToken;

    // 1. If we just got redirected back with a code, exchange it for a token
    if (code) {
        token = await exchangeCodeForToken(code);
    }

    // 2. If no token exists, show the login button
    if (!token) {
        addSpotifyLoginButton();
        return;
    }

    // 3. We have a token! Load the data
    fetchUserProfile(token);
    fetchTopArtists(token);
    fetchRecentlyPlayed(token);
    fetchUserPlaylists(token);
    fetchTrending(token);
});

/* --- AUTHENTICATION LOGIC --- */

function addSpotifyLoginButton() {
    const navbar = document.querySelector(".navbar");
    if (!navbar || document.querySelector('.login-button')) return;

    const btn = document.createElement("button");
    btn.textContent = "Connect to Spotify";
    btn.className = "login-button";
    btn.addEventListener("click", authenticateWithSpotify);
    navbar.appendChild(btn);
}

async function generatePKCE() {
    const array = new Uint32Array(56);
    window.crypto.getRandomValues(array);
    const verifier = Array.from(array, dec => ('0' + dec.toString(16)).substr(-2)).join('');

    const encoder = new TextEncoder();
    const data = encoder.encode(verifier);
    const digest = await crypto.subtle.digest('SHA-256', data);

    const challenge = btoa(String.fromCharCode(...new Uint8Array(digest)))
        .replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '');

    localStorage.setItem("pkce_verifier", verifier);
    return challenge;
}

async function authenticateWithSpotify() {
    const scopes = ["user-read-private", "user-read-email", "user-top-read", "user-read-recently-played"];
    const challenge = await generatePKCE();

    const url = "https://accounts.spotify.com/authorize" +
        "?client_id=" + CLIENT_ID +
        "&response_type=code" +
        "&redirect_uri=" + encodeURIComponent(REDIRECT_URI) +
        "&scope=" + encodeURIComponent(scopes.join(" ")) +
        "&code_challenge_method=S256" +
        "&code_challenge=" + challenge;

    window.location.href = url;
}

async function exchangeCodeForToken(code) {
    const verifier = localStorage.getItem("pkce_verifier");

    const body = new URLSearchParams({
        client_id: CLIENT_ID,
        grant_type: "authorization_code",
        code: code,
        redirect_uri: REDIRECT_URI,
        code_verifier: verifier
    });

    try {
        const response = await fetch("https://accounts.spotify.com/api/token", {
            method: "POST",
            headers: { "Content-Type": "application/x-www-form-urlencoded" },
            body: body
        });

        const data = await response.json();
        if (data.access_token) {
            localStorage.setItem("spotify_token", data.access_token);
            // Clean the URL
            window.history.replaceState({}, document.title, window.location.pathname);
            return data.access_token;
        }
    } catch (err) {
        console.error("Token exchange failed:", err);
    }
}

/* --- API DATA FETCHING --- */

function fetchUserProfile(token) {
    fetch("https://api.spotify.com/v1/me", {
        headers: { Authorization: `Bearer ${token}` }
    })
    .then(res => res.ok ? res.json() : Promise.reject(res))
    .then(data => {
        const title = document.querySelector(".navbar h1");
        if (title) title.textContent = `Vybrato ↬ ${data.display_name || data.id}`;
    })
    .catch(() => {
        localStorage.removeItem("spotify_token");
        addSpotifyLoginButton();
    });
}

function fetchTopArtists(token) {
    fetch("https://api.spotify.com/v1/me/top/artists?limit=10", {
        headers: { Authorization: `Bearer ${token}` }
    })
    .then(res => res.json())
    .then(data => displayTopArtists(data.items))
    .catch(err => console.error(err));
}

function fetchRecentlyPlayed(token) {
    fetch("https://api.spotify.com/v1/me/player/recently-played", {
        headers: { Authorization: `Bearer ${token}` }
    })
    .then(res => res.json())
    .then(data => displayRecentlyPlayed(data.items))
    .catch(err => console.error(err));
}

function fetchUserPlaylists(token) {
    fetch("https://api.spotify.com/v1/me/playlists", {
        headers: { Authorization: `Bearer ${token}` }
    })
    .then(res => res.json())
    .then(data => displayUserPlaylists(data.items))
    .catch(err => console.error(err));
}

function fetchTrending(token) {
    fetch("https://api.spotify.com/v1/browse/new-releases", {
        headers: { Authorization: `Bearer ${token}` }
    })
    .then(res => res.json())
    .then(data => displayTrending(data.albums.items))
    .catch(err => console.error(err));
}

/* --- UI DISPLAY FUNCTIONS --- */
// (Keep your existing displayTopArtists, displayRecentlyPlayed, displayUserPlaylists, and displayTrending logic here - they were already great!)

function displayTopArtists(artists) {
    const container = document.getElementById("artists-container");
    if (!container) return;
    container.innerHTML = ""; 
    artists.forEach(artist => {
        const card = document.createElement("div");
        card.className = "card";
        card.innerHTML = `
            <img src="${artist.images[0]?.url || 'placeholder.jpg'}" alt="${artist.name}">
            <h3>${artist.name}</h3>
            <button class="follow-btn">Follow</button>
        `;
        container.appendChild(card);
    });
}

function displayRecentlyPlayed(tracks) {
    const container = document.getElementById("recent-container");
    if (!container) return;
    container.innerHTML = "";
    tracks.forEach(item => {
        const track = item.track;
        const card = document.createElement("div");
        card.className = "card";
        card.innerHTML = `
            <img src="${track.album.images[0]?.url || 'placeholder.jpg'}" alt="${track.name}">
            <h3>${track.name}</h3>
            <p>${track.artists.map(a => a.name).join(", ")}</p>
            <button class="play-button" onclick="window.open('${track.external_urls.spotify}', '_blank')">Play</button>
        `;
        container.appendChild(card);
    });
}

function displayUserPlaylists(playlists) {
    const container = document.getElementById("playlists-container");
    if (!container) return;
    container.innerHTML = "";
    playlists.forEach(playlist => {
        const card = document.createElement("div");
        card.className = "card";
        card.innerHTML = `
            <img src="${playlist.images[0]?.url || 'placeholder.jpg'}" alt="${playlist.name}">
            <h3>${playlist.name}</h3>
            <p>${playlist.tracks.total} tracks</p>
            <button class="play-button" onclick="window.open('${playlist.external_urls.spotify}', '_blank')">Open</button>
        `;
        container.appendChild(card);
    });
}

function displayTrending(albums) {
  const container = document.getElementById("trending-container");
  if (!container) return;
  container.innerHTML = "";
  albums.forEach(album => {
    const card = document.createElement("div");
    card.className = "card";
    card.innerHTML = `
        <img src="${album.images[0]?.url || 'placeholder.jpg'}" alt="${album.name}">
        <h3>${album.name}</h3>
        <p>${album.artists.map(a => a.name).join(", ")}</p>
        <a href="${album.external_urls.spotify}" target="_blank">Open in Spotify</a>
    `;
    container.appendChild(card);
  });
}
