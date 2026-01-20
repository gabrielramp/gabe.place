# Getting Started with Create React App

This project was bootstrapped with [Create React App](https://github.com/facebook/create-react-app).

## Feature: Traffic Kiss Optimizer (/navigate)

A modern maps tool that finds an alternative route that maximizes the number of traffic lights (“kisses”) while keeping ETA close to the fastest route.

### Setup

1) Create a `.env` file at the repo root and add your Google Maps API key:

```
REACT_APP_GOOGLE_MAPS_API_KEY=YOUR_KEY_HERE
```

- The repository `.gitignore` ignores `.env`, but if you accidentally committed a key previously, rotate it in Google Cloud and force-remove it from history.
- Restrict your key to your domains (e.g., `http://localhost:3000`, `https://gabe.place`) and the Maps JavaScript API + Places API.

### Run locally

```
npm start
```

Visit `http://localhost:3000/navigate`.

### How it works

- Uses Google DirectionsService with `provideRouteAlternatives` and live traffic.
- Queries Overpass API for `highway=traffic_signals` within a bounding box around all alternatives.
- Scores each alternative by the number of nearby lights (within tolerance) with tie-break by least extra time vs the fastest.
- Caches Overpass responses by bbox and includes fallback Overpass mirrors. Requests are abortable on new searches.

### Accessibility and UX

- Special-route gating hides global chrome on `/navigate` for an immersive map.
- Reduced-motion support and focus management for the live stats pill.
- Toasts report background loading/status.

### Deployment (GitHub Pages sub-URL support)

`package.json` postbuild copies `index.html` into `build/navigate/` and `build/navigate.html` so direct linking to `/navigate` works on GitHub Pages.

## Available Scripts

In the project directory, you can run:

### `npm start`

Runs the app in the development mode.\
Open [http://localhost:3000](http://localhost:3000) to view it in your browser.

The page will reload when you make changes.\
You may also see any lint errors in the console.

### `npm test`

Launches the test runner in the interactive watch mode.\
See the section about [running tests](https://facebook.github.io/create-react-app/docs/running-tests) for more information.

### `npm run build`

Builds the app for production to the `build` folder.\
It correctly bundles React in production mode and optimizes the build for the best performance.

The build is minified and the filenames include the hashes.\
Your app is ready to be deployed!

See the section about [deployment](https://facebook.github.io/create-react-app/docs/deployment) for more information.

### `npm run eject`

**Note: this is a one-way operation. Once you `eject`, you can't go back!**

If you aren't satisfied with the build tool and configuration choices, you can `eject` at any time. This command will remove the single build dependency from your project.

Instead, it will copy all the configuration files and the transitive dependencies (webpack, Babel, ESLint, etc) right into your project so you have full control over them. All of the commands except `eject` will still work, but they will point to the copied scripts so you can tweak them. At this point you're on your own.

You don't have to ever use `eject`. The curated feature set is suitable for small and middle deployments, and you shouldn't feel obligated to use this feature. However we understand that this tool wouldn't be useful if you couldn't customize it when you are ready for it.

## Learn More

You can learn more in the [Create React App documentation](https://facebook.github.io/create-react-app/docs/getting-started).

To learn React, check out the [React documentation](https://reactjs.org/).

### Code Splitting

This section has moved here: [https://facebook.github.io/create-react-app/docs/code-splitting](https://facebook.github.io/create-react-app/docs/code-splitting)

### Analyzing the Bundle Size

This section has moved here: [https://facebook.github.io/create-react-app/docs/analyzing-the-bundle-size](https://facebook.github.io/create-react-app/docs/analyzing-the-bundle-size)

### Making a Progressive Web App

This section has moved here: [https://facebook.github.io/create-react-app/docs/making-a-progressive-web-app](https://facebook.github.io/create-react-app/docs/making-a-progressive-web-app)

### Advanced Configuration

This section has moved here: [https://facebook.github.io/create-react-app/docs/advanced-configuration](https://facebook.github.io/create-react-app/docs/advanced-configuration)

### Deployment

This section has moved here: [https://facebook.github.io/create-react-app/docs/deployment](https://facebook.github.io/create-react-app/docs/deployment)

### `npm run build` fails to minify

This section has moved here: [https://facebook.github.io/create-react-app/docs/troubleshooting#npm-run-build-fails-to-minify](https://facebook.github.io/create-react-app/docs/troubleshooting#npm-run-build-fails-to-minify)
