"""Approved FK technical samples; opens a fixed bound source, never creates bones/weights."""
import bpy
import hashlib
import json
import math
import pathlib
import sys
from mathutils import Quaternion, Vector

ROOT = pathlib.Path(sys.argv[sys.argv.index('--') + 1]).resolve()
SOURCE = ROOT / 'assets-source/characters/runner/rig-spike/runner-derived.blend'
OUT = ROOT / 'docs/evidence/PAO-15/basic-motion-sample/v1'
EDIT = ROOT / 'assets-source/characters/runner/basic-motion-sample/v1'
SOURCE_HASH = 'a75de312d230d1f7924ec7616b47428515dba4b58f1f2219c1dbb8c7e17875bd'
sha = lambda p: hashlib.sha256(p.read_bytes()).hexdigest()
assert sha(SOURCE) == SOURCE_HASH, 'wrong immutable source'
OUT.mkdir(parents=True, exist_ok=True)
EDIT.mkdir(parents=True, exist_ok=True)
bpy.ops.wm.open_mainfile(filepath=str(SOURCE))
armatures = [o for o in bpy.context.scene.objects if o.type == 'ARMATURE']
assert len(armatures) == 1
arm = armatures[0]
assert arm.name == 'runner_rig_spike_v1' and len(arm.data.bones) == 23
meshes = sorted([o for o in bpy.context.scene.objects if o.type == 'MESH'], key=lambda o: o.name)

def fingerprint():
    data = {'bones': [(b.name, b.parent.name if b.parent else None, [list(r) for r in b.matrix_local]) for b in arm.data.bones],
            'meshes': [(o.name, [list(v.co) for v in o.data.vertices],
                        [[(o.vertex_groups[g.group].name, g.weight) for g in v.groups] for v in o.data.vertices]) for o in meshes]}
    return hashlib.sha256(json.dumps(data, sort_keys=True).encode()).hexdigest()

before = fingerprint()
arm.animation_data_clear()
for action in list(bpy.data.actions):
    bpy.data.actions.remove(action)  # New in-memory derivative only; old .blend remains immutable.
scene = bpy.context.scene
scene.render.fps = 30
scene.frame_start = 0
CONFIG = [('tech_idle_v1', 60, True), ('tech_run_v1', 24, True),
          ('tech_jump_v1', 36, False), ('tech_slide_v1', 36, False)]

def smooth_value(keys, frame):
    if frame <= keys[0][0]:
        return keys[0][1]
    if frame >= keys[-1][0]:
        return keys[-1][1]
    for (fa, a), (fb, b) in zip(keys, keys[1:]):
        if fa <= frame <= fb:
            t = (frame-fa)/(fb-fa)
            return a + (b-a)*(t*t*(3-2*t))

def raw_pose(name, f):
    angles = {b.name: 0.0 for b in arm.data.bones}
    height = 0.0
    if name == 'tech_idle_v1':
        s = math.sin(2*math.pi*f/60)
        angles.update(spine_01=1.5*s, spine_02=-.5*s, neck=-.25*s, head=-.25*s)
    elif name == 'tech_run_v1':
        phi = 2*math.pi*f/24 + math.pi/4
        c, s = math.cos(phi), math.sin(phi)
        angles.update(thigh_l=-25*c, thigh_r=25*c, calf_l=25+20*s, calf_r=25-20*s,
                      upperarm_l=15*c, upperarm_r=-15*c, forearm_l=35+5*s, forearm_r=35-5*s,
                      foot_l=5*c, foot_r=-5*c, spine_01=5, spine_02=-2)
        height = .015*(1-math.cos(2*phi))
    elif name == 'tech_jump_v1':
        frames = [0, 4, 6, 15, 24, 30, 36]
        channels = {'thigh_l': [0,-25,-5,-35,-30,-10,0], 'calf_l': [0,40,15,70,50,20,0],
                    'spine_01': [0,10,0,0,10,0,0], 'upperarm_l': [0,0,-10,-20,0,0,0],
                    'forearm_l': [0,25,0,30,0,0,0]}
        for bone, values in channels.items():
            angles[bone] = smooth_value(list(zip(frames, values)), f)
            if bone.endswith('_l'):
                angles[bone[:-1]+'r'] = angles[bone]
        height = smooth_value(list(zip(frames, [0,-.05,0,.02,-.04,-.02,0])), f)
    elif name == 'tech_slide_v1':
        factor = smooth_value([(0,0),(6,1),(24,1),(36,0)], f)
        for bone, angle in {'spine_01':-25,'thigh_l':-70,'calf_l':15,'thigh_r':-35,'calf_r':95,
                            'forearm_l':45,'forearm_r':45,'foot_l':5,'foot_r':-5}.items():
            angles[bone] = factor*angle
        if 6 <= f <= 24:
            angles['spine_01'] += .5*(1-math.cos(2*math.pi*(f-6)/18))
        height = -.25*factor
    return angles, height

def sampled_poses(name, N, loop):
    values = [raw_pose(name, f) for f in range(N+1)]
    if loop:
        a0, h0 = values[0]
        a1, h1 = values[1]
        ap, hp = values[N-1]
        delta = {b: (a1[b]-ap[b])/2 for b in a0}
        values[1] = ({b:a0[b]+delta[b] for b in a0}, h0+(h1-hp)/2)
        values[N-1] = ({b:a0[b]-delta[b] for b in a0}, h0-(h1-hp)/2)
        values[N] = (a0.copy(), h0)
    return values

actions = {}
for name, N, loop in CONFIG:
    action = bpy.data.actions.new(name)
    action.use_fake_user = True
    arm.animation_data_create()
    arm.animation_data.action = action
    scene.frame_end = N
    for f, (angles, height) in enumerate(sampled_poses(name, N, loop)):
        scene.frame_set(f)
        for pb in arm.pose.bones:
            pb.rotation_mode = 'QUATERNION'
            pb.rotation_quaternion = Quaternion((1,0,0), math.radians(angles[pb.name]))
            pb.location = (0,0,0)
            pb.scale = (1,1,1)
        # PoseBone.location is expressed in this bone's rest basis, not world Z.
        arm.pose.bones['pelvis'].location = arm.data.bones['pelvis'].matrix_local.to_3x3().inverted() @ Vector((0,0,height))
        for pb in arm.pose.bones:
            for channel in ('rotation_quaternion','location','scale'):
                pb.keyframe_insert(channel, frame=f, group=pb.name)
    for fc in action.fcurves:
        for key in fc.keyframe_points:
            key.interpolation = 'LINEAR'
    actions[name] = action

def target(p):
    return [p.x, p.z, -p.y]  # Blender armature/world to native glTF.

def target_matrix(m):
    # Explicit basis conversion C * M * C^-1, columns serialized glTF-style.
    from mathutils import Matrix
    C = Matrix(((1,0,0,0),(0,0,1,0),(0,-1,0,0),(0,0,0,1)))
    v = C @ m @ C.inverted()
    return [v[r][c] for c in range(4) for r in range(4)]

references = []
for name, N, loop in CONFIG:
    arm.animation_data.action = actions[name]
    frames = {'tech_idle_v1':[0,1,7.5,15,30,45,59,60], 'tech_run_v1':[0,1,3.5,6,12,18,23,24],
              'tech_jump_v1':[0,4,6,6.5,15,24,30,36], 'tech_slide_v1':[0,6,15,24,25.5,36]}[name]
    for f in frames:
        scene.frame_set(int(f), subframe=f-int(f))
        bpy.context.view_layer.update()
        dg = bpy.context.evaluated_depsgraph_get()
        parts = []
        for o in meshes:
            evaluated = o.evaluated_get(dg)
            vertices = evaluated.data.vertices
            chosen = sorted(set(round(i*(len(vertices)-1)/15) for i in range(16)))
            samples = [{'sourceVertex':i,'rest':target(o.matrix_world @ o.data.vertices[i].co),
                        'posed':target(evaluated.matrix_world @ vertices[i].co)} for i in chosen]
            displacements = [(evaluated.matrix_world @ v.co-o.matrix_world @ o.data.vertices[i].co).length for i,v in enumerate(vertices)]
            parts.append({'name':o.name+'#0','samples':samples,'maxDisplacementM':max(displacements),
                          'minHeightM':min((evaluated.matrix_world @ v.co).z for v in vertices)})
        references.append({'clip':name,'frame':f,'timeSec':f/30,'parts':parts,
            'bones':{pb.name:target_matrix(arm.matrix_world @ pb.matrix) for pb in arm.pose.bones},
            'boneDeformationMatrices':{pb.name:target_matrix(arm.matrix_world @ pb.matrix @ pb.bone.matrix_local.inverted() @ arm.matrix_world.inverted()) for pb in arm.pose.bones}})

assert fingerprint() == before, 'rest/geometry/weights modified'
arm.animation_data.action = actions['tech_idle_v1']
scene.frame_start, scene.frame_end = 0, 60
scene.frame_set(0)
bpy.ops.object.select_all(action='DESELECT')
arm.select_set(True)
for o in meshes:
    o.select_set(True)
bpy.context.view_layer.objects.active = arm
bpy.context.preferences.filepaths.save_version = 0
destination = EDIT / 'runner-basic-motion-derived.blend'
bpy.ops.wm.save_as_mainfile(filepath=str(destination))
options = dict(filepath=str(OUT/'runner-basic-motion-sample.glb'), export_format='GLB', use_selection=True,
               export_yup=True, export_animations=True, export_animation_mode='ACTIONS', export_frame_range=False,
               export_force_sampling=True, export_frame_step=1, export_skins=True, export_all_influences=False,
               export_def_bones=False, export_optimize_animation_size=False)
bpy.ops.export_scene.gltf(**options)
assert sha(SOURCE) == SOURCE_HASH, 'old source changed'
report = {'date':'2026-11-03','sourceCommit':'64c4f3120224f42995bc4b0fae544feae139d380','executionBase':'8c4b09fc5351778fe8db19858d52924ac70463b9',
          'sourceBlendSha256':SOURCE_HASH,'derivedBlendSha256':sha(destination),'exportSha256':sha(OUT/'runner-basic-motion-sample.glb'),
          'blenderVersion':bpy.app.version_string,'blenderBuildHash':bpy.app.build_hash.decode(),
          'rig':arm.name,'boneCount':len(arm.data.bones),'restSkinFingerprintBefore':before,'restSkinFingerprintAfter':fingerprint(),
          'noRebinding':True,'normalizationAppliedAgain':False,'manualWeightsTopologyPolish':False,
          'axisCorrection':'Pelvis intended parent/world vertical vector converted through pelvis rest basis inverse to PoseBone.location; no rest or bone edits.',
          'poseBasis':'bone rest local X quaternion, pelvis location in own rest basis; glTF target m/Y-up/+Z',
          'loopBoundaryPolicy':'symmetric f1/fN-1 anchors around f0 for LINEAR signed velocity; fN=f0',
          'clips':[{'name':n,'fps':30,'N':N,'durationSec':N/30,'loop':loop,'holdLast':not loop} for n,N,loop in CONFIG],
          'exportOptions':options,'samples':references,'quality':'unreviewed automatic samples; manual work deferred','license':'unverified'}
(OUT/'dcc-report.json').write_text(json.dumps(report,indent=2)+'\n',encoding='utf-8')
print('PAO15_BASIC_MOTION_COMPLETE '+json.dumps(report['clips']))
