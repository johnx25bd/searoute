# Searoute.js Modernization Recommendations

## Executive Summary

This document provides a comprehensive analysis of the `searoute-js` codebase and detailed recommendations for modernizing it to current standards. The library calculates shortest sea routes between two geographic points and is currently at version 0.1.0.

**Current State Assessment:** The codebase is functional but lacks modern development infrastructure including testing, type safety, security updates, and CI/CD.

---

## Table of Contents

1. [Critical Issues](#1-critical-issues)
2. [Security Vulnerabilities](#2-security-vulnerabilities)
3. [Dependency Updates](#3-dependency-updates)
4. [Code Quality Issues](#4-code-quality-issues)
5. [Architecture Recommendations](#5-architecture-recommendations)
6. [Testing Strategy](#6-testing-strategy)
7. [TypeScript Migration](#7-typescript-migration)
8. [Build & Bundling](#8-build--bundling)
9. [CI/CD Pipeline](#9-cicd-pipeline)
10. [Documentation Improvements](#10-documentation-improvements)
11. [Performance Optimizations](#11-performance-optimizations)
12. [Implementation Roadmap](#12-implementation-roadmap)

---

## 1. Critical Issues

### 1.1 No Test Coverage
- **Severity:** Critical
- **Current State:** Zero tests; test script fails with error
- **Risk:** No confidence in correctness; regressions undetected
- **Recommendation:** Implement comprehensive test suite (see Section 6)

### 1.2 Security Vulnerabilities
- **Severity:** Critical
- **Current State:** 32 vulnerabilities (6 critical, 17 high)
- **Risk:** Potential for prototype pollution, code execution, DoS attacks
- **Recommendation:** Update dependencies immediately (see Section 2)

### 1.3 Outdated Dependencies
- **Severity:** High
- **Current State:** All dependencies significantly outdated
- **Risk:** Missing bug fixes, security patches, performance improvements
- **Recommendation:** Update to latest major versions (see Section 3)

### 1.4 Debug Code in Production
- **Severity:** Medium
- **Current State:** `console.log(nearestLineIndex)` at `index.js:52`
- **Risk:** Pollutes consumer logs, exposes internal state
- **Recommendation:** Remove immediately

---

## 2. Security Vulnerabilities

### npm audit Results (32 vulnerabilities)

| Severity | Count | Notable CVEs |
|----------|-------|--------------|
| Critical | 6 | @babel/traverse arbitrary code execution, form-data unsafe random, json-schema prototype pollution, minimist prototype pollution |
| High | 17 | cross-spawn ReDoS, diff ReDoS, lodash command injection, semver ReDoS, y18n prototype pollution |
| Moderate | 6 | ajv prototype pollution, js-yaml prototype pollution, tough-cookie prototype pollution |
| Low | 3 | Various minor issues |

### Root Cause Analysis

The vast majority of vulnerabilities come from the `geojson-path-finder` dependency which has outdated dev dependencies (`tap`, `coveralls`, `nyc`). The library itself doesn't use these in production, but they inflate the vulnerability count.

### Recommended Actions

```bash
# Step 1: Update to latest geojson-path-finder (2.1.0)
npm install geojson-path-finder@^2.1.0

# Step 2: Update Turf.js to v7
npm install @turf/helpers@^7.3.0 @turf/length@^7.3.0 @turf/point-to-line-distance@^7.3.0 @turf/meta@^7.3.0 @turf/rhumb-distance@^7.3.0

# Step 3: Run audit fix for remaining issues
npm audit fix

# Step 4: Verify with npm audit
npm audit
```

---

## 3. Dependency Updates

### Current vs Latest Versions

| Package | Current | Latest | Breaking Changes |
|---------|---------|--------|------------------|
| `@turf/helpers` | ^6.1.4 | 7.3.2 | Yes - ES Module migration |
| `@turf/length` | ^6.0.2 | 7.3.2 | Yes - ES Module migration |
| `@turf/point-to-line-distance` | ^6.0.0 | 7.3.2 | Yes - ES Module migration |
| `geojson-path-finder` | ^1.5.2 | 2.1.0 | Yes - API changes |

### Turf.js v7 Migration Notes

Turf.js v7 introduced significant changes:

1. **ES Modules Only:** Dropped CommonJS support
2. **Function Signatures:** Some functions changed parameter order
3. **Default Exports:** Removed default exports, use named exports

```javascript
// Before (v6)
const length = require('@turf/length').default;

// After (v7)
import { length } from '@turf/length';
```

### geojson-path-finder v2 Migration Notes

Version 2.0 introduced:
1. Performance improvements
2. Better TypeScript support
3. Fixed edge cases in pathfinding

---

## 4. Code Quality Issues

### 4.1 Issues in `index.js`

| Line | Issue | Severity | Recommendation |
|------|-------|----------|----------------|
| 20 | `console.log("No route found")` | Medium | Return structured error or null silently |
| 52 | `console.log(nearestLineIndex)` | High | Remove debug statement |
| 27-29 | Magic number `1.15078` (nm conversion) | Low | Extract to named constant |
| 40 | Magic number `30000` (max distance) | Low | Extract to named constant |
| 32-34 | Empty try-catch rethrow | Low | Remove or add meaningful error handling |

### 4.2 Dead Code: `modules/snap-to-network.js`

This file is unused and contains multiple syntax errors:

| Line | Error |
|------|-------|
| 4 | `const turf = ('@turf/turf')` - missing `require` |
| 10 | `module.export` - should be `module.exports` |
| 16 | Variable `sa` undefined - should be `point` |

**Recommendation:** Delete this file entirely.

### 4.3 Code Style Inconsistencies

- Mixed use of `let` and `var`
- Inconsistent semicolon usage
- No consistent formatting rules
- No linting configuration

### Recommended ESLint Configuration

```json
{
  "env": {
    "node": true,
    "es2022": true
  },
  "extends": [
    "eslint:recommended"
  ],
  "parserOptions": {
    "ecmaVersion": "latest",
    "sourceType": "module"
  },
  "rules": {
    "no-console": "error",
    "no-unused-vars": "error",
    "prefer-const": "error",
    "eqeqeq": ["error", "always"]
  }
}
```

---

## 5. Architecture Recommendations

### 5.1 Current Architecture

```
┌─────────────────────────────────────────────┐
│              index.js (67 lines)            │
│  ┌───────────────────────────────────────┐  │
│  │ searoute(origin, destination, units)  │  │
│  │     └─ snapToNetwork(point)           │  │
│  └───────────────────────────────────────┘  │
│                                             │
│  Global State:                              │
│  - marnet (loaded at module init)           │
│  - routefinder (singleton)                  │
└─────────────────────────────────────────────┘
```

### 5.2 Proposed Architecture

```
searoute/
├── src/
│   ├── index.ts              # Main exports
│   ├── searoute.ts           # Core routing logic
│   ├── snap-to-network.ts    # Point snapping logic
│   ├── constants.ts          # Magic numbers, config
│   ├── types.ts              # TypeScript interfaces
│   └── utils/
│       └── distance.ts       # Distance calculations
├── data/
│   └── marnet_densified.json # Maritime network
├── tests/
│   ├── searoute.test.ts
│   ├── snap-to-network.test.ts
│   └── fixtures/             # Test data
├── dist/                     # Compiled output
│   ├── esm/                  # ES Modules
│   ├── cjs/                  # CommonJS (legacy)
│   └── types/                # Type declarations
└── package.json
```

### 5.3 Modular Design

**Separate Concerns:**

```typescript
// src/constants.ts
export const NAUTICAL_MILE_FACTOR = 1.15078;
export const DEFAULT_MAX_SNAP_DISTANCE_KM = 30000;
export const DEFAULT_UNITS = 'nm' as const;

// src/types.ts
import type { Feature, Point, LineString, Position } from 'geojson';

export type DistanceUnits = 'nm' | 'kilometers' | 'miles' | 'meters';

export interface SearouteOptions {
  units?: DistanceUnits;
  maxSnapDistance?: number;
}

export interface SearouteResult extends Feature<LineString> {
  properties: {
    length: number;
    units: DistanceUnits;
  };
}

// src/searoute.ts
export function searoute(
  origin: Feature<Point> | Position,
  destination: Feature<Point> | Position,
  options?: SearouteOptions
): SearouteResult | null;
```

### 5.4 Lazy Loading Option

Currently, the maritime network loads at module initialization (604 KB of JSON). Consider lazy loading:

```typescript
let _routefinder: PathFinder | null = null;

function getRouteFinder(): PathFinder {
  if (!_routefinder) {
    const marnet = require('./data/marnet_densified.json');
    _routefinder = new PathFinder(marnet);
  }
  return _routefinder;
}
```

---

## 6. Testing Strategy

### 6.1 Recommended Test Framework

**Vitest** - Modern, fast, TypeScript-native test runner

```bash
npm install -D vitest @vitest/coverage-v8
```

### 6.2 Test Categories

#### Unit Tests

```typescript
// tests/snap-to-network.test.ts
import { describe, it, expect } from 'vitest';
import { snapToNetwork } from '../src/snap-to-network';

describe('snapToNetwork', () => {
  it('should snap a point in the ocean to nearest maritime lane', () => {
    const point = { type: 'Feature', geometry: { type: 'Point', coordinates: [-5.0, 48.5] }};
    const snapped = snapToNetwork(point);

    expect(snapped.geometry.type).toBe('Point');
    expect(snapped.geometry.coordinates).toBeDefined();
  });

  it('should handle points near coastlines', () => {
    // Test coastal points snap correctly
  });

  it('should throw for points on land', () => {
    // Test land detection if implemented
  });
});
```

#### Integration Tests

```typescript
// tests/searoute.test.ts
import { describe, it, expect } from 'vitest';
import { searoute } from '../src';

describe('searoute', () => {
  it('should calculate route from Shanghai to Rotterdam', () => {
    const shanghai = { type: 'Feature', geometry: { type: 'Point', coordinates: [121.8, 31.0] }};
    const rotterdam = { type: 'Feature', geometry: { type: 'Point', coordinates: [4.5, 51.9] }};

    const route = searoute(shanghai, rotterdam);

    expect(route).not.toBeNull();
    expect(route.geometry.type).toBe('LineString');
    expect(route.properties.length).toBeGreaterThan(10000); // ~10,000+ nm
    expect(route.properties.units).toBe('nm');
  });

  it('should handle different unit options', () => {
    const origin = { type: 'Feature', geometry: { type: 'Point', coordinates: [-5.0, 48.5] }};
    const dest = { type: 'Feature', geometry: { type: 'Point', coordinates: [-70.0, 40.0] }};

    const routeNm = searoute(origin, dest, { units: 'nm' });
    const routeKm = searoute(origin, dest, { units: 'kilometers' });

    // Verify conversion ratio
    expect(routeKm.properties.length).toBeCloseTo(routeNm.properties.length * 1.852, 0);
  });

  it('should return null when no route exists', () => {
    // Test landlocked points
  });
});
```

#### Edge Case Tests

```typescript
describe('edge cases', () => {
  it('should handle antimeridian crossing (Pacific routes)', () => {
    const tokyo = { type: 'Feature', geometry: { type: 'Point', coordinates: [139.8, 35.6] }};
    const losAngeles = { type: 'Feature', geometry: { type: 'Point', coordinates: [-118.2, 34.0] }};

    const route = searoute(tokyo, losAngeles);
    expect(route).not.toBeNull();
  });

  it('should handle same origin and destination', () => {
    const point = { type: 'Feature', geometry: { type: 'Point', coordinates: [-5.0, 48.5] }};
    const route = searoute(point, point);

    expect(route.properties.length).toBe(0);
  });

  it('should handle nearby points (same snap target)', () => {
    // Points that snap to the same network node
  });

  it('should handle polar routes (Arctic passage)', () => {
    // Northern sea route if data supports it
  });
});
```

### 6.3 Test Configuration

```typescript
// vitest.config.ts
import { defineConfig } from 'vitest/config';

export default defineConfig({
  test: {
    globals: true,
    environment: 'node',
    coverage: {
      provider: 'v8',
      reporter: ['text', 'json', 'html'],
      thresholds: {
        lines: 80,
        functions: 80,
        branches: 70,
        statements: 80
      }
    },
    include: ['tests/**/*.test.ts'],
    benchmark: {
      include: ['tests/**/*.bench.ts']
    }
  }
});
```

### 6.4 Benchmark Tests

```typescript
// tests/searoute.bench.ts
import { bench, describe } from 'vitest';
import { searoute } from '../src';

describe('searoute performance', () => {
  bench('short route (English Channel)', () => {
    const dover = { type: 'Feature', geometry: { type: 'Point', coordinates: [1.3, 51.1] }};
    const calais = { type: 'Feature', geometry: { type: 'Point', coordinates: [1.9, 50.9] }};
    searoute(dover, calais);
  });

  bench('long route (Shanghai to Rotterdam)', () => {
    const shanghai = { type: 'Feature', geometry: { type: 'Point', coordinates: [121.8, 31.0] }};
    const rotterdam = { type: 'Feature', geometry: { type: 'Point', coordinates: [4.5, 51.9] }};
    searoute(shanghai, rotterdam);
  });
});
```

---

## 7. TypeScript Migration

### 7.1 Benefits

- **Type Safety:** Catch errors at compile time
- **Better DX:** IntelliSense, auto-completion
- **Self-Documenting:** Types serve as documentation
- **Ecosystem:** Works well with GeoJSON types

### 7.2 Type Definitions

```typescript
// src/types.ts
import type {
  Feature,
  Point,
  LineString,
  Position,
  FeatureCollection
} from 'geojson';

/**
 * Supported distance units for route calculations
 */
export type DistanceUnits = 'nm' | 'kilometers' | 'miles' | 'meters';

/**
 * Options for searoute calculation
 */
export interface SearouteOptions {
  /** Distance units for the result. Defaults to 'nm' (nautical miles) */
  units?: DistanceUnits;
  /** Maximum distance in km to snap input points to network. Defaults to 30000 */
  maxSnapDistance?: number;
}

/**
 * Result of a sea route calculation
 */
export interface SearouteResult extends Feature<LineString> {
  properties: {
    /** Total route length in specified units */
    length: number;
    /** Units of the length measurement */
    units: DistanceUnits;
  };
}

/**
 * Valid input point formats
 */
export type PointInput = Feature<Point> | Point | Position;

/**
 * Maritime network data structure
 */
export type MaritimeNetwork = FeatureCollection<LineString>;
```

### 7.3 Full TypeScript Implementation

```typescript
// src/searoute.ts
import { lineString, point as turfPoint } from '@turf/helpers';
import { length } from '@turf/length';
import { pointToLineDistance } from '@turf/point-to-line-distance';
import { rhumbDistance } from '@turf/rhumb-distance';
import { featureEach, coordEach } from '@turf/meta';
import PathFinder from 'geojson-path-finder';

import type { Feature, Point, Position } from 'geojson';
import type {
  SearouteOptions,
  SearouteResult,
  PointInput,
  DistanceUnits,
  MaritimeNetwork
} from './types';
import {
  NAUTICAL_MILE_FACTOR,
  DEFAULT_MAX_SNAP_DISTANCE_KM,
  DEFAULT_UNITS
} from './constants';

import marnet from './data/marnet_densified.json';

const routefinder = new PathFinder(marnet as MaritimeNetwork);

/**
 * Calculates the shortest sea route between two points on Earth.
 *
 * @param origin - Starting point (GeoJSON Point or coordinates)
 * @param destination - Ending point (GeoJSON Point or coordinates)
 * @param options - Configuration options
 * @returns GeoJSON LineString with route and distance, or null if no route found
 *
 * @example
 * const route = searoute(
 *   [121.8, 31.0],  // Shanghai
 *   [4.5, 51.9],    // Rotterdam
 *   { units: 'kilometers' }
 * );
 */
export function searoute(
  origin: PointInput,
  destination: PointInput,
  options: SearouteOptions = {}
): SearouteResult | null {
  const {
    units = DEFAULT_UNITS,
    maxSnapDistance = DEFAULT_MAX_SNAP_DISTANCE_KM
  } = options;

  const originPoint = normalizePoint(origin);
  const destPoint = normalizePoint(destination);

  const snappedOrigin = snapToNetwork(originPoint, maxSnapDistance);
  const snappedDestination = snapToNetwork(destPoint, maxSnapDistance);

  if (!snappedOrigin || !snappedDestination) {
    return null;
  }

  const route = routefinder.findPath(snappedOrigin, snappedDestination);

  if (!route) {
    return null;
  }

  const result = lineString(route.path) as SearouteResult;
  result.properties = {
    units,
    length: calculateDistance(result, units)
  };

  return result;
}

function normalizePoint(input: PointInput): Feature<Point> {
  if (Array.isArray(input)) {
    return turfPoint(input as Position);
  }
  if (input.type === 'Point') {
    return turfPoint(input.coordinates);
  }
  return input as Feature<Point>;
}

function snapToNetwork(
  point: Feature<Point>,
  maxDistance: number
): Feature<Point> | null {
  let nearestLineIndex = 0;
  let minDistance = maxDistance;

  featureEach(marnet as MaritimeNetwork, (feature, index) => {
    const dist = pointToLineDistance(point, feature, { units: 'kilometers' });
    if (dist < minDistance) {
      minDistance = dist;
      nearestLineIndex = index;
    }
  });

  if (minDistance === maxDistance) {
    return null; // No network found within range
  }

  let nearestCoord: Position | null = null;
  let nearestVertexDist = Infinity;

  coordEach(marnet.features[nearestLineIndex], (coord) => {
    const dist = rhumbDistance(point, coord);
    if (dist < nearestVertexDist) {
      nearestVertexDist = dist;
      nearestCoord = coord;
    }
  });

  return nearestCoord ? turfPoint(nearestCoord) : null;
}

function calculateDistance(route: Feature, units: DistanceUnits): number {
  if (units === 'nm') {
    return length(route, { units: 'miles' }) * NAUTICAL_MILE_FACTOR;
  }
  return length(route, { units });
}

export default searoute;
```

### 7.4 TypeScript Configuration

```json
// tsconfig.json
{
  "compilerOptions": {
    "target": "ES2022",
    "module": "NodeNext",
    "moduleResolution": "NodeNext",
    "lib": ["ES2022"],
    "outDir": "./dist",
    "rootDir": "./src",
    "strict": true,
    "esModuleInterop": true,
    "skipLibCheck": true,
    "forceConsistentCasingInFileNames": true,
    "declaration": true,
    "declarationMap": true,
    "sourceMap": true,
    "resolveJsonModule": true
  },
  "include": ["src/**/*"],
  "exclude": ["node_modules", "dist", "tests"]
}
```

---

## 8. Build & Bundling

### 8.1 Dual Package Support (ESM + CJS)

Modern npm packages should support both ES Modules and CommonJS:

```json
// package.json
{
  "name": "searoute-js",
  "version": "2.0.0",
  "type": "module",
  "main": "./dist/cjs/index.cjs",
  "module": "./dist/esm/index.js",
  "types": "./dist/types/index.d.ts",
  "exports": {
    ".": {
      "import": {
        "types": "./dist/types/index.d.ts",
        "default": "./dist/esm/index.js"
      },
      "require": {
        "types": "./dist/types/index.d.cts",
        "default": "./dist/cjs/index.cjs"
      }
    }
  },
  "files": [
    "dist",
    "data"
  ],
  "engines": {
    "node": ">=18"
  }
}
```

### 8.2 Build Tool: tsup

```bash
npm install -D tsup
```

```typescript
// tsup.config.ts
import { defineConfig } from 'tsup';

export default defineConfig({
  entry: ['src/index.ts'],
  format: ['cjs', 'esm'],
  dts: true,
  clean: true,
  sourcemap: true,
  splitting: false,
  treeshake: true,
  minify: false,
  target: 'node18',
  outDir: 'dist',
  external: [], // Bundle all dependencies
  noExternal: [/@turf\/.*/], // Include Turf in bundle
});
```

### 8.3 NPM Scripts

```json
{
  "scripts": {
    "build": "tsup",
    "dev": "tsup --watch",
    "test": "vitest",
    "test:coverage": "vitest run --coverage",
    "lint": "eslint src tests",
    "lint:fix": "eslint src tests --fix",
    "typecheck": "tsc --noEmit",
    "prepublishOnly": "npm run build && npm run test"
  }
}
```

---

## 9. CI/CD Pipeline

### 9.1 GitHub Actions Workflow

```yaml
# .github/workflows/ci.yml
name: CI

on:
  push:
    branches: [main]
  pull_request:
    branches: [main]

jobs:
  test:
    runs-on: ubuntu-latest
    strategy:
      matrix:
        node-version: [18, 20, 22]

    steps:
      - uses: actions/checkout@v4

      - name: Setup Node.js ${{ matrix.node-version }}
        uses: actions/setup-node@v4
        with:
          node-version: ${{ matrix.node-version }}
          cache: 'npm'

      - name: Install dependencies
        run: npm ci

      - name: Run linter
        run: npm run lint

      - name: Type check
        run: npm run typecheck

      - name: Run tests
        run: npm run test:coverage

      - name: Upload coverage
        uses: codecov/codecov-action@v4
        if: matrix.node-version == 20
        with:
          files: ./coverage/coverage-final.json

  build:
    runs-on: ubuntu-latest
    needs: test

    steps:
      - uses: actions/checkout@v4

      - name: Setup Node.js
        uses: actions/setup-node@v4
        with:
          node-version: 20
          cache: 'npm'

      - name: Install dependencies
        run: npm ci

      - name: Build
        run: npm run build

      - name: Test build output
        run: |
          node -e "import('./dist/esm/index.js')"
          node -e "require('./dist/cjs/index.cjs')"
```

### 9.2 Release Workflow

```yaml
# .github/workflows/release.yml
name: Release

on:
  push:
    tags:
      - 'v*'

jobs:
  publish:
    runs-on: ubuntu-latest

    steps:
      - uses: actions/checkout@v4

      - name: Setup Node.js
        uses: actions/setup-node@v4
        with:
          node-version: 20
          registry-url: 'https://registry.npmjs.org'

      - name: Install dependencies
        run: npm ci

      - name: Build
        run: npm run build

      - name: Publish to npm
        run: npm publish
        env:
          NODE_AUTH_TOKEN: ${{ secrets.NPM_TOKEN }}
```

---

## 10. Documentation Improvements

### 10.1 JSDoc Comments

All public functions should have comprehensive JSDoc:

```typescript
/**
 * Calculates the shortest maritime route between two geographic points.
 *
 * Uses Dijkstra's algorithm on a pre-computed maritime network graph
 * to find the optimal shipping route. The network includes major shipping
 * lanes, coastal routes, and canal passages (Suez, Panama).
 *
 * **Note:** This library is intended for visualization and estimation
 * purposes only, not for actual maritime navigation.
 *
 * @param origin - Starting point as GeoJSON Point, coordinates array, or Point geometry
 * @param destination - Ending point in same formats as origin
 * @param options - Optional configuration
 * @param options.units - Distance units: 'nm' (default), 'kilometers', 'miles', 'meters'
 * @param options.maxSnapDistance - Maximum km to snap input points to network (default: 30000)
 *
 * @returns GeoJSON LineString Feature with route path and distance properties,
 *          or null if no route can be found
 *
 * @throws {TypeError} If origin or destination are invalid formats
 *
 * @example
 * // Using coordinate arrays
 * const route = searoute([121.8, 31.0], [4.5, 51.9]);
 * console.log(`Distance: ${route.properties.length} nm`);
 *
 * @example
 * // Using GeoJSON Points with options
 * const shanghai = { type: 'Feature', geometry: { type: 'Point', coordinates: [121.8, 31.0] }};
 * const rotterdam = { type: 'Feature', geometry: { type: 'Point', coordinates: [4.5, 51.9] }};
 * const route = searoute(shanghai, rotterdam, { units: 'kilometers' });
 *
 * @see {@link https://github.com/johnx25bd/searoute} for more information
 */
```

### 10.2 API Reference (README addition)

```markdown
## API Reference

### searoute(origin, destination, [options])

Calculate the shortest sea route between two points.

#### Parameters

| Name | Type | Description |
|------|------|-------------|
| origin | `Position \| Point \| Feature<Point>` | Starting point |
| destination | `Position \| Point \| Feature<Point>` | Ending point |
| options | `Object` | Optional settings |
| options.units | `'nm' \| 'kilometers' \| 'miles' \| 'meters'` | Distance units (default: 'nm') |

#### Returns

`Feature<LineString> | null` - GeoJSON LineString with properties:
- `length` (number): Route distance in specified units
- `units` (string): The units of the length

Returns `null` if no route can be found.

#### Example

```javascript
import { searoute } from 'searoute-js';

const route = searoute(
  [121.8, 31.0],  // Shanghai
  [4.5, 51.9],    // Rotterdam
  { units: 'kilometers' }
);

if (route) {
  console.log(`Route distance: ${route.properties.length} km`);
  console.log(`Waypoints: ${route.geometry.coordinates.length}`);
}
```
```

### 10.3 CHANGELOG

```markdown
# Changelog

All notable changes to this project will be documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.0.0/),
and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

## [Unreleased]

## [2.0.0] - YYYY-MM-DD

### Changed
- **BREAKING:** Migrated to ES Modules (still supports CommonJS via dual package)
- **BREAKING:** Now requires Node.js 18+
- Updated Turf.js from v6 to v7
- Updated geojson-path-finder from v1 to v2
- Converted codebase to TypeScript

### Added
- Full TypeScript type definitions
- Options object parameter for configuration
- Support for coordinate array inputs (not just GeoJSON)
- Comprehensive test suite
- CI/CD pipeline

### Removed
- `console.log` debug statements
- Unused `modules/snap-to-network.js` file

### Fixed
- Security vulnerabilities in dependencies

### Security
- Resolved 32 dependency vulnerabilities
```

---

## 11. Performance Optimizations

### 11.1 Current Bottleneck: Linear Search

The `snapToNetwork` function iterates through ALL maritime network features (linear O(n) complexity) for every routing request:

```javascript
// Current: O(n) for each point snapped
turfMeta.featureEach(marnet, function (feature, ftIndex) {
  let dist = pointToLineDistance(point, feature, { units: 'kilometers' });
  // ...
});
```

### 11.2 Recommendation: Spatial Index

Use R-tree spatial indexing for O(log n) lookups:

```bash
npm install @turf/bbox rbush
```

```typescript
import RBush from 'rbush';
import { bbox } from '@turf/bbox';

interface SpatialIndex {
  minX: number;
  minY: number;
  maxX: number;
  maxY: number;
  index: number;
}

// Build index once at initialization
const tree = new RBush<SpatialIndex>();
const items = marnet.features.map((feature, index) => {
  const [minX, minY, maxX, maxY] = bbox(feature);
  return { minX, minY, maxX, maxY, index };
});
tree.load(items);

function snapToNetworkOptimized(point: Feature<Point>): Feature<Point> | null {
  const [lon, lat] = point.geometry.coordinates;
  const searchRadius = 5; // degrees

  // Query only nearby features
  const candidates = tree.search({
    minX: lon - searchRadius,
    minY: lat - searchRadius,
    maxX: lon + searchRadius,
    maxY: lat + searchRadius
  });

  // Search only candidates (typically 10-50 instead of 600+)
  let nearest = null;
  let minDist = Infinity;

  for (const { index } of candidates) {
    const dist = pointToLineDistance(point, marnet.features[index]);
    if (dist < minDist) {
      minDist = dist;
      nearest = index;
    }
  }

  // ... continue with vertex snapping
}
```

**Expected Improvement:** 10-50x faster point snapping for typical queries.

### 11.3 Lazy Loading

For applications that don't always use routing, defer network loading:

```typescript
let cachedRouteFinder: PathFinder | null = null;

function getRouteFinder(): PathFinder {
  if (!cachedRouteFinder) {
    // Load 600KB JSON only when first needed
    const marnet = require('./data/marnet_densified.json');
    cachedRouteFinder = new PathFinder(marnet);
  }
  return cachedRouteFinder;
}
```

### 11.4 Web Worker Support (Browser)

For browser usage, offload computation to a Web Worker:

```typescript
// worker.ts
import { searoute } from 'searoute-js';

self.onmessage = (event) => {
  const { origin, destination, options, id } = event.data;
  const result = searoute(origin, destination, options);
  self.postMessage({ result, id });
};

// main.ts
const worker = new Worker(new URL('./worker.ts', import.meta.url));

export function searouteAsync(origin, destination, options) {
  return new Promise((resolve) => {
    const id = crypto.randomUUID();
    worker.onmessage = (event) => {
      if (event.data.id === id) {
        resolve(event.data.result);
      }
    };
    worker.postMessage({ origin, destination, options, id });
  });
}
```

---

## 12. Implementation Roadmap

### Phase 1: Critical Fixes (Immediate)

**Goal:** Make the current version production-safe

1. Remove `console.log` statements from `index.js`
2. Delete unused `modules/snap-to-network.js`
3. Run `npm audit fix`
4. Update dependencies to latest compatible versions
5. Add basic test coverage (happy path)

**Deliverable:** Version 0.2.0 with security fixes

### Phase 2: TypeScript Migration

**Goal:** Modern type-safe codebase

1. Set up TypeScript configuration
2. Create type definitions
3. Convert `index.js` to `src/searoute.ts`
4. Add build pipeline with tsup
5. Configure dual ESM/CJS output
6. Expand test coverage to 80%+

**Deliverable:** Version 1.0.0 with TypeScript

### Phase 3: Infrastructure

**Goal:** Professional development workflow

1. Add ESLint configuration
2. Add Prettier for formatting
3. Set up GitHub Actions CI
4. Configure Codecov for coverage reporting
5. Add pre-commit hooks (husky + lint-staged)
6. Create CONTRIBUTING.md

**Deliverable:** Version 1.1.0 with full CI/CD

### Phase 4: Performance & Features

**Goal:** Improved performance and developer experience

1. Implement spatial indexing (R-tree)
2. Add lazy loading option
3. Improve error messages
4. Add route metadata (waypoint names, regions)
5. Add input validation with helpful errors
6. Create API documentation site

**Deliverable:** Version 2.0.0 with performance improvements

---

## Appendix A: Proposed package.json

```json
{
  "name": "searoute-js",
  "version": "2.0.0",
  "description": "Calculate the shortest sea route between two points on Earth",
  "type": "module",
  "main": "./dist/cjs/index.cjs",
  "module": "./dist/esm/index.js",
  "types": "./dist/types/index.d.ts",
  "exports": {
    ".": {
      "import": {
        "types": "./dist/types/index.d.ts",
        "default": "./dist/esm/index.js"
      },
      "require": {
        "types": "./dist/types/index.d.cts",
        "default": "./dist/cjs/index.cjs"
      }
    }
  },
  "files": [
    "dist",
    "data"
  ],
  "scripts": {
    "build": "tsup",
    "dev": "tsup --watch",
    "test": "vitest",
    "test:run": "vitest run",
    "test:coverage": "vitest run --coverage",
    "lint": "eslint src tests",
    "lint:fix": "eslint src tests --fix",
    "format": "prettier --write .",
    "typecheck": "tsc --noEmit",
    "prepublishOnly": "npm run build && npm run test:run"
  },
  "keywords": [
    "maritime",
    "route",
    "searoute",
    "shipping",
    "geojson",
    "dijkstra",
    "navigation",
    "distance"
  ],
  "author": "@johnx25bd",
  "license": "MPL-2.0",
  "repository": {
    "type": "git",
    "url": "git+https://github.com/johnx25bd/searoute.git"
  },
  "bugs": {
    "url": "https://github.com/johnx25bd/searoute/issues"
  },
  "homepage": "https://github.com/johnx25bd/searoute#readme",
  "engines": {
    "node": ">=18"
  },
  "dependencies": {
    "@turf/bbox": "^7.3.0",
    "@turf/helpers": "^7.3.0",
    "@turf/length": "^7.3.0",
    "@turf/meta": "^7.3.0",
    "@turf/point-to-line-distance": "^7.3.0",
    "@turf/rhumb-distance": "^7.3.0",
    "geojson-path-finder": "^2.1.0",
    "rbush": "^4.0.1"
  },
  "devDependencies": {
    "@types/geojson": "^7946.0.14",
    "@types/node": "^22.0.0",
    "@types/rbush": "^4.0.0",
    "@typescript-eslint/eslint-plugin": "^8.0.0",
    "@typescript-eslint/parser": "^8.0.0",
    "@vitest/coverage-v8": "^3.0.0",
    "eslint": "^9.0.0",
    "prettier": "^3.4.0",
    "tsup": "^8.3.0",
    "typescript": "^5.7.0",
    "vitest": "^3.0.0"
  }
}
```

---

## Appendix B: Recommended .gitignore

```gitignore
# Dependencies
node_modules/

# Build output
dist/

# Coverage
coverage/

# IDE
.idea/
.vscode/
*.swp
*.swo

# OS
.DS_Store
Thumbs.db

# Logs
*.log
npm-debug.log*

# Environment
.env
.env.local

# Test artifacts
.vitest/

# TypeScript
*.tsbuildinfo
```

---

## Appendix C: Project Quality Checklist

### Before v1.0.0 Release

- [ ] All console.log statements removed
- [ ] Dead code deleted
- [ ] Security vulnerabilities resolved (npm audit clean)
- [ ] Dependencies updated to latest stable
- [ ] TypeScript migration complete
- [ ] Type definitions published
- [ ] Test coverage >80%
- [ ] CI pipeline passing
- [ ] ESLint configuration in place
- [ ] Documentation complete
- [ ] CHANGELOG maintained
- [ ] LICENSE verified
- [ ] package.json exports configured
- [ ] README badges added

---

*Document generated: 2026-01-19*
*Searoute.js Codebase Review*
