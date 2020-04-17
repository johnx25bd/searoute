// import { coordEach, featureEach } from '@turf/meta';
// import { rhumbDistance, pointToLineDistance } from '@turf/measurement';
// import { point } from '@turf/helper';
const turf = ('@turf/turf');

// const meta = require('@turf/meta');
// const measurement = require('@turf/measurement');
// const helper = require('@turf/helper');

module.export = function snapToNetwork(point) {

    var nearestLineIndex = 0,
        distance = 30000;

    turf.featureEach(marnet, function (feature, ftIndex) {
        let dist = turf.pointToLineDistance(sa, feature, { units: 'kilometers' })
        if (dist < distance) {
            distance = dist;
            nearestLineIndex = ftIndex;
        }
    });

    var nearestVertexDist = null,
        nearestCoord = null;

    turf.coordEach(marnet.features[nearestLineIndex], function (currentCoord, coordIndex) {

        let distToVertex = turf.rhumbDistance(point, currentCoord);

        if (!nearestVertexDist) {
            nearestVertexDist = distToVertex;
            nearestCoord = currentCoord;
        } else if (distToVertex < nearestVertexDist) {
            nearestVertexDist = distToVertex;
            nearestCoord = currentCoord;
        }
    });

    return turf.point(nearestCoord);
}
