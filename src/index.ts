import * as turfMeta from '@turf/meta';
import * as turfHelpers from '@turf/helpers';
import length from '@turf/length';
import pointToLineDistance from '@turf/point-to-line-distance';
import rhumbDistance from '@turf/rhumb-distance';
import type {
  Feature,
  FeatureCollection,
  LineString,
  Point,
  Position,
} from 'geojson';
import PathFinderModule from 'geojson-path-finder';
import marnet from '../data/marnet_densified.json' with { type: 'json' };

export type DistanceUnit = 'nm' | 'miles' | 'kilometers' | 'degrees' | 'radians';

type RouteFeature = Feature<
  LineString,
  {
    units: DistanceUnit;
    length: number;
  }
>;

type PathResult = {
  path: Position[];
};

type PathFinderClass = new (
  network: FeatureCollection<LineString>
) => { findPath: (a: Feature<Point>, b: Feature<Point>) => PathResult | undefined };

const PathFinder =
  ((PathFinderModule as { default?: PathFinderClass }).default ??
    PathFinderModule) as PathFinderClass;
const maritimeNetwork = marnet as FeatureCollection<LineString>;
const pathfinder = new PathFinder(maritimeNetwork);

export default function searoute(
  origin: Feature<Point>,
  destination: Feature<Point>,
  units: DistanceUnit = 'nm'
): RouteFeature | null {
  try {
    const snappedOrigin = snapToNetwork(origin);
    const snappedDestination = snapToNetwork(destination);

    const route = pathfinder.findPath(snappedOrigin, snappedDestination);

    if (route == null) {
      console.log('No route found');
      return null;
    }

    const lineString = turfHelpers.lineString(route.path) as RouteFeature;
    lineString.properties.units = units;
    lineString.properties.length =
      units == 'nm'
        ? length(lineString, { units: 'miles' }) * 1.15078
        : length(lineString, { units });

    return lineString;
  } catch (err) {
    throw err;
  }
}

function snapToNetwork(point: Feature<Point>): Feature<Point> {
  let nearestLineIndex = 0;
  let distance = 30000;

  turfMeta.featureEach(maritimeNetwork, function (feature, ftIndex) {
    const dist = pointToLineDistance(point, feature, { units: 'kilometers' });
    if (dist < distance) {
      distance = dist;
      nearestLineIndex = ftIndex;
    }
  });

  let nearestVertexDist: number | null = null;
  let nearestCoord: Position | null = null;
  console.log(nearestLineIndex);

  turfMeta.coordEach(
    maritimeNetwork.features[nearestLineIndex],
    function (currentCoord) {
      const distToVertex = rhumbDistance(point, currentCoord);

      if (!nearestVertexDist) {
        nearestVertexDist = distToVertex;
        nearestCoord = currentCoord;
      } else if (distToVertex < nearestVertexDist) {
        nearestVertexDist = distToVertex;
        nearestCoord = currentCoord;
      }
    }
  );

  return turfHelpers.point(nearestCoord as unknown as Position);
}
