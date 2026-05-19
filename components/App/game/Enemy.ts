import { JOLT_LAYER_MOVING, JOLT_RVEC3_TO_VEC3, Gfx3Jolt, gfx3JoltManager } from '@lib/gfx3_jolt/gfx3_jolt_manager';
import { Gfx3Mesh } from '@lib/gfx3_mesh/gfx3_mesh';
import { Gfx3MeshJSM } from '@lib/gfx3_mesh/gfx3_mesh_jsm';
import { gfx3MeshRenderer } from '@lib/gfx3_mesh/gfx3_mesh_renderer';
import { Quaternion } from '@lib/core/quaternion';
import { UT } from '@lib/core/utils';
import { createBoxMesh, createUnitBoxMesh } from './GameUtils';

/**
 * The Enemy class represents an AI-controlled tank.
 * It uses static shared meshes for better performance across many instances.
 */
export class Enemy {
  static bodyMesh: Gfx3Mesh;
  static turretMesh: Gfx3Mesh;
  static barrelMesh: Gfx3Mesh;
  static trackLMesh: Gfx3Mesh;
  static trackRMesh: Gfx3Mesh;
  static engineMesh: Gfx3Mesh;
  static projMesh: Gfx3Mesh;
  static hpGreen: Gfx3Mesh;
  static hpRed: Gfx3Mesh;
  static initialized = false;

  /**
   * Initializes shared meshes for all enemy instances.
   * Supports falling back to procedural boxes if JSM files are missing.
   */
  static async initMeshes() {
    if (Enemy.initialized) return;
    
    const bodyJSM = new Gfx3MeshJSM();
    const turretJSM = new Gfx3MeshJSM();
    const barrelJSM = new Gfx3MeshJSM();

    try {
      await Promise.all([
        bodyJSM.loadFromFile('models/tank_body.jsm'),
        turretJSM.loadFromFile('models/tank_turret.jsm'),
        barrelJSM.loadFromFile('models/tank_barrel.jsm')
      ]);

      Enemy.bodyMesh = bodyJSM;
      Enemy.turretMesh = turretJSM;
      Enemy.barrelMesh = barrelJSM;
    } catch (e) {
      console.warn('Enemy: Failed to load JSM models, falling back to boxes.', e);
      
      const chassisColor: [number, number, number] = [0.8, 0.2, 0.2]; 
      const turretColor: [number, number, number] = [0.6, 0.1, 0.1];
      Enemy.bodyMesh = createBoxMesh(1.5, 0.6, 2.2, chassisColor);
      Enemy.turretMesh = createBoxMesh(1.1, 0.5, 1.1, turretColor);
      Enemy.barrelMesh = createBoxMesh(0.2, 0.2, 1.5, [0.2, 0.2, 0.2]);
    }

    const trackColor: [number, number, number] = [0.15, 0.15, 0.15];
    const engineColor: [number, number, number] = [0.2, 0.2, 0.2];
    Enemy.trackLMesh = createBoxMesh(0.4, 0.6, 2.4, trackColor);
    Enemy.trackRMesh = createBoxMesh(0.4, 0.6, 2.4, trackColor);
    Enemy.engineMesh = createBoxMesh(1.2, 0.4, 0.6, engineColor);
    Enemy.projMesh = createBoxMesh(0.6, 0.6, 0.6, [1.0, 0.2, 0.0]);
    Enemy.hpGreen = createUnitBoxMesh([0, 1, 0]);
    Enemy.hpRed = createUnitBoxMesh([1, 0, 0]);

    Enemy.initialized = true;
  }

  physicsBody: any;
  
  rotation: number = 0;
  recoil: number = 0;
  shootCooldown: number = 0;
  hp: number = 100;
  currentUp: vec3 = [0, 1, 0];
  
  constructor(x: number, y: number, z: number) {
    // Note: initMeshes should be called externally to wait for async loading
    if (!Enemy.initialized) {
       Enemy.initMeshes(); 
    }

    this.physicsBody = gfx3JoltManager.addBox({
      width: 1.0, height: 0.4, depth: 1.45, // Scaled down from (1.5, 0.6, 2.2) * 0.66
      x, y, z,
      motionType: Gfx3Jolt.EMotionType_Dynamic,
      layer: JOLT_LAYER_MOVING,
      settings: { mAngularDamping: 2.0, mMassPropertiesOverride: 100.0 }
    });
  }


  update(ts: number, targetPos: any): { didShoot: boolean, muzzlePos?: vec3, dir?: vec3 } {
    if (this.hp <= 0) return { didShoot: false };

    this.recoil -= (ts / 1000) * 5; 
    if (this.recoil < 0) this.recoil = 0;
    
    this.shootCooldown -= ts / 1000;

    // Jolt Logic
    const pos = this.physicsBody.body.GetPosition();
    const myPos = JOLT_RVEC3_TO_VEC3(pos);
    
    const dx = targetPos[0] - myPos[0];
    const dz = targetPos[2] - myPos[2];
    const dist = Math.sqrt(dx*dx + dz*dz);
    
    const targetAngle = Math.atan2(-dx, -dz);
    
    // Smooth rotation towards target
    const PI2 = Math.PI * 2;
    let angleDiff = (targetAngle - this.rotation) % PI2;
    if (angleDiff > Math.PI) angleDiff -= PI2;
    if (angleDiff < -Math.PI) angleDiff += PI2;
    
    const rotSpeed = 2.0;    
    const turnAmount = Math.sign(angleDiff) * Math.min(Math.abs(angleDiff), rotSpeed * (ts / 1000));
    this.rotation += turnAmount;
    
    // Use SetAngularVelocity for stable steering instead of SetRotation
    const joltAngVel = new Gfx3Jolt.Vec3(0, Math.sign(angleDiff) * Math.min(Math.abs(angleDiff) * 5.0, rotSpeed), 0);
    gfx3JoltManager.bodyInterface.SetAngularVelocity(this.physicsBody.body.GetID(), joltAngVel);

    // Simple Chase - Stop when close
    const speed = 6;
    let throttle = 0;
    if (dist > 15) {
        throttle = 1; // Move forward
    } else if (dist < 10) {
        throttle = -0.5; // Back up a bit
    }

    const forward = [-Math.sin(this.rotation), 0, -Math.cos(this.rotation)] as vec3;
    const linVel = UT.VEC3_SCALE(forward, throttle * speed);
    
    const curVel = this.physicsBody.body.GetLinearVelocity();
    
    const mass = 100.0;
    const velDiffX = linVel[0] - curVel.GetX();
    const velDiffZ = linVel[2] - curVel.GetZ();
    const kp = 8.0;
    const maxForce = 2500.0;
    const forceX = Math.max(-maxForce, Math.min(maxForce, velDiffX * mass * kp));
    const forceZ = Math.max(-maxForce, Math.min(maxForce, velDiffZ * mass * kp));
    const joltForce = new Gfx3Jolt.Vec3(forceX, 0, forceZ);
    gfx3JoltManager.bodyInterface.AddForce(this.physicsBody.body.GetID(), joltForce, Gfx3Jolt.EActivation_Activate);
    
    const curPos = this.physicsBody.body.GetPosition();
    const visualYawQ = Quaternion.createFromEuler(this.rotation, 0, 0, 'YXZ');
    
    // Smooth banking visuals
    let targetUp: vec3 = [0, 1, 0];
    const ray = gfx3JoltManager.createRay(curPos.GetX(), curPos.GetY() + 0.5, curPos.GetZ(), curPos.GetX(), curPos.GetY() - 2.0, curPos.GetZ());
    if (ray.normal && ray.normal.GetY() > 0.5) {
        targetUp = [ray.normal.GetX(), ray.normal.GetY(), ray.normal.GetZ()];
    }
    
    this.currentUp = UT.VEC3_LERP(this.currentUp, targetUp, 6.0 * (ts / 1000));
    this.currentUp = UT.VEC3_NORMALIZE(this.currentUp);

    const up: vec3 = [0, 1, 0];
    let axis = UT.VEC3_CROSS(up, this.currentUp);
    const dot = UT.VEC3_DOT(up, this.currentUp);
    let visualQ = visualYawQ;
    if (UT.VEC3_LENGTH(axis) > 0.001 && Math.abs(dot) < 0.999) {
        axis = UT.VEC3_NORMALIZE(axis);
        const clampedDot = Math.max(-1, Math.min(1, dot));
        const angle = Math.acos(clampedDot);
        const alignQ = Quaternion.createFromAxisAngle(axis, angle);
        visualQ = alignQ.mul(visualYawQ.w, visualYawQ.x, visualYawQ.y, visualYawQ.z);
    }
    
    let didShoot = false;
    let muzzlePos: vec3 | undefined = undefined;
    let dir: vec3 | undefined = undefined;

    // Shoot Logic
    if (dist < 40 && Math.abs(angleDiff) < 0.2 && this.shootCooldown <= 0) {
        const muzzleData = this.getMuzzleData(visualQ);
        muzzlePos = muzzleData.muzzlePos;
        dir = muzzleData.dir;
        this.shootCooldown = 2.5; // Slightly longer cooldown
        this.recoil = 1.0;
        didShoot = true;
    }
    
    return { didShoot, muzzlePos, dir };
  }
  
  getMuzzleData(q: Quaternion): { muzzlePos: vec3, dir: vec3 } {
    const ENEMY_SCALE = 0.66;
    const direction = q.rotateVector([0, 0, -1]); 
    const currentRot = this.physicsBody.body.GetRotation();
    const bodyQ = new Quaternion(currentRot.GetW(), currentRot.GetX(), currentRot.GetY(), currentRot.GetZ());
    
    const visualRecoil = this.recoil > 0 ? this.recoil * 0.3 : 0;
    // Barrel and turret offsets must match the scaled visual model
    const turretHeightOffset = 0.45; 
    const barrelRelativePos = bodyQ.rotateVector([0, 0, -0.8 + visualRecoil]);
    const pos = this.physicsBody.body.GetPosition();
    const bPos = [
      pos.GetX() + barrelRelativePos[0], 
      pos.GetY() + turretHeightOffset + barrelRelativePos[1], 
      pos.GetZ() + barrelRelativePos[2]
    ];

    // Barrel length is 1.5, so half-length is 0.75.
    const tipOffset = 0.85; 
    const startPos = [
      bPos[0] + direction[0] * tipOffset,
      bPos[1] + direction[1] * tipOffset,
      bPos[2] + direction[2] * tipOffset,
    ];
    
    return {
       muzzlePos: [startPos[0], startPos[1], startPos[2]] as vec3,
       dir: [direction[0], direction[1], direction[2]] as vec3
    };
  }

  draw(cameraYaw: number = 0) {
    if (this.hp <= 0) return;

    const ENEMY_SCALE = 0.66;
    const scale: vec3 = [ENEMY_SCALE, ENEMY_SCALE, ENEMY_SCALE];
    const ZERO: vec3 = [0,0,0];

    const pos = this.physicsBody.body.GetPosition();
    const currentRot = this.physicsBody.body.GetRotation();
    const q = new Quaternion(currentRot.GetW(), currentRot.GetX(), currentRot.GetY(), currentRot.GetZ());
    const origin: vec3 = [pos.GetX(), pos.GetY(), pos.GetZ()];

    const matBody = UT.MAT4_TRANSFORM(origin, ZERO, scale, q);
    gfx3MeshRenderer.drawMesh(Enemy.bodyMesh, matBody);

    // Track offsets scaled by human eyes to fit the 1.5 width body
    const trackOffsetL = q.rotateVector([-0.8, -0.05, 0]);
    const matTrackL = UT.MAT4_TRANSFORM([origin[0] + trackOffsetL[0], origin[1] + trackOffsetL[1], origin[2] + trackOffsetL[2]], ZERO, scale, q);
    gfx3MeshRenderer.drawMesh(Enemy.trackLMesh, matTrackL);

    const trackOffsetR = q.rotateVector([0.8, -0.05, 0]);
    const matTrackR = UT.MAT4_TRANSFORM([origin[0] + trackOffsetR[0], origin[1] + trackOffsetR[1], origin[2] + trackOffsetR[2]], ZERO, scale, q);
    gfx3MeshRenderer.drawMesh(Enemy.trackRMesh, matTrackR);

    const engineOffset = q.rotateVector([0, 0.2, 1.2]);
    const matEngine = UT.MAT4_TRANSFORM([origin[0] + engineOffset[0], origin[1] + engineOffset[1], origin[2] + engineOffset[2]], ZERO, scale, q);
    gfx3MeshRenderer.drawMesh(Enemy.engineMesh, matEngine);

    // Turret sits on body top
    const turretOffset = q.rotateVector([0, 0.45, 0]); 
    const matTurret = UT.MAT4_TRANSFORM([origin[0] + turretOffset[0], origin[1] + turretOffset[1], origin[2] + turretOffset[2]], ZERO, scale, q);
    gfx3MeshRenderer.drawMesh(Enemy.turretMesh, matTurret);

    const visualRecoil = this.recoil > 0 ? this.recoil * 0.3 : 0;
    const barrelRelativePos = q.rotateVector([0, 0, -0.8 + visualRecoil]);
    const matBarrel = UT.MAT4_TRANSFORM([origin[0] + turretOffset[0] + barrelRelativePos[0], origin[1] + turretOffset[1] + barrelRelativePos[1], origin[2] + turretOffset[2] + barrelRelativePos[2]], ZERO, scale, q);
    gfx3MeshRenderer.drawMesh(Enemy.barrelMesh, matBarrel);

    this.drawHealthBar(origin, this.hp, 100, cameraYaw);
  }

  drawHealthBar(origin: vec3, hp: number, maxHp: number, cameraYaw: number = 0) {
      const hpPercentage = Math.max(0, hp / maxHp);
      const barMesh = hpPercentage > 0.5 ? Enemy.hpGreen : Enemy.hpRed;
      
      const barWidth = 1.5;
      const barHeight = 0.2;
      const barDepth = 0.2;
      
      // Calculate scale
      const scaleX = barWidth * hpPercentage;
      
      // Billboarding
      const barRotation = Quaternion.createFromEuler(cameraYaw, 0, 0, 'YXZ');
      
      // Offset local
      const offsetLocal = [-(barWidth - scaleX) / 2, 0, 0] as vec3;
      const offsetWorld = barRotation.rotateVector(offsetLocal);
      
      const matBar = UT.MAT4_TRANSFORM(
          [origin[0] + offsetWorld[0], origin[1] + 2.5, origin[2] + offsetWorld[2]], 
          [0, 0, 0], 
          [scaleX, barHeight, barDepth], 
          barRotation
      );
      
      gfx3MeshRenderer.drawMesh(barMesh, matBar);
  }
}
