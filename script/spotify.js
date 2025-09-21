/* ------------------------------------------
   SPOTIFY APP – MAIN SCRIPT
   Author: Cordis (link to portfolio - https://cordis-obiefule.netlify.app/)
   Notes:
   - Code is split into sections.
   - Each section explains clearly what it does.
   ------------------------------------------ */

// When the page loads, check for a valid token or show the login button
document.addEventListener("DOMContentLoaded", () => {
    // Step A: check if we already have a Spotify token (Checks if a Spotify token already exists)
    const token = localStorage.getItem("spotify_token");
    const tokenExpiry = localStorage.getItem("token_expiry");
    const isTokenValid = token && tokenExpiry && Date.now() < parseInt(tokenExpiry);

    if (!isTokenValid) {
        addSpotifyLoginButton(); // If not valid, show login button
    } else {
        fetchUserProfile(token);    // If valid, fetch user profile
        fetchTopArtists(token);
        fetchRecentlyPlayed(token);
        fetchUserPlaylists(token);
        fetchTrending(token)


    }

    // If Spotify redirected back with a token in the URL hash, handle it:
    if (window.location.hash.includes("access_token")) {
        handleCallback();
    }

});

// Step B: Add the login button in the navbar
function addSpotifyLoginButton() {
    const navbar = document.querySelector(".navbar");
    if (!navbar) return;
    if (document.querySelector('.login-button')) return; // don't add twice

    const btn = document.createElement("button");
    btn.textContent = "Connect to Spotify";
    btn.className = "login-button";
    btn.addEventListener("click", authenticateWithSpotify);
    navbar.appendChild(btn);
}

// Step C: Start login process
function authenticateWithSpotify() {
    const clientId = "2fe7c17371964a1290b5af802b2eaa23"; // get this from your Spotify Developer Dashboard
    const redirectUri = "https://vybrato.netlify.app/"; // must exactly match the redirect URI registered
    const scopes = ["user-read-private", "user-read-email", "user-top-read", "user-read-recently-played"];

    const url = "https://accounts.spotify.com/authorize" +
        "?client_id=" + clientId +
        "&response_type=token" +
        "&redirect_uri=" + encodeURIComponent(redirectUri) +
        "&scope=" + encodeURIComponent(scopes.join(" "));

    window.location.href = url; // send user to Spotify login page
}

// Step D: Handle the callback when Spotify sends us back
function handleCallback() {
    const hash = window.location.hash.substring(1); // remove the leading '#'
    const params = new URLSearchParams(hash);

    const accessToken = params.get("access_token");
    const expiresIn = params.get("expires_in");

    if (accessToken) {
        const expiryTime = Date.now() + Number(expiresIn) * 1000;
        localStorage.setItem("spotify_token", accessToken);
        localStorage.setItem("token_expiry", expiryTime);

        // Remove the hash so the URL looks clean
        window.location.hash = "";

        // Optionally redirect to a clean page (or simply call fetchUserProfile)
        window.location.href = "index.html";
    } else {
        // handle errors (e.g., user denied access)
        console.error("Spotify authentication failed or was cancelled.");
    }

}

/* -----------------------------
   2. USER PROFILE
   ----------------------------- */
// Fetch basic Spotify profile info
// Displays: username + profile image

// Step E: Fetch the user’s profile
function fetchUserProfile(token) {
    fetch("https://api.spotify.com/v1/me", {
        headers: { Authorization: "Bearer " + token }
    })
    .then(res => {
        if (!res.ok) throw new Error("Token invalid or expired"); // handle 401 errors to check if token is still valid
        return res.json();
    })
    .then(data => {
        // show name in navbar
        const title = document.querySelector(".navbar h1");
        if (title) title.textContent = `Vybrato ↬ ${data.display_name || data.id}`;
    })
    .catch(err => {
        console.error("Error fetching profile:", err);
        localStorage.removeItem("spotify_token");
        localStorage.removeItem("token_expiry");
        addSpotifyLoginButton();
    });
}
// Additional functions to fetch and display user data can be added here


// Step F: Fetch the Top Artists from the users' account
function fetchTopArtists(token) {
    fetch("https://api.spotify.com/v1/me/top/artists?limit=10", { //?limit=10 means request for ten artists from users' top artists
        headers: { Authorization: "Bearer " + token }
    })
    .then(res => {
        if (!res.ok) throw new Error("Failed to fetch top artists");
        return res.json();
    })
    .then(data => {
        displayTopArtists(data.items);
    })
    .catch(err => {
        console.error("Error fetching top artists:", err);
    });
}

// Step G: Display the Top Artists from the users' account
function displayTopArtists(artists) {
    const container = document.getElementById("artists-container");
    if (!container) return;

    container.innerHTML = ""; // clear old content

    artists.forEach(artist => {
        const card = document.createElement("div");
        card.className = "card";

        const img = document.createElement("img");
        img.src = artist.images[0]?.url || "placeholder.jpg";
        img.alt = artist.name;

        const h3 = document.createElement("h3");
        h3.textContent = artist.name;

        const button = document.createElement("button");
        button.textContent = "Follow"; 
        button.className = "follow-btn";

        // Put them together
        card.appendChild(img);
        card.appendChild(h3);
        card.appendChild(button);

        container.appendChild(card);
    });
}

// Step H: Fetch recently played data from the users' account
function fetchRecentlyPlayed(token) {
    fetch("https://api.spotify.com/v1/me/player/recently-played?limit=20", {
        headers: { Authorization: "Bearer " + token }
    })
    .then(res => {
        if (!res.ok) throw new Error("Failed to fetch recently played tracks");
        return res.json();
    })
    .then(data => {
        displayRecentlyPlayed(data.items);
    })
    .catch(err => {
        console.error("Error fetching recently played:", err);
        // Show error in container
        const container = document.getElementById("recent-container");
        if (container) {
            container.innerHTML = '<div class="loading">Unable to load recently played tracks</div>';
        }
    });
}

// Step I: Display the recently played data
function displayRecentlyPlayed(tracks) {
    const container = document.getElementById("recent-container");
    if (!container) return;

    container.innerHTML = ""; // Clear loading content

    tracks.forEach(item => {
        const track = item.track;
        const card = document.createElement("div");
        card.className = "card";

        // Track image
        const img = document.createElement("img");
        img.src = track.album.images[0]?.url || "placeholder.jpg";
        img.alt = track.name;

        // Track name
        const h3 = document.createElement("h3");
        h3.textContent = track.name;

        // Artist name
        const p = document.createElement("p");
        p.textContent = track.artists.map(artist => artist.name).join(", ");

        // Play button
        const button = document.createElement("button");
        button.textContent = "Play";
        button.className = "play-button";
        
        // Add click handler for play button
        button.addEventListener('click', () => {
            if (track.external_urls.spotify) {
                window.open(track.external_urls.spotify, '_blank');
            }
        });

        // Assemble card
        card.appendChild(img);
        card.appendChild(h3);
        card.appendChild(p);
        card.appendChild(button);

        container.appendChild(card);
    });

    // Debug info
    console.log(`Loaded ${tracks.length} recently played tracks`);
}


// Step J: Fetch User Playlists
function fetchUserPlaylists(token) {
    console.log("🎵 Fetching user playlists...");
    
    fetch("https://api.spotify.com/v1/me/playlists?limit=20", {
        headers: { 
            Authorization: "Bearer " + token,
            "Content-Type": "application/json"
        }
    })
    .then(res => {
        console.log("Playlists response status:", res.status);
        
        if (!res.ok) {
            return res.json().then(errorData => {
                console.error("Playlists API Error Details:", errorData);
                throw new Error(`HTTP ${res.status}: ${errorData.error?.message || 'Unknown error'}`);
            }).catch(() => {
                throw new Error(`HTTP ${res.status}: ${res.statusText}`);
            });
        }
        return res.json();
    })
    .then(data => {
        console.log("User playlists data:", data);
        if (data.items && data.items.length > 0) {
            displayUserPlaylists(data.items);
        } else {
            console.warn("No playlists found");
            const container = document.getElementById("playlists-container");
            if (container) {
                container.innerHTML = '<div class="loading">No playlists found. Create some playlists in Spotify first!</div>';
            }
        }
    })
    .catch(err => {
        console.error("Error fetching playlists:", err);
        const container = document.getElementById("playlists-container");
        if (container) {
            let errorMsg = "Unable to load playlists";
            if (err.message.includes("403")) {
                errorMsg = "Permission denied. Please re-authenticate with Spotify.";
            } else if (err.message.includes("401")) {
                errorMsg = "Authentication expired. Please log in again.";
            } else if (err.message.includes("429")) {
                errorMsg = "Rate limited. Please try again in a moment.";
            }
            
            container.innerHTML = `<div class="loading">${errorMsg}<br><small>${err.message}</small></div>`;
        }
    });
}

// Step K: Display User Playlists
function displayUserPlaylists(playlists) {
    const container = document.getElementById("playlists-container");
    if (!container) return;

    container.innerHTML = ""; // Clear loading content

    playlists.forEach(playlist => {
        const card = document.createElement("div");
        card.className = "card";

        // Playlist image (use first image or placeholder)
        const img = document.createElement("img");
        img.src = playlist.images[0]?.url || "https://via.placeholder.com/300x300/5d5a4d/cfe655?text=Playlist";
        img.alt = playlist.name;

        // Playlist name
        const h3 = document.createElement("h3");
        h3.textContent = playlist.name;

        // Track count and description
        const p = document.createElement("p");
        const trackCount = playlist.tracks.total;
        const description = playlist.description || `${trackCount} tracks`;
        // Combine track count with description, or just show track count
        p.textContent = playlist.description 
            ? `${trackCount} tracks • ${playlist.description}` 
            : `${trackCount} tracks`;

        // Open playlist button
        const button = document.createElement("button");
        button.textContent = "Open";
        button.className = "play-button";
        
        // Add click handler to open playlist in Spotify
        button.addEventListener('click', () => {
            if (playlist.external_urls.spotify) {
                window.open(playlist.external_urls.spotify, '_blank');
            }
        });

        // Add hover effect to the entire card
        card.addEventListener('click', (e) => {
            // Only trigger if not clicking the button
            if (e.target !== button && playlist.external_urls.spotify) {
                window.open(playlist.external_urls.spotify, '_blank');
            }
        });

        // Assemble card
        card.appendChild(img);
        card.appendChild(h3);
        card.appendChild(p);
        card.appendChild(button);

        container.appendChild(card);
    });

    // Debug info
    console.log(`✅ Loaded ${playlists.length} playlists`);
}

/* -----------------------------
   5. TRENDING / NEW RELEASES
   ----------------------------- 
-- Pulls new Spotify releases
-- Cards look like playlists (re-using card style) */

// Step L: Fetch Featured Playlists (Trending)
// Fetch New Releases (Trending alternative since spotify has no url for trending)
function fetchTrending(token) {
  const url = "https://api.spotify.com/v1/browse/new-releases?country=US&limit=10";

  console.log("Fetching Trending (New Releases):", url);

  fetch(url, {
    headers: {
      Authorization: `Bearer ${token}`
    }
  })
  .then(res => {
    console.log("Trending response status:", res.status);
    if (!res.ok) throw new Error("Failed to fetch new releases");
    return res.json();
  })
  .then(data => {
    console.log("Trending data:", data);
    // albums.items instead of playlists.items
    displayTrending(data.albums.items);
  })
  .catch(err => {
    console.error("Error fetching new releases:", err);
  });
}


// Step M: Display Featured Playlists (Trending)
function displayTrending(albums) {
  const container = document.getElementById("trending-container");
  if (!container) return;

  container.innerHTML = ""; // clear old content  (Loading Text and Spinner)

  albums.forEach(album => {
    const card = document.createElement("div");
    card.className = "card";

    const img = document.createElement("img");
    img.src = album.images[0]?.url || "placeholder.jpg";
    img.alt = album.name;

    const title = document.createElement("h3");
    title.textContent = album.name;

    const artist = document.createElement("p");
    artist.textContent = album.artists.map(a => a.name).join(", ");

    const link = document.createElement("a");
    link.href = album.external_urls.spotify;
    link.target = "_blank";
    link.textContent = "Open in Spotify";

    card.appendChild(img);
    card.appendChild(title);
    card.appendChild(artist);
    card.appendChild(link);

    container.appendChild(card);
  });
}

