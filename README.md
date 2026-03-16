# searoute-ts

`searoute-ts` is an npm package for generating the shortest sea route between two points on Earth.

If points are on land, the function attempts to find the nearest point on the sea and calculate the route from there.

**Not for routing purposes.** This library is meant to generate realistic-looking sea routes for visualization use cases, not for maritime navigation.

![Searoute map](https://raw.githubusercontent.com/albertofcasuso/searoute-ts/main/assets/searoute.png)

## Fork status

This repository is a fork of the original `searoute-js` project.

- Original upstream: [johnx25bd/searoute](https://github.com/johnx25bd/searoute)
- Maintained fork: [albertofcasuso/searoute-ts](https://github.com/albertofcasuso/searoute-ts)
- Changes in this fork:
  - TypeScript typings and declaration output (`.d.ts`)
  - Migration to modern ESM
  - Node.js 24 compatibility and modern package exports

## Installation

```bash
npm install searoute-ts
```

## Usage (ESM)

```js
import searoute from "searoute-ts";

const origin = {
  type: "Feature",
  properties: {},
  geometry: {
    type: "Point",
    coordinates: [132.5390625, 21.616579336740603]
  }
};

const destination = {
  type: "Feature",
  properties: {},
  geometry: {
    type: "Point",
    coordinates: [-71.3671875, 75.05035357407698]
  }
};

const route = searoute(origin, destination);
// Returns a GeoJSON LineString Feature

const routeMiles = searoute(origin, destination, "miles");
// Units default to "nm" and can be: degrees, radians, miles, or kilometers
```

## Maintainer

Maintained by **Alberto Casuso** ([npm: `afcasuso`](https://www.npmjs.com/~afcasuso)).

## License

This project is licensed under the [Mozilla Public License 2.0 (MPL-2.0)](https://mozilla.org/MPL/2.0/).

## Credits

- Original Java implementation: [eurostat/searoute](https://github.com/eurostat/searoute) (EUPL-1.2)
- Original JavaScript package: [johnx25bd/searoute](https://github.com/johnx25bd/searoute)
- Path finding: [geojson-path-finder](https://www.liedman.net/geojson-path-finder/)
- Maritime network data derived from Eurostat marnet dataset, including:
  - [Oak Ridge National Labs CTA Transportation Network Group](https://cta.ornl.gov/transnet/), Global Shipping Lane Network (2000)
  - Additional European coastal routes based on AIS data (Eurostat)
