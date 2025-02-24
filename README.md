# Movement Analysis System

> Real-time movement analysis using AI-powered motion tracking with clinical metrics and 3D visualization.

## Overview
This system provides real-time analysis of human movement using computer vision, offering precise measurements across different anatomical planes with clinical context.

## Key Features

### 1. Movement Tracking
- **Sagittal Plane (Side View)**
  - Trunk flexion/extension (0-15° normal range)
  - Neck flexion (0-15° normal range)
  - Hip and knee movement patterns

- **Frontal Plane (Front View)**
  - Lateral trunk lean (0-5° normal range)
  - Shoulder symmetry
  - Pelvic alignment

- **Functional Measurements**
  - Bilateral knee flexion (0-140° range)
  - Bilateral hip flexion (0-125° range)
  - Movement symmetry analysis

### 2. Real-time Analysis
- Instant angle calculations
- Live symmetry assessment
- Dynamic range of motion tracking
- Movement quality metrics

### 3. 3D Visualization
- Real-time skeletal tracking
- Multi-plane movement representation
- Interactive viewing angles

## Technical Details

### Motion Capture
- MediaPipe Pose detection
- 33 body landmarks tracked
- 30 FPS real-time processing
- Sub-millimeter precision

### Analysis Metrics
- Clinical reference ranges
- Bilateral comparison
- Postural alignment
- Movement symmetry

## Getting Started

1. **Setup**
   ```bash
   git clone [repository-url]
   cd movement-analysis
   ```

2. **Usage**
   - Open index.html in a modern browser
   - Allow camera access
   - Stand 6-8 feet from camera
   - Ensure full body is visible

3. **Viewing Metrics**
   - Joint angles shown with normal ranges
   - Color-coded quality indicators
   - Real-time movement feedback
   - Symmetry analysis

## Privacy & Technical Notes
- All processing done locally in-browser
- No data storage or transmission
- Uses WebGL for 3D visualization
- Requires modern browser with WebGL support

## Future Development
- [ ] Movement pattern recognition
- [ ] Temporal analysis features
- [ ] Advanced clinical metrics
- [ ] Movement quality scoring

## License
MIT License - See LICENSE file for details

---

<p align="center">
Developed for advancing movement disorder understanding and analysis
</p> 