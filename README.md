# Weather Dashboard

A responsive weather dashboard built with plain HTML, CSS and JavaScript. Search any city and see the current conditions, the next 24 hours and a 7-day forecast. The page background changes with the weather and time of day.

No API key, no build step, no dependencies.

## Features

- City search with live suggestions
- "Use my location" button (browser geolocation)
- Current temperature, condition, high and low
- Next 24 hours, hour by hour, with rain chance
- 7-day forecast with temperature range bars
- Feels like, humidity, wind, pressure, UV index, rain chance, sunrise and sunset
- °C / °F toggle
- Remembers your last city, unit and five recent cities (saved in your browser)
- Sky colours for clear day, clear night, cloudy, fog, rain, snow and storm
- Works on phones, tablets and desktops; keyboard friendly; respects reduced-motion settings

## Project structure

```
website/
├── index.html
├── style.css
├── script.js
└── README.md
```

There is no `assets/` folder. Weather icons are emoji and the favicon is built into `index.html`, so nothing can break from a missing image path. The only external files are the Google Fonts stylesheet and the Open-Meteo API.

## Run it on your computer

1. Put the four files in one folder.
2. Double-click `index.html` to open it in your browser.

If your browser blocks location access on a local file, start a small local server instead:

```bash
python -m http.server 8000
```

Then open <http://localhost:8000>.

## Host it on GitHub Pages

1. Create a free account at <https://github.com> and click **New repository**.
2. Name it, for example, `weather-dashboard`. Keep it **Public** and click **Create repository**.
3. Click **uploading an existing file**, drag in `index.html`, `style.css`, `script.js` and `README.md`, then click **Commit changes**.
4. Open the repository's **Settings**, then **Pages** in the left menu.
5. Under **Build and deployment**, set **Source** to **Deploy from a branch**.
6. Choose the **main** branch and the **/ (root)** folder, then click **Save**.
7. Wait one to two minutes and refresh the Pages screen. Your site address appears at the top:
   `https://YOUR-USERNAME.github.io/weather-dashboard/`

`index.html` must be at the top level of the repository, not inside another folder. The file names are case sensitive on GitHub Pages, so keep them lowercase.

## How it works

| Job | Service | Key needed |
| --- | --- | --- |
| City search | Open-Meteo Geocoding API | No |
| Forecast data | Open-Meteo Forecast API | No |

`script.js` requests the forecast once in °C and km/h and converts to °F and mph in the browser, so the unit toggle updates instantly without another request.

## Customise it

- **Default city:** change `DEFAULT_PLACE` at the top of `script.js`.
- **Colours:** edit the `body[data-sky="..."]` rules at the top of `style.css`.
- **Fonts:** change the two `--font-` variables in `style.css` and the Google Fonts link in `index.html`.
- **Forecast length or fields:** edit the `params` in `loadPlace()` in `script.js`. Available fields are listed in the [Open-Meteo docs](https://open-meteo.com/en/docs).

## Troubleshooting

- **"We couldn't load the forecast":** check your internet connection, then click **try again**.
- **Location button does nothing:** allow location access for the site in your browser settings. Location only works on `https://` pages or `localhost`, which GitHub Pages provides.
- **Old city keeps appearing:** the page remembers your last city. Search for a new one, or clear the site's data in your browser.
- **Page shows without styles on GitHub Pages:** confirm `style.css` and `script.js` are in the same folder as `index.html`, with exactly those lowercase names.

## Credits

Weather data by [Open-Meteo.com](https://open-meteo.com/), licensed under CC BY 4.0. Fonts: Bricolage Grotesque and Instrument Sans from Google Fonts.
