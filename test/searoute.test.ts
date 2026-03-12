import { describe, expect, it } from 'vitest';
import type { Feature, Point } from 'geojson';
import searoute from '../src/index.js';

const origin: Feature<Point> = {
  type: 'Feature',
  properties: {},
  geometry: {
    type: 'Point',
    coordinates: [132.5390625, 21.616579336740603],
  },
};

const destination: Feature<Point> = {
  type: 'Feature',
  properties: {},
  geometry: {
    type: 'Point',
    coordinates: [-71.3671875, 75.05035357407698],
  },
};

describe('searoute', () => {
  it('exports a function', () => {
    expect(typeof searoute).toBe('function');
  });

  it('returns a LineString feature with numeric length', () => {
    const route = searoute(origin, destination, 'miles');

    expect(route).not.toBeNull();
    expect(route?.type).toBe('Feature');
    expect(route?.geometry.type).toBe('LineString');
    expect(route?.properties.units).toBe('miles');
    expect(typeof route?.properties.length).toBe('number');
  });

  it('defaults units to nautical miles', () => {
    const route = searoute(origin, destination);

    expect(route).not.toBeNull();
    expect(route?.properties.units).toBe('nm');
    expect(typeof route?.properties.length).toBe('number');
  });
});
