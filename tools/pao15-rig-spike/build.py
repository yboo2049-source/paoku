"""Local deterministic geometric auto weights. No topology edits or manual weight painting.
Run with Blender --background --factory-startup --python build.py -- [repo root].
"""
import bpy
import hashlib
import json
import math
import pathlib
import sys
from mathutils import Matrix, Vector

ROOT = pathlib.Path(sys.argv[sys.argv.index('--') + 1]).resolve()
SOURCE = ROOT.parent / 'glb-review/public/models/character_runner.glb'
OUT = ROOT / 'docs/evidence/PAO-15/rig-spike'
EDIT = ROOT / 'assets-source/characters/runner/rig-spike'
OUT.mkdir(parents=True, exist_ok=True)
EDIT.mkdir(parents=True, exist_ok=True)
assert hashlib.sha256(SOURCE.read_bytes()).hexdigest() == '0f475ed22a2abfbbb9b4cb3069f5c9b131110847b23bd68fbcdff4b3baa797d9'

bpy.ops.object.select_all(action='SELECT')
bpy.ops.object.delete(use_global=False)
bpy.ops.import_scene.gltf(filepath=str(SOURCE))
meshes = sorted([o for o in bpy.context.scene.objects if o.type == 'MESH'], key=lambda o: o.name)
source_points = [o.matrix_world @ v.co for o in meshes for v in o.data.vertices]
low = min(p.z for p in source_points)
height = max(p.z for p in source_points) - low
scale = 1.8 / height
normalization = Matrix.Scale(scale, 4) @ Matrix.Translation((0, 0, -low))
parts = []
for o in meshes:
    applied = normalization @ o.matrix_world
    o.data.transform(applied)
    o.parent = None
    o.matrix_world = Matrix.Identity(4)
    parts.append({'name': o.name, 'vertices': len(o.data.vertices), 'normalizationTimesNodeMatrix': [list(r) for r in applied]})

arm_data = bpy.data.armatures.new('runner_rig_spike_v1')
arm = bpy.data.objects.new('runner_rig_spike_v1', arm_data)
bpy.context.collection.objects.link(arm)
bpy.context.view_layer.objects.active = arm
arm.select_set(True)
bpy.ops.object.mode_set(mode='EDIT')
specs = []

def point(x, y, z):
    """Y-up +Z-forward target coordinates to Blender Z-up -Y-forward."""
    return Vector((x, -z, y))

def bone(name, head, tail, parent=None):
    b = arm_data.edit_bones.new(name)
    b.head, b.tail = point(*head), point(*tail)
    if parent:
        b.parent = arm_data.edit_bones[parent]
    b.use_deform = True
    specs.append({'name': name, 'parent': parent, 'headTarget': head, 'tailTarget': tail})

bone('root_motionless', (0, 0, 0), (0, .12, 0))
bone('pelvis', (0, .87, 0), (0, 1.03, 0), 'root_motionless')
bone('spine_01', (0, 1.03, 0), (0, 1.19, 0), 'pelvis')
bone('spine_02', (0, 1.19, 0), (0, 1.40, 0), 'spine_01')
bone('neck', (0, 1.40, 0), (0, 1.52, 0), 'spine_02')
bone('head', (0, 1.52, 0), (0, 1.76, 0), 'neck')
for side, sign in [('l', 1), ('r', -1)]:
    bone('clavicle_' + side, (0, 1.38, 0), (sign * .18, 1.38, 0), 'spine_02')
    bone('upperarm_' + side, (sign * .18, 1.38, 0), (sign * .34, 1.15, 0), 'clavicle_' + side)
    bone('forearm_' + side, (sign * .34, 1.15, 0), (sign * .49, .92, 0), 'upperarm_' + side)
    bone('hand_' + side, (sign * .49, .92, 0), (sign * .53, .78, 0), 'forearm_' + side)
    bone('thigh_' + side, (sign * .16, .87, 0), (sign * .18, .49, .015), 'pelvis')
    bone('calf_' + side, (sign * .18, .49, .015), (sign * .18, .15, 0), 'thigh_' + side)
    bone('foot_' + side, (sign * .18, .15, 0), (sign * .18, .07, .11), 'calf_' + side)
    bone('toe_' + side, (sign * .18, .07, .11), (sign * .18, .05, .17), 'foot_' + side)
bone('backpack', (0, 1.15, -.11), (0, 1.30, -.11), 'spine_02')
bpy.ops.object.mode_set(mode='OBJECT')
arm.show_in_front = True

deform_bones = [b for b in arm_data.bones if b.name not in ('root_motionless', 'backpack')]

def distance(p, a, b):
    delta = b - a
    t = max(0.0, min(1.0, (p - a).dot(delta) / delta.length_squared))
    return (p - (a + t * delta)).length

weight_stats = {'vertices': 0, 'softVertices': 0, 'maxInfluences': 0, 'maxSumError': 0}
for o in meshes:
    groups = {b.name: o.vertex_groups.new(name=b.name) for b in arm_data.bones}
    for v in o.data.vertices:
        candidates = sorted([(distance(v.co, b.head_local, b.tail_local), b.name) for b in deform_bones])[:4]
        raw = [(name, 1.0 / (d * d + .035 ** 2) ** 2) for d, name in candidates]
        total = sum(w for _, w in raw)
        weights = [(name, w / total) for name, w in raw]
        for name, w in weights:
            groups[name].add([v.index], w, 'REPLACE')
        weight_stats['vertices'] += 1
        weight_stats['softVertices'] += sum(w > 1e-4 for _, w in weights) > 1
        weight_stats['maxInfluences'] = max(weight_stats['maxInfluences'], len(weights))
        weight_stats['maxSumError'] = max(weight_stats['maxSumError'], abs(sum(w for _, w in weights) - 1))
    modifier = o.modifiers.new('Automatic_Geometric_Skin', 'ARMATURE')
    modifier.object = arm
    modifier.use_deform_preserve_volume = False  # glTF linear blend skinning parity
    o.parent = arm

scene = bpy.context.scene
scene.render.fps = 30
poses = [{'name': 'rest', 'frame': 0, 'rotations': []}]
for side, sign in [('l', 1), ('r', -1)]:
    poses.extend([
        {'name': 'shoulder_' + side, 'frame': len(poses) * 15, 'rotations': [('upperarm_' + side, 'X', sign * 90)]},
        {'name': 'elbow_' + side, 'frame': (len(poses) + 1) * 15, 'rotations': [('forearm_' + side, 'X', 120)]},
        {'name': 'hip_' + side, 'frame': (len(poses) + 2) * 15, 'rotations': [('thigh_' + side, 'X', -90)]},
        {'name': 'knee_' + side, 'frame': (len(poses) + 3) * 15, 'rotations': [('calf_' + side, 'X', 120)]},
    ])
poses.append({'name': 'combined_squat', 'frame': 135, 'rotations': [
    ('thigh_l', 'X', -70), ('thigh_r', 'X', -70), ('calf_l', 'X', 110), ('calf_r', 'X', 110),
    ('spine_01', 'X', 20), ('forearm_l', 'X', 80), ('forearm_r', 'X', 80)]})
poses.append({'name': 'rest_return', 'frame': 150, 'rotations': []})
scene.frame_start, scene.frame_end = 0, 150

rest_vertices = {}
for pose in poses:
    scene.frame_set(pose['frame'])
    for pb in arm.pose.bones:
        pb.rotation_mode = 'XYZ'
        pb.rotation_euler = (0, 0, 0)
        pb.location = (0, 0, 0)
        pb.scale = (1, 1, 1)
    for name, axis, degrees in pose['rotations']:
        arm.pose.bones[name].rotation_euler['XYZ'.index(axis)] = math.radians(degrees)
    for pb in arm.pose.bones:
        pb.keyframe_insert('rotation_euler', frame=pose['frame'], group=pb.name)
    bpy.context.view_layer.update()
    depsgraph = bpy.context.evaluated_depsgraph_get()
    metrics = []
    for o in meshes:
        evaluated = o.evaluated_get(depsgraph)
        points = [evaluated.matrix_world @ v.co for v in evaluated.data.vertices]
        if pose['name'] == 'rest':
            rest_vertices[o.name] = [p.copy() for p in points]
        displacements = [(p - r).length for p, r in zip(points, rest_vertices[o.name])]
        metrics.append({'part': o.name, 'maxDisplacementM': max(displacements),
                        'movedVertices': sum(d > 1e-4 for d in displacements)})
    pose['parts'] = metrics
    pose['maxDisplacementM'] = max(p['maxDisplacementM'] for p in metrics)
    pose['movedVertices'] = sum(p['movedVertices'] for p in metrics)
    pose['referenceSpace'] = 'bone local XYZ Euler in Blender rest bone basis; degrees'

arm.animation_data.action.name = 'rig_diagnostic'
for fc in arm.animation_data.action.fcurves:
    for key in fc.keyframe_points:
        key.interpolation = 'LINEAR'
scene.frame_set(0)
bpy.ops.object.select_all(action='DESELECT')
arm.select_set(True)
for o in meshes:
    o.select_set(True)
bpy.context.view_layer.objects.active = arm
for image in bpy.data.images:
    if image.source == 'FILE' and image.has_data:
        image.pack()
bpy.context.preferences.filepaths.save_version = 0
bpy.ops.wm.save_as_mainfile(filepath=str(EDIT / 'runner-derived.blend'))
export_options = dict(filepath=str(OUT / 'runner-rig-spike.glb'), export_format='GLB',
    use_selection=True, export_yup=True, export_animations=True, export_animation_mode='ACTIVE_ACTIONS',
    export_force_sampling=True, export_frame_range=True, export_frame_step=1,
    export_skins=True, export_all_influences=False, export_def_bones=False,
    export_nla_strips_merged_animation_name='rig_diagnostic')
bpy.ops.export_scene.gltf(**export_options)
record = {
    'status': 'automatic probe only; not production approval', 'derivedReconstruction': True,
    'source': str(SOURCE), 'sourceSha256': hashlib.sha256(SOURCE.read_bytes()).hexdigest(),
    'blenderVersion': bpy.app.version_string, 'blenderBuildHash': bpy.app.build_hash.decode(),
    'sourceHeightDcc': height, 'probeHeightM': 1.8, 'scale': scale,
    'sourceGltfAxes': 'Y-up +Z-forward candidate checked with front/side engine preview',
    'dccAxes': 'Z-up -Y-forward; glTF importer/exporter handles basis conversion',
    'normalizationDcc': [list(r) for r in normalization], 'normalizationAppliedCount': 1,
    'normalizationStage': 'mesh data in world DCC space, before armature/IBM',
    'triangleCount': sum(len(o.data.loop_triangles) for o in meshes),
    'materials': len(set(m.name for o in meshes for m in o.data.materials if m)),
    'textures': [{'name': i.name, 'size': list(i.size)} for i in bpy.data.images if i.has_data],
    'weightMethod': 'deterministic nearest-four rest bone-segment inverse squared distance-squared weights; softening .035m; no heat solver, manual painting or topology edits',
    'weightStats': weight_stats, 'bones': specs, 'parts': parts, 'poses': poses,
    'rootPolicy': 'fixed translation/rotation/scale; no keyed root movement',
    'exportOptions': export_options, 'license': 'not verified; technical probe only',
}
(OUT / 'dcc-report.json').write_text(json.dumps(record, indent=2) + '\n', encoding='utf-8')
print('PAO15_DCC_COMPLETE ' + json.dumps(weight_stats))
