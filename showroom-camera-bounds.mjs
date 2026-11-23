// Interior viewing volume. Camera clearance keeps the near plane inside walls,
// floor and ceiling; target limits prevent orbit/pan from aiming outside the hall.
export const SHOWROOM_LIMITS=Object.freeze({
  camera:Object.freeze({x:[-10.8,10.8],y:[1.1,7.35],z:[6,23]}),
  inspectionCamera:Object.freeze({x:[-11.6,11.6],y:[.9,7.35],z:[-4.9,23]}),
  target:Object.freeze({x:[-8.7,8.7],y:[.65,6.7],z:[-2.8,4.5]}),
  inspectionTarget:Object.freeze({x:[-2.6,2.6],y:[2,4.8],z:[1.2,2.4]})
});
const clamp=(n,[min,max])=>Math.max(min,Math.min(max,n));
export function constrainShowroomCamera(position,target,inspection=false){
  const bounds=inspection?SHOWROOM_LIMITS.inspectionTarget:SHOWROOM_LIMITS.target;
  const cameraBounds=inspection?SHOWROOM_LIMITS.inspectionCamera:SHOWROOM_LIMITS.camera;
  const nextTarget={},nextPosition={};
  for(const axis of ['x','y','z']){
    nextTarget[axis]=clamp(target[axis],bounds[axis]);
    // Preserve the orbit direction when a pan reaches the target boundary.
    const shift=nextTarget[axis]-target[axis];
    nextPosition[axis]=clamp(position[axis]+shift,cameraBounds[axis]);
  }
  return {position:nextPosition,target:nextTarget};
}
