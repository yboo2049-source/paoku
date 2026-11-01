# PAO-16 技术标定 Spike TODO

此批只诊断，不是正式资产或PAO-17放行。source→asset→logic→world矩阵见诊断JSON；完整源节点TRS保留，未知端点不由AABB补齐。

## train_ramp_or_car.glb — POINTS_REQUIRE_REVIEW

- [ ] Long axis X confirmed; semantic front/back is unresolved by the automatic geometry detector; the rendered cab needs an explicit signed source marker. Both ±90deg remain candidates; displayed -90deg is arbitrary, not forward approval.
- [ ] Wheel/rail contact line and certified traversable roof boundary remain null; ray hits include roof attachments.

## train_metro.glb — NEEDS_DERIVED_REPAIR

- [ ] Exact ramp foot/top and roof seam semantic boundary remain null: rounded transition; measured interior patches cannot certify endpoints.
- [ ] Sampled incline interior lies above source ground; exact foot/undercarriage relationship remains unverified; no physics change.
- [ ] Obtain editable author source before any repair; this probe performs none.

## obstacle_hurdle_barrier.glb — NEEDS_DERIVED_REPAIR

- [ ] Low hurdle contains multiple horizontal bars; effective blocking shape differs from solid logic envelope.
- [ ] Foot/rod primitive grouping and usable low-obstacle outline require review; do not shrink logic or jump height.

## obstacle_slide_barrier.glb — NEEDS_DERIVED_REPAIR

- [ ] Center underside measured but full width/depth clearance needs continuous aperture analysis; side posts must not become new gameplay obstacles.
- [ ] Yaw +90deg maps source Z span to game X; face/sign not semantically approved.

- [ ] 原作者源/许可确认；批准后另做派生比例/几何修整、重拓扑/烘焙/LOD/贴图分档。
- [ ] 具体美术与真机预算未签收，不因技术预览通过而冻结。
- [ ] 本批未接游戏；后续接入仍须审查生产元数据、唯一组合根、回退与真实脚底连续性。
