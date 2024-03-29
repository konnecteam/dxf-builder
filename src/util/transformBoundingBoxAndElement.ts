import { Box2 } from 'vecks';

/**
 * Transform the bounding box and the SVG element by the given
 * transforms. The <g> element are created in reverse transform
 * order and the bounding box in the given order.
 */
export default (bbox, element, transforms) => {
  let transformedElement = '';
  const matrices = transforms.map(transform => {
    // Create the transformation matrix
    const tx = transform.x || 0;
    const ty = transform.y || 0;
    const sx = transform.scaleX || 1;
    const sy = transform.scaleY || 1;
    const angle = (transform.rotation || 0) / 180 * Math.PI;
    const { cos, sin } = Math;
    let a;
    let b;
    let c;
    let d;
    let e;
    let f;
    // In DXF an extrusionZ value of -1 denote a tranform around the Y axis.
    // if (transform.extrusionZ === -1) {
    //   a = -sx * cos(angle)
    //   b = sx * sin(angle)
    //   c = sy * sin(angle)
    //   d = sy * cos(angle)
    //   e = -tx
    //   f = ty
    // } else {
    //   a = sx * cos(angle)
    //   b = sx * sin(angle)
    //   c = -sy * sin(angle)
    //   d = sy * cos(angle)
    //   e = tx
    //   f = ty
    // }
    if (transform.extrusionZ === -1) {
      a = -sx * cos(angle);
      b = sx * sin(angle);
      c = sy * sin(angle);
      d = sy * cos(angle);
      e = -tx;
      f = ty;
    } else { // avec l'inverse du Y, il faut faire cette rotation pour être à l'endroit
      a = sx * cos(angle);
      b = -sx * sin(angle);
      c = sy * sin(angle);
      d = sy * cos(angle);
      e = tx;
      f = -ty;
    }
    return [a, b, c, d, e, f];
  });
  let transformedBBox = new Box2();
  if (bbox.valid) {
    let bboxPoints = [
      { x: bbox.min.x, y: bbox.min.y },
      { x: bbox.max.x, y: bbox.min.y },
      { x: bbox.max.x, y: bbox.max.y },
      { x: bbox.min.x, y: bbox.max.y },
    ];
    matrices.forEach(([a, b, c, d, e, f]) => {
      bboxPoints = bboxPoints.map(point => ({
        x: point.x * a + point.y * c + e,
        y: point.x * b + point.y * d + f
      }));
    });
    transformedBBox = bboxPoints.reduce((acc, point) => {
      return acc.expandByPoint(point);
    }, new Box2());
  }

  matrices.reverse();
  let strokeCumul = 0.1;
  matrices.forEach(([a, b, c, d, e, f], index) => {
    strokeCumul *= 1 / Math.sqrt(a * a + b * b);
    transformedElement += `<g transform="matrix(${a} ${b} ${c} ${d} ${e} ${f})" ${index === (matrices.length - 1) ? 'stroke-width="' + strokeCumul + '%"' : '' } >`; // si on scale, il faut que le stroke-width suive
  });
  transformedElement += element;
  matrices.forEach(transform => {
    transformedElement += '</g>';
  });

  return { bbox: transformedBBox, element: transformedElement };
};
