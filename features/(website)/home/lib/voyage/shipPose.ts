import { Matrix4, Quaternion, Vector3, type Object3D } from "three";

/** World transform of the hero particle rig, sampled each frame before the mesh leaves it. */
export class ShipPose {
  readonly position = new Vector3();
  readonly quaternion = new Quaternion();
  readonly scale = new Vector3(1, 1, 1);
  private readonly matrix = new Matrix4();
  ready = false;

  copyFrom(object: Object3D) {
    object.updateWorldMatrix(true, false);
    this.matrix.copy(object.matrixWorld).decompose(this.position, this.quaternion, this.scale);
    this.ready = true;
  }
}
