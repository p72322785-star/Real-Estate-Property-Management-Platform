# Estate — Property Management (front end)

Folder layout (keep it exactly like this):

    login.html  signup.html  dashboard.html  favorites.html  profile.html
    style.css
    js/  data.js  store.js  ui.js  shared.js  login.js  signup.js  dashboard.js  favorites.js  profile.js

Open `login.html`. Demo login: tenant@estate.in / estate123

If sign-in sends you straight back to the login page, your browser is not sharing
storage between local files (Firefox does this by default). Run a tiny local server
from inside this folder and open http://localhost:8000/login.html :

    python -m http.server 8000        (or the "Live Server" extension in VS Code)
