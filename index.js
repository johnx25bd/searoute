const turfMeta = require('@turf/meta');
const turfHelpers = require('@turf/helpers');
const length = require('@turf/length').default;
const rhumbDistance = require('@turf/rhumb-distance').default;
const pointToLineDistance = require('@turf/point-to-line-distance').default;

const RouteFinder = require('geojson-path-finder');
const marnet = require('./data/marnet_densified.json');
const routefinder = new RouteFinder(marnet);

module.exports = function searoute(origin, destination, units = 'nm') {

    try {
        let snappedOrigin = snapToNetwork(origin),
            snappedDestination = snapToNetwork(destination);

        let route = routefinder.findPath(snappedOrigin, snappedDestination);

        if (route == null) {
            console.log("No route found");
            return null;
        }

        let lineString = turfHelpers.lineString(route.path)

        lineString.properties.units = units;
        lineString.properties.length = units == 'nm'
            ? length(lineString, { units: 'miles' }) * 1.15078
            : length(lineString, { units: units });

        let firstRoutePoint = route.path[0];
        let lastRoutePoint = route.path[route.path.length - 1];
        lineString.properties.originSnapDistance = distanceInUnits(getCoord(origin), firstRoutePoint, units);
        lineString.properties.destinationSnapDistance = distanceInUnits(getCoord(destination), lastRoutePoint, units);

        return lineString;
    } catch (err) {
        throw err;
    }
}

function snapToNetwork(point) {

    var nearestLineIndex = 0,
        distance = 30000;

    turfMeta.featureEach(marnet, function (feature, ftIndex) {
        let dist = pointToLineDistance(point, feature, { units: 'kilometers' })
        if (dist < distance) {
            distance = dist;
            nearestLineIndex = ftIndex;
        }
    });

    var nearestVertexDist = null,
        nearestCoord = null;
    console.log(nearestLineIndex)
    turfMeta.coordEach(marnet.features[nearestLineIndex], function (currentCoord) {

        let distToVertex = rhumbDistance(point, currentCoord);

        if (!nearestVertexDist) {
            nearestVertexDist = distToVertex;
            nearestCoord = currentCoord;
        } else if (distToVertex < nearestVertexDist) {
            nearestVertexDist = distToVertex;
            nearestCoord = currentCoord;
        }
    });

    return turfHelpers.point(nearestCoord);
}

function distanceInUnits(fromCoord, toCoord, units) {
    let line = turfHelpers.lineString([fromCoord, toCoord]);
    return units == 'nm'
        ? length(line, { units: 'miles' }) * 1.15078
        : length(line, { units: units });
}

function getCoord(input) {
    return input.geometry ? input.geometry.coordinates : input.coordinates;
}
